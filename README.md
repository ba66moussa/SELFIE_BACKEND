# Remote Selfie - Consent + OZ/BLS Liveness (Starter Kit)

> Starter kit: backend (Node/Express), client page (SDK OZ/BLS), agent link generator.

## Folders
- `server/` : API (consent, session proxy, webhook)
- `client/` : public page for customer (loads OZ/BLS SDK)
- `agent/`  : small tool for agent to generate the magic link

## Quick start (local)
```bash
cd server
cp .env.example .env
npm install
npm start
```
API runs on `http://localhost:8080`.

Serve `client/index.html` with a static server (or open with Live Server).

## Endpoints
- `POST /api/consent` { userId, appointmentRef, consentText, consentVersion, userAgent }
- `POST /api/session` { userId, appointmentRef } → { sessionToken, guid } (MOCK if no OZ_SESSION_ENDPOINT)
- `POST /api/callback/oz` (webhook) with optional HMAC verification

## OZ/BLS integration
Replace `OZ_SESSION_ENDPOINT` (and token/key) with your tenant values.
Adjust the JS init call in `client/index.html` according to your SDK version.

## Deploy
- Backend: Render (use `render.yaml`) or any Node host
- Frontend: Netlify/Vercel/GitHub Pages (just deploy `client/`)

## Security
- Consent proof stored (IP, UA, time)
- CORS allow-list via `ALLOWED_ORIGINS`
- Webhook HMAC (`OZ_WEBHOOK_SECRET`)

## Disclaimer
This is a starter kit. Validate with your legal/technical team and the BLS/OZ tenant documentation.
