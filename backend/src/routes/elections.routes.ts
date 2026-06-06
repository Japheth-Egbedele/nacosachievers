import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireVerifiedMember } from '../middleware/require-verified-member.js';
import {
  electionReadRateLimiter,
  voteRateLimiter,
} from '../middleware/rate-limiter.js';
import {
  castVoteSchema,
  electionListQuerySchema,
} from '../schemas/election.schema.js';
import * as electionsController from '../controllers/elections.controller.js';

const router = Router();

router.get('/:id/public-results', electionReadRateLimiter, catchAsync(electionsController.publicResults));

router.use(authMiddleware, requireVerifiedMember);

router.get('/dashboard', electionReadRateLimiter, catchAsync(electionsController.dashboard));
router.get(
  '/',
  electionReadRateLimiter,
  validate(electionListQuerySchema, 'query'),
  catchAsync(electionsController.listElections),
);
router.get('/:id', electionReadRateLimiter, catchAsync(electionsController.getElection));
router.post(
  '/:id/vote',
  voteRateLimiter,
  validate(castVoteSchema),
  catchAsync(electionsController.castVote),
);

export default router;
