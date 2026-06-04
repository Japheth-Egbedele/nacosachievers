import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import * as electionService from '../services/election.service.js';

export async function dashboard(req: Request, res: Response): Promise<void> {
  const data = await electionService.getDashboard(req.user!.id);
  sendSuccess(res, data);
}

export async function listElections(req: Request, res: Response): Promise<void> {
  const status = req.query.status as 'active' | 'upcoming' | 'completed' | undefined;
  const data = await electionService.listElectionsForUser(req.user!.id, status);
  sendSuccess(res, { elections: data });
}

export async function getElection(req: Request, res: Response): Promise<void> {
  const data = await electionService.getElectionDetail(req.params.id!, req.user!.id);
  sendSuccess(res, data);
}

export async function castVote(req: Request, res: Response): Promise<void> {
  const { candidate_ids } = req.body as { candidate_ids: string[] };
  const data = await electionService.castVote(req.params.id!, req.user!.id, candidate_ids);
  sendSuccess(res, data, 200, 'Ballot submitted and locked');
}
