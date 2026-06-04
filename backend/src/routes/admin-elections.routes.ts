import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireExecutive } from '../middleware/role-guard.js';
import {
  createCandidateSchema,
  createElectionSchema,
  electionListQuerySchema,
  updateCandidateSchema,
  updateElectionSchema,
} from '../schemas/election.schema.js';
import * as adminElectionsController from '../controllers/admin-elections.controller.js';

const router = Router();

router.use(authMiddleware, requireExecutive);

router.get('/stats', catchAsync(adminElectionsController.stats));
router.get(
  '/',
  validate(electionListQuerySchema, 'query'),
  catchAsync(adminElectionsController.listElections),
);
router.post('/', validate(createElectionSchema), catchAsync(adminElectionsController.createElection));
router.get('/:id/results', catchAsync(adminElectionsController.results));
router.patch('/:id', validate(updateElectionSchema), catchAsync(adminElectionsController.updateElection));
router.delete('/:id', catchAsync(adminElectionsController.deleteElection));
router.post(
  '/:id/candidates',
  validate(createCandidateSchema),
  catchAsync(adminElectionsController.createCandidate),
);
router.patch(
  '/candidates/:candidateId',
  validate(updateCandidateSchema),
  catchAsync(adminElectionsController.updateCandidate),
);
router.delete('/candidates/:candidateId', catchAsync(adminElectionsController.deleteCandidate));

export default router;
