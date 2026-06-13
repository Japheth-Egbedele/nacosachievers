import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';
import * as electionService from '../services/election.service.js';

export async function listElections(req: Request, res: Response): Promise<void> {
  const status = req.query.status as 'active' | 'upcoming' | 'completed' | undefined;
  const data = await electionService.listAllElectionsAdmin(status);
  sendSuccess(res, { elections: data });
}

export async function getElection(req: Request, res: Response): Promise<void> {
  const data = await electionService.getAdminElectionSetup(req.params.id!);
  sendSuccess(res, data);
}

export async function createElection(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title: string;
    description?: string;
    kind?: 'executive' | 'custom';
    scope?: 'chapter' | 'department';
    department_id?: string;
    require_all_positions?: boolean;
    start_date: string;
    end_date: string;
  };
  const data = await electionService.createElection(req.user!.id, body);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function updateElection(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    require_all_positions?: boolean;
  };
  const data = await electionService.updateElection(req.params.id!, body);
  sendSuccess(res, data);
}

export async function deleteElection(req: Request, res: Response): Promise<void> {
  await electionService.deleteElection(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK);
}

export async function createPosition(req: Request, res: Response): Promise<void> {
  const body = req.body as { title: string; sort_order?: number };
  const data = await electionService.createPosition(req.params.id!, body);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function updatePosition(req: Request, res: Response): Promise<void> {
  const body = req.body as { title?: string; sort_order?: number };
  const data = await electionService.updatePosition(req.params.positionId!, body);
  sendSuccess(res, data);
}

export async function deletePosition(req: Request, res: Response): Promise<void> {
  await electionService.deletePosition(req.params.positionId!);
  sendSuccess(res, null, HTTP_STATUS.OK);
}

export async function createCandidate(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    position_id: string;
    name: string;
    manifesto?: string;
    image_url?: string;
  };
  const data = await electionService.createCandidate(req.params.id!, body);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export async function updateCandidate(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    name?: string;
    manifesto?: string;
    image_url?: string;
  };
  const data = await electionService.updateCandidate(req.params.candidateId!, body);
  sendSuccess(res, data);
}

export async function deleteCandidate(req: Request, res: Response): Promise<void> {
  await electionService.deleteCandidate(req.params.candidateId!);
  sendSuccess(res, null, HTTP_STATUS.OK);
}

export async function stats(_req: Request, res: Response): Promise<void> {
  const data = await electionService.getAdminStats();
  sendSuccess(res, data);
}

export async function results(req: Request, res: Response): Promise<void> {
  const acknowledge = req.query.acknowledge_live_results === 'true';
  const data = await electionService.getElectionResults(req.params.id!, {
    allowLive: acknowledge,
  });
  sendSuccess(res, data);
}
