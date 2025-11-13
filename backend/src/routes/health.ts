import { Router } from 'express';

export const health = Router();

health.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    now: new Date().toISOString(),
  });
});
