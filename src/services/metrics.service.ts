import { CustomError } from "../errors/customError.error";

const CF_GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

/** Navegadores que corresponden a una persona real frente a un pantalla. */
const HUMAN_BROWSERS = new Set([
  "Chrome", "MobileSafari", "Safari", "Firefox", "ChromeMobile", "Edge",
  "SamsungInternet", "ChromeiOS", "MobileFirefox", "Opera", "OperaMobile", "EdgeMobile",
]);

/** Rutas que solo pide quien busca una vulnerabilidad, no un visitante. */
const SCAN_PATTERNS = [/wp-admin/i, /wp-login/i, /wp-includes/i, /wlwmanifest/i, /\.php$/i, /cgi-bin/i, /\.env$/i, /phpmyadmin/i];

export interface SiteTraffic {
  site: string;
  zoneId: string;
  days: number;
  firstDay: string | null;
  lastDay: string | null;
  uniques: number;
  pageViews: number;
  requests: number;
  threatsBlocked: number;
  humanPageViews: number;
  botPageViews: number;
  humanShare: number;
  estimatedHumanUniques: number;
  peak: { date: string; uniques: number } | null;
  countries: Array<{ code: string; requests: number }>;
  browsers: Array<{ name: string; pageViews: number; human: boolean }>;
  statuses: Array<{ status: number; requests: number }>;
  daily: Array<{ day: string; uniques: number; pageViews: number }>;
  scanning: Array<{ path: string; count: number }>;
  warnings: string[];
}

function zones(): Array<{ site: string; zoneId: string }> {
  const raw = process.env.CLOUDFLARE_ZONES || "";
  return raw
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [site, zoneId] = pair.split(":");
      return { site: site?.trim(), zoneId: zoneId?.trim() };
    })
    .filter((z) => z.site && z.zoneId);
}

async function cf(query: string, variables: Record<string, unknown>) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new CustomError("CLOUDFLARE_API_TOKEN no está configurado", 503);

  const response = await fetch(CF_GRAPHQL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const data = (await response.json()) as { data?: any; errors?: Array<{ message: string }> };
  if (data.errors?.length) throw new CustomError(`Cloudflare: ${data.errors[0].message}`, 502);
  return data.data;
}

const DAILY_QUERY = `query($zone:String!,$since:Date!,$until:Date!){
  viewer{ zones(filter:{zoneTag:$zone}){
    httpRequests1dGroups(limit:90, filter:{date_geq:$since, date_leq:$until}, orderBy:[date_ASC]){
      dimensions{date}
      sum{ requests pageViews threats
           countryMap{clientCountryName requests}
           browserMap{uaBrowserFamily pageViews}
           responseStatusMap{edgeResponseStatus requests} }
      uniq{ uniques }
    }
  }}}`;

const PATHS_QUERY = `query($zone:String!,$since:Time!,$until:Time!){
  viewer{ zones(filter:{zoneTag:$zone}){
    httpRequestsAdaptiveGroups(limit:30, filter:{datetime_geq:$since, datetime_leq:$until}, orderBy:[count_DESC]){
      count dimensions{ clientRequestPath }
    }
  }}}`;

async function traffic(site: string, zoneId: string, days: number): Promise<SiteTraffic> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const until = new Date().toISOString().slice(0, 10);

  const data = await cf(DAILY_QUERY, { zone: zoneId, since, until });
  const rows = data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];

  const countries: Record<string, number> = {};
  const browsers: Record<string, number> = {};
  const statuses: Record<number, number> = {};
  let uniques = 0, pageViews = 0, requests = 0, threatsBlocked = 0;

  for (const row of rows) {
    uniques += row.uniq.uniques;
    pageViews += row.sum.pageViews || 0;
    requests += row.sum.requests || 0;
    threatsBlocked += row.sum.threats || 0;
    (row.sum.countryMap || []).forEach((c: any) => { countries[c.clientCountryName] = (countries[c.clientCountryName] || 0) + c.requests; });
    (row.sum.browserMap || []).forEach((b: any) => { browsers[b.uaBrowserFamily] = (browsers[b.uaBrowserFamily] || 0) + b.pageViews; });
    (row.sum.responseStatusMap || []).forEach((s: any) => { statuses[s.edgeResponseStatus] = (statuses[s.edgeResponseStatus] || 0) + s.requests; });
  }

  let humanPageViews = 0, botPageViews = 0;
  for (const [name, views] of Object.entries(browsers)) {
    if (HUMAN_BROWSERS.has(name)) humanPageViews += views;
    else botPageViews += views;
  }

  const total = humanPageViews + botPageViews;
  const humanShare = total ? humanPageViews / total : 0;

  // Rutas de escaneo: la ventana adaptativa del plan Free es de 1 día como máximo.
  let scanning: Array<{ path: string; count: number }> = [];
  try {
    const paths = await cf(PATHS_QUERY, {
      zone: zoneId,
      since: new Date(Date.now() - 86400000 + 60000).toISOString(),
      until: new Date().toISOString(),
    });
    scanning = (paths?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [])
      .filter((r: any) => SCAN_PATTERNS.some((p) => p.test(r.dimensions.clientRequestPath)))
      .map((r: any) => ({ path: r.dimensions.clientRequestPath, count: r.count }));
  } catch {
    scanning = [];
  }

  const warnings: string[] = [];
  if (rows.length < days * 0.5) {
    warnings.push(`Cloudflare solo tiene ${rows.length} día(s) de historial para este sitio: la zona se dio de alta el ${rows[0]?.dimensions?.date || "—"}. El tráfico anterior a esa fecha no está aquí.`);
  }
  if (humanShare < 0.6 && total > 0) {
    warnings.push(`${Math.round((1 - humanShare) * 100)}% de las páginas vistas provienen de clientes automatizados (bots, crawlers y escáneres). La cifra de visitantes en bruto sobreestima la audiencia real.`);
  }
  if (scanning.length) {
    warnings.push(`Se detectaron ${scanning.length} rutas de escaneo de vulnerabilidades en las últimas 24 h. El sitio no es PHP ni WordPress, así que las sondas fallan, pero inflan las métricas.`);
  }
  if (statuses[429]) {
    warnings.push(`${statuses[429].toLocaleString()} respuestas HTTP 429 (límite de peticiones) en el periodo: hay clientes saturando el sitio.`);
  }

  const peakRow = [...rows].sort((a: any, b: any) => b.uniq.uniques - a.uniq.uniques)[0];

  return {
    site,
    zoneId,
    days: rows.length,
    firstDay: rows[0]?.dimensions?.date || null,
    lastDay: rows[rows.length - 1]?.dimensions?.date || null,
    uniques,
    pageViews,
    requests,
    threatsBlocked,
    humanPageViews,
    botPageViews,
    humanShare: Number(humanShare.toFixed(3)),
    estimatedHumanUniques: Math.round(uniques * humanShare),
    peak: peakRow ? { date: peakRow.dimensions.date, uniques: peakRow.uniq.uniques } : null,
    countries: Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([code, r]) => ({ code, requests: r })),
    browsers: Object.entries(browsers).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, v]) => ({ name, pageViews: v, human: HUMAN_BROWSERS.has(name) })),
    statuses: Object.entries(statuses).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([s, r]) => ({ status: Number(s), requests: r })),
    daily: rows.map((r: any) => ({ day: r.dimensions.date, uniques: r.uniq.uniques, pageViews: r.sum.pageViews || 0 })),
    scanning,
    warnings,
  };
}

let cache: { at: number; days: number; data: SiteTraffic[] } | null = null;
const TTL = 10 * 60 * 1000;

export async function trafficReport(days = 30) {
  if (cache && cache.days === days && Date.now() - cache.at < TTL) {
    return { cached: true, generatedAt: new Date(cache.at), sites: cache.data };
  }

  const list = zones();
  if (!list.length) throw new CustomError("No hay zonas configuradas en CLOUDFLARE_ZONES", 503);

  const sites = await Promise.all(list.map((z) => traffic(z.site, z.zoneId, days)));
  cache = { at: Date.now(), days, data: sites };

  return { cached: false, generatedAt: new Date(), sites };
}
