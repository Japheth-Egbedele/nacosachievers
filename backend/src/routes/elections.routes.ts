import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireVerifiedMember } from '../middleware/require-verified-member.js';
import { voteRateLimiter } from '../middleware/rate-limiter.js';
import {
  castVoteSchema,
  electionListQuerySchema,
} from '../schemas/election.schema.js';
import * as electionsController from '../controllers/elections.controller.js';

const router = Router();

router.use(authMiddleware, requireVerifiedMember);

router.get('/dashboard', catchAsync(electionsController.dashboard));
router.get(
  '/',
  validate(electionListQuerySchema, 'query'),
  catchAsync(electionsController.listElections),
);
router.get('/:id', catchAsync(electionsController.getElection));
router.post(
  '/:id/vote',
  voteRateLimiter,
  validate(castVoteSchema),
  catchAsync(electionsController.castVote),
);

export default router;
