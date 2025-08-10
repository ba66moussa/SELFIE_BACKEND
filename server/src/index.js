import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import selfieRoutes from './routes/selfie.js';
import { notFound, errorHandler } from './utils/errors.js';
import { getLogger } from './utils/logger.js';
import { allowedOrigins } from './utils/origins.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const log = getLogger();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// CORS
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow curl / server-to-server
    if (allowedOrigins().includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed by CORS: ' + origin));
  },
  credentials: false,
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','X-Webhook-Signature']
}));

app.use(morgan('combined'));

// Serve the static client page(s)
app.use('/selfie', express.static(path.join(__dirname, '../../web/public')));

// API routes
app.use('/api/selfie', selfieRoutes);

// Health
app.get('/healthz', (_, res) => res.json({ ok: true }));

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log.info({ port: PORT }, 'Selfie proxy server listening');
});
