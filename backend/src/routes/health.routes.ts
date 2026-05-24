import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { pingDatabase } from '../config/supabase.js';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.get(
  '/',
  catchAsync(async (_req, res) => {
    const dbOk = await pingDatabase();
    sendSuccess(res, { status: 'ok', database: dbOk ? 'connected' : 'degraded' }, HTTP_STATUS.OK);
  }),
);

export default router;
