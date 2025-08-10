
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const Joi = require('joi');

const app = express();

// --- Security, parsing, logs
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

// --- CORS
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true); // allow curl/postman
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));

// --- Rate limit
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});
app.use(limiter);

// --- Simple JSON persistence
const DB_DIR = path.join(__dirname, 'db');
const CONSENTS = path.join(DB_DIR, 'consents.json');
const SESSIONS = path.join(DB_DIR, 'sessions.json');
const RESULTS  = path.join(DB_DIR, 'results.json');

for (const f of [CONSENTS, SESSIONS, RESULTS]) {
  if (!fs.existsSync(f)) fs.writeFileSync(f, '[]', 'utf-8');
}
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf-8'));
const writeJson = (f, data) => fs.writeFileSync(f, JSON.stringify(data, null, 2));

// --- Schemas
const consentSchema = Joi.object({
  userId: Joi.string().min(1).required(),
  appointmentRef: Joi.string().min(1).required(),
  consentText: Joi.string().min(10).required(),
  consentVersion: Joi.string().min(1).required(),
  userAgent: Joi.string().allow('')
});

const sessionSchema = Joi.object({
  userId: Joi.string().min(1).required(),
  appointmentRef: Joi.string().min(1).required()
});

// --- Utils
const uuid = () => crypto.randomUUID();

// --- Routes
app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/consent', (req, res) => {
  const { error, value } = consentSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '';
  const entry = { id: uuid(), ...value, ip, at: new Date().toISOString() };
  const items = readJson(CONSENTS);
  items.push(entry);
  writeJson(CONSENTS, items);
  res.json({ ok: true, id: entry.id });
});

app.post('/api/session', async (req, res) => {
  const { error, value } = sessionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { userId, appointmentRef } = value;
  const sessionId = uuid();

  // If OZ_SESSION_ENDPOINT is configured, call tenant API; otherwise return MOCK
  const endpoint = process.env.OZ_SESSION_ENDPOINT;
  try {
    if (endpoint) {
      // NOTE: This part depends on your tenant's exact API spec.
      // Replace payload/headers/fields with the real contract.
      const headers = {};
      if (process.env.OZ_API_TOKEN) headers['Authorization'] = `Bearer ${process.env.OZ_API_TOKEN}`;
      if (process.env.OZ_API_KEY)   headers['X-API-Key']     = process.env.OZ_API_KEY;

      const payload = {
        userId,
        appointmentRef,
        callbackUrl: process.env.OZ_CALLBACK_URL
      };
      const r = await axios.post(endpoint, payload, { headers, timeout: 15000 });
      // Suppose response contains: { sessionToken, guid }
      const sessionToken = r.data.sessionToken || r.data.token || r.data.session || uuid();
      const guid         = r.data.guid         || r.data.id    || uuid();

      // save session
      const sessions = readJson(SESSIONS);
      sessions.push({ id: sessionId, userId, appointmentRef, createdAt: new Date().toISOString(), sessionToken, guid });
      writeJson(SESSIONS, sessions);

      return res.json({ sessionId, sessionToken, guid, mode: 'LIVE' });
    } else {
      // MOCK
      const sessionToken = 'MOCK_TOKEN_' + uuid();
      const guid         = 'MOCK_GUID_' + uuid();
      const sessions = readJson(SESSIONS);
      sessions.push({ id: sessionId, userId, appointmentRef, createdAt: new Date().toISOString(), sessionToken, guid, mock: true });
      writeJson(SESSIONS, sessions);
      return res.json({ sessionId, sessionToken, guid, mode: 'MOCK' });
    }
  } catch (e) {
    console.error('Session error:', e.response?.data || e.message);
    return res.status(500).json({ error: 'Failed to create liveness session', details: e.response?.data || e.message });
  }
});

// Webhook from OZ/BLS (configure the tenant to point to OZ_CALLBACK_URL)
app.post('/api/callback/oz', express.raw({ type: '*/*' }), (req, res) => {
  try {
    const signature = req.headers['x-oz-signature'] || req.headers['x-hub-signature'] || '';
    const secret = process.env.OZ_WEBHOOK_SECRET || '';
    if (secret) {
      const hmac = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
      if (!signature || signature !== hmac) {
        return res.status(401).send('Invalid signature');
      }
    }
    // Parse body after signature verification
    let body = {};
    try { body = JSON.parse(req.body.toString('utf-8')); } catch {}

    const rec = { id: uuid(), body, headers: req.headers, receivedAt: new Date().toISOString() };
    const items = readJson(RESULTS);
    items.push(rec);
    writeJson(RESULTS, items);

    return res.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(500).send('Error');
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Selfie backend listening on :' + port);
});
