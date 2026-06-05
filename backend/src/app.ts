import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { getCorsOrigins } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter, healthRoutes } from './routes/index.js';
import { HTTP_STATUS } from './constants/http.js';

/**
 * Creates and configures the Express application.
 * @returns Configured Express app
 */
export function createApp(): express.Application {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      customProps: (req, res) => ({
        userId: req.user?.id,
        statusCode: res.statusCode,
      }),
    }),
  );

  app.use(helmet());
  const allowedOrigins = getCorsOrigins();
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked for origin: ${origin}`));
        }
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use('/health', healthRoutes);
  app.use('/api/v1', apiRouter);

  app.use((_req, res) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: 'Route not found',
      code: 'NOT_FOUND',
    });
  });

  app.use(errorHandler);

  return app;
}
