import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import * as requestService from "../services/request.service";

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await requestService.listRequests(req.query as Record<string, string>, req.user!));
  } catch (error) {
    next(error);
  }
}

export async function detail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await requestService.getRequest(String(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await requestService.createRequest(req.body, req.user!));
  } catch (error) {
    next(error);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await requestService.updateRequest(String(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
}

export async function changeStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, note } = req.body;
    res.json(await requestService.changeStatus(String(req.params.id), status, note || "", req.user!));
  } catch (error) {
    next(error);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await requestService.deleteRequest(String(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function comment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await requestService.addComment(String(req.params.id), req.body.message, req.user!));
  } catch (error) {
    next(error);
  }
}
