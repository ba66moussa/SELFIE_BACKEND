import axios from 'axios';
import { getLogger } from '../utils/logger.js';

const log = getLogger();

const BLS_PLUGIN_ENDPOINT = process.env.BLS_PLUGIN_ENDPOINT || ''; // e.g. https://your-bls-domain/plugin_liveness.php
const BLS_API_KEY = process.env.BLS_API_KEY || '';                 // fourni par BLS
const BLS_PARTNER_CODE = process.env.BLS_PARTNER_CODE || '';       // si nécessaire

// Cette fonction doit appeler l'endpoint officiel (PHP ou autre) qui renvoie un token de session/ GUID pour OZ Liveness
// Comme les implémentations varient, on laisse une intégration générique et des TODOs à compléter.
export async function getOZSession({ sid, locale = 'en' }) {
  if (!BLS_PLUGIN_ENDPOINT) {
    throw new Error('BLS_PLUGIN_ENDPOINT manquant');
  }
  // Exemples de formes possibles selon votre plugin_liveness.php côté BLS:
  // 1) GET:  `${BLS_PLUGIN_ENDPOINT}?action=get_session&sid=${sid}&lang=${locale}`
  // 2) POST: `${BLS_PLUGIN_ENDPOINT}` body: { action: 'get_session', sid, lang, apiKey: BLS_API_KEY }
  // Adaptez au contrat réel de votre plugin PHP.
  try {
    const resp = await axios.post(
      BLS_PLUGIN_ENDPOINT,
      {
        action: 'get_session',
        sid,
        lang: locale,
        apiKey: BLS_API_KEY,
        partner: BLS_PARTNER_CODE || undefined
      },
      {
        timeout: 10_000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    // On s'attend à recevoir { sessionToken, GUID, expiresAt, ... }
    const data = resp.data || {};
    if (!data.sessionToken || !data.GUID) {
      log.error({ data }, 'Réponse inattendue du plugin BLS');
      throw new Error('Réponse invalide du plugin BLS');
    }
    return {
      sessionToken: data.sessionToken,
      GUID: data.GUID,
      expiresAt: data.expiresAt || null
    };
  } catch (err) {
    log.error({ err: err?.response?.data || err.message }, 'Erreur en récupérant le token OZ');
    throw err;
  }
}
