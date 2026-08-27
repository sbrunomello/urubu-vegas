import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { extras, telemetryMiddleware } from './routes/extras';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';

const app = new Hono();
const internal = new Hono();

internal.route('/menu', menu);
internal.route('/triggers', triggers);

// Best-effort observability must never become part of gameplay correctness.
app.use('/api/*', telemetryMiddleware);
app.route('/api', extras);
app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
