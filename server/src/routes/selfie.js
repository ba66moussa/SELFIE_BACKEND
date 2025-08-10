import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '../utils/logger.js';
import { getOZSession } from '../lib/blsClient.js';

const log = getLogger();
const router = Router();

// In-memory store for demo purposes. Replace with Redis/DB in production.
const sessions = new Map();

// Agent creates a link for the customer
// POST /api/selfie/request-link  { customerName, customerEmail, locale }
router.post('/request-link', async (req, res, next) => {
  try {
    const { customerName, customerEmail, locale = 'en' } = req.body || {};
    if (!customerEmail) {
      const err = new Error('customerEmail requis');
      err.status = 400;
      throw err;
    }
    const sid = uuidv4();
    sessions.set(sid, {
      sid,
      customerName,
      customerEmail,
      locale,
      status: 'created',
      createdAt: Date.now()
    });
    const publicBase = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
    const link = `${publicBase}/selfie/start.html?sid=${encodeURIComponent(sid)}`;
    res.json({ sid, link });
  } catch (e) {
    next(e);
  }
});

// Client page calls this to get an OZ session for the SID
// GET /api/selfie/session?sid=...
router.get('/session', async (req, res, next) => {
  try {
    const { sid } = req.query || {};
    const s = sessions.get(sid);
    if (!s) {
      const err = new Error('Session inconnue ou expirée');
      err.status = 404;
      throw err;
    }
    // Ask BLS/OZ endpoint for session token + GUID
    const oz = await getOZSession({
      sid,
      locale: s.locale
    });
    sessions.set(sid, { ...s, status: 'issued', oz });
    res.json({ sid, ...oz });
  } catch (e) {
    next(e);
  }
});

// Client posts result after completing liveness
// POST /api/selfie/result  { sid, status, payload }
router.post('/result', async (req, res, next) => {
  try {
    const { sid, status, payload } = req.body || {};
    const s = sessions.get(sid);
    if (!s) {
      const err = new Error('Session inconnue');
      err.status = 404;
      throw err;
    }
    sessions.set(sid, { ...s, status, result: payload, finishedAt: Date.now() });
    log.info({ sid, status }, 'Selfie terminé');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// (Optionnel) Webhook si BLS/OZ appelle votre serveur directement
// Vérifie une signature simple via X-Webhook-Signature (HMAC SHA256)
import crypto from 'crypto';
import express from 'express';
router.post('/webhook', express.json({ type: '*/*' }), (req, res) => {
  const secret = process.env.SELFIE_WEBHOOK_SECRET || '';
  const sig = req.get('X-Webhook-Signature') || '';
  const computed = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body || {}))
    .digest('hex');
  if (!secret || computed !== sig) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  // TODO: Mettez à jour vos sessions selon le contenu
  return res.json({ ok: true });
});

export default router;
