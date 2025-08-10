# BLS Selfie Proxy (OZ Liveness)

> Gabarit prêt à pousser sur GitHub pour permettre à un agent d'envoyer un lien unique au client afin qu'il valide son selfie avec consentement, via le SDK **officiel** BLS/OZ Forensics.

## Aperçu

- **/api/selfie/request-link** : l’agent crée un lien unique (SID) à partager au client (par mail/SMS).
- **/selfie/start.html** : page publique pour le client. Elle affiche le consentement et lance le **SDK BLS/OZ** uniquement si le client accepte.
- **/api/selfie/session** : la page cliente demande un **sessionToken/GUID** à votre serveur, qui lui-même appelle votre `plugin_liveness.php` (ou équivalent) côté BLS.
- **/api/selfie/result** : la page cliente renvoie le résultat local (succès/échec) afin que l’agent soit notifié. (Complétez selon votre besoin)
- **/api/selfie/webhook** (optionnel) : si BLS/OZ envoie un webhook serveur → serveur, vous pouvez le vérifier avec une signature HMAC.

⚠️ **Aucune donnée biométrique n’est stockée ici**. Le flux réel de liveness reste côté BLS/OZ. Ce serveur ne fait que :
1) créer un lien de session,
2) appeler l’endpoint **officiel** pour obtenir un token,
3) afficher une page de consentement et démarrer le SDK,
4) enregistrer l’état (succès/échec).

## Configuration

1. Copiez `.env.example` en `.env` et complétez les variables :
   - `BLS_PLUGIN_ENDPOINT` : URL complète de votre `plugin_liveness.php` (ou équivalent) fourni par BLS.
   - `BLS_API_KEY` et `BLS_PARTNER_CODE` si votre plugin l’exige.
   - `PUBLIC_URL` : domaine public de ce serveur (utile pour générer le lien client).
   - `ALLOWED_ORIGINS` : origines front autorisées (CORS).

2. Installez et lancez :
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. Créez un lien pour un client :
   ```bash
   curl -X POST http://localhost:3000/api/selfie/request-link \

     -H 'Content-Type: application/json' \

     -d '{ "customerEmail":"foo@example.com", "customerName":"Foo Bar", "locale":"fr" }'
   ```
   → la réponse contient un `link` de la forme `http://localhost:3000/selfie/start.html?sid=...`

4. Envoyez ce lien au client. Il verra une case de consentement, puis le SDK BLS/OZ se lancera.

## Déploiement GitHub

- Poussez ce répertoire sur GitHub (voir instructions ci‑dessous).
- Le workflow **.github/workflows/node.yml** lance les tests de build basiques.

## Sécurité & conformité

- **Toujours** utiliser les scripts du **SDK BLS/OZ officiels**.
- Afficher un **consentement explicite** avant tout traitement.
- Ne **jamais** contourner les API officielles BLS. Respect strict des CGU et des lois locales (RGPD, etc.).
- Remplacer le **store in‑memory** par une base (Redis/SQL) côté serveur en production.

## Pousser sur GitHub (méthode web)

1. Créez un dépôt vide sur GitHub (ex: `bls-selfie-proxy`).
2. Sur votre machine :
   ```bash
   cd bls-selfie-proxy
   git init
   git add .
   git commit -m "Initial commit: BLS selfie proxy"
   git branch -M main
   git remote add origin https://github.com/<votre-user>/<votre-repo>.git
   git push -u origin main
   ```

## Licence

MIT
