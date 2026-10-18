# ADR — Réduction de l’exposition des jetons dans QPM Web

- **Statut :** décision de conception proposée, migration non démarrée
- **Date :** 18 octobre 2026
- **Périmètre :** client Web React et flux OAuth Web; les clients mobiles/API existants doivent rester compatibles
- **Liens :** `docs/WEB-UI-SECURITY-AUDIT-2026-10-14.md`, lot `SEC-WEB-03` dans `docs/WEB-UI-REDESIGN-BACKLOG.md`

## Contexte et preuves du dépôt

Le navigateur stocke actuellement les deux jetons dans `localStorage` (`frontend/src/contexts/JWTAuthContext.tsx`, `frontend/src/utils/api.ts`). Le client API ajoute l’access token comme Bearer; la rotation envoie le refresh token dans le corps JSON à `POST /auth/refresh` et conserve la paire retournée. Ce contrat est également utilisé par les applications mobiles, il ne faut donc pas le remplacer globalement.

Le succès OAuth redirige aujourd’hui avec `token` et `refreshToken` en paramètres de requête (`api/src/main/java/com/grash/security/OAuth2AuthenticationSuccessHandler.java`). `frontend/src/content/pages/Oauth/OauthSuccess.tsx` lit ces valeurs et appelle `loginInternal`, sans retirer immédiatement les paramètres de l’historique. Les jetons placés dans l’URL peuvent être copiés dans l’historique, les journaux/proxys et les données de référence du navigateur. C’est un défaut de conception confirmé par le chemin de code; aucune preuve de fuite effective depuis une instance de production n’a été collectée.

Les hooks `frontend/src/hooks/useImport.ts`, `useExport.ts` et le composant des notifications passent l’access token au handshake STOMP. `JWTAuthContext` le transmet aussi au flux Zendesk. Une transition vers un access token uniquement en mémoire doit donc garder un point d’accès contrôlé à la valeur pour ces usages.

Le serveur expose `POST /auth/signin`, `/auth/signin-ldap` et `/auth/refresh` sous forme JSON dans `api/src/main/java/com/grash/controller/AuthController.java`; `/auth/logout` invalide les sessions côté serveur. Les réponses sont consommées par Web et Mobile. Le déploiement effectif des domaines, de CORS et des cookies n’a pas été vérifié dans cette revue.

## Décision

Procéder en deux changements séparés et rétrocompatibles, en donnant priorité à la suppression des jetons OAuth dans l’URL.

1. **OAuth Web :** remplacer la redirection avec JWT par un code d’échange aléatoire, à durée de vie courte, à usage unique et lié au flux OAuth. Le serveur conserve uniquement une empreinte du code; le client l’échange par un POST sur une route dédiée puis retire le code de l’URL avec `replaceState` avant toute autre navigation. Le code ne contient aucune donnée de profil et ne donne pas accès directement aux API. Ajouter validation d’état/anti-rejeu et empêcher l’émission du code vers une origine de redirection non autorisée. Ne pas changer le format JSON de connexion utilisé par les clients mobiles.
2. **Session Web à moyen terme :** évaluer un refresh token en cookie `Secure`, `HttpOnly`, `SameSite` et un access token de courte durée gardé en mémoire. Mettre en place cette session par des routes Web dédiées ou un BFF; préserver les routes JSON Bearer actuelles pour Mobile et intégrations. Avant réalisation, vérifier les domaines de production, le routage proxy et CORS, puis définir une protection CSRF (validation `Origin`/`Referer` et/ou jeton CSRF selon le déploiement), la rotation, la révocation, l’expiration et le comportement multi-onglet.

Le choix final recommandé est le **code d’échange à usage unique pour OAuth**, suivi d’une preuve de concept de session Web cookie/BFF. Le basculement complet vers cookie n’est pas autorisé par cet ADR seul : le déploiement et les flux de domaines/CSRF doivent d’abord être validés. L’API Bearer et les réponses de connexion existantes restent disponibles pendant la migration.

## Options considérées

| Option | Avantages | Coûts et risques | Décision |
|---|---|---|---|
| Garder `localStorage` et renforcer CSP seulement | Pas de changement backend; compatible avec STOMP et OAuth existants | Une XSS peut toujours lire et exfiltrer les deux jetons; `nginx.conf` autorise actuellement `script-src 'unsafe-inline'` | Rejetée comme solution finale; mitigation transitoire seulement |
| Refresh en cookie HttpOnly, access token mémoire | Le refresh token devient inaccessible au JavaScript; garde un Bearer utilisable par REST/STOMP | Routes et comportement cookies/CSRF/CORS à concevoir; gestion multi-onglet; le token OAuth dans l’URL reste à corriger | Retenue comme cible à étudier après validation de déploiement |
| BFF same-origin avec cookie de session | Le navigateur ne manipule aucun JWT; réduit l’exposition des secrets au frontend et simplifie STOMP si le serveur supporte la session | Plus grand changement d’architecture, proxy, websocket, exploitation et scalabilité | Cible préférable si l’infrastructure permet le same-origin; preuve de concept requise |
| Code OAuth opaque, bref et à usage unique | Corrige spécifiquement l’exposition de JWT par URL avec un contrat limité au Web | Petite évolution API et stockage/expiration du code; doit inclure état, destination autorisée et anti-rejeu | À réaliser en premier, avec tests d’intégration |

## Conséquences et exigences de sécurité

- L’access token en mémoire reste accessible à du JavaScript exécuté dans l’origine; CSP stricte, assainissement et contrôle des dépendances restent nécessaires. HttpOnly réduit l’exfiltration du refresh token, sans empêcher une XSS d’agir dans la session active.
- Une cookie d’authentification est automatiquement jointe aux requêtes compatibles : la protection CSRF doit être conçue et testée avant activation. `SameSite` seul ne doit pas être présumé suffisant sans connaître les domaines et les parcours réels.
- Le endpoint OAuth d’échange doit rejeter les codes expirés, déjà utilisés, mal liés à la session/état ou destinés à une autre origine; les journaux doivent exclure codes et jetons. Ajouter des tests qui prouvent qu’un second échange échoue.
- STOMP/WebSocket et Zendesk doivent recevoir uniquement l’access token courant et court-vécu, jamais le refresh token. Vérifier les reconnexions après rotation et déconnexion.
- L’API Bearer, le refresh par JSON et les applications mobiles restent compatibles jusqu’à une décision de dépréciation indépendante.
- Les réponses d’erreur OAuth ne doivent pas exposer de détails internes dans `error` de la query string; examiner séparément ce chemin lors de l’implémentation.

## Plan de migration et critères de validation

1. Documenter les origines Web/API/mobile et le comportement de proxy/CORS/TLS du déploiement réel; relever les consommateurs OAuth.
2. Implémenter et tester le code d’échange OAuth sans toucher aux réponses `signin`/`refresh` des clients existants.
3. Ajouter tests d’expiration, rejeu, mauvais état, redirection non autorisée, absence de jeton dans l’URL après échange et absence de secret dans les logs.
4. Construire une preuve de concept cookie/BFF avec REST, import/export STOMP, notifications, Zendesk, logout, renouvellement, plusieurs onglets et CSRF.
5. Tester la matrice Web/Mobile/API, navigation OAuth, session expirée, navigateur privé, proxy TLS, sous-domaines, rôles et déconnexion réseau avant migration progressive.
6. Ne supprimer le support de l’ancien stockage qu’après période de compatibilité, métriques et plan de retour arrière documentés.

**Non inclus :** changement de code d’authentification, migration de base, changement de contrat d’API, de permission ou de déploiement. Ils nécessitent un lot d’implémentation dédié.
