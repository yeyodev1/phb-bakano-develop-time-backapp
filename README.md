# PHB Develop Time — API

Backend del panel de solicitudes, horas y métricas del equipo de tecnología.
**PowerHouse Biotech × Bakano**

- Producción: https://api-desarrollo.powerhousebiotech.com
- Panel: https://desarrollo.powerhousebiotech.com

## Stack

Express 5 · TypeScript · Mongoose 8 · JWT · Resend · Cloudflare GraphQL Analytics

## Desarrollo

```bash
pnpm install
cp .env.example .env   # completar credenciales
pnpm seed              # usuarios base (escribe en Mongo real)
pnpm dev               # http://localhost:8110
pnpm typecheck         # verificación estándar
```

## Despliegue

Automático: cada push a `main` despliega a producción en Vercel.
Detalle completo del entorno y DNS en `../DEPLOY.md`.

## Variables de entorno

Ver `.env.example`. Las de producción viven en Vercel, no en el repositorio.
