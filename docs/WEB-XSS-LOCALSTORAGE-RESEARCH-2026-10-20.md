# QPM Web — options pour supprimer les JWT de localStorage

**Date :** 20 octobre 2026  
**Statut :** recherche et recommandation; aucun changement d’authentification n’est appliqué ici.

## Recommandation

La cible la plus protectrice est un **Backend for Frontend (BFF) same-origin**. Le navigateur reçoit seulement un identifiant de session opaque dans un cookie `Secure; HttpOnly; SameSite`; les access/refresh tokens restent côté serveur. Les routes JSON Bearer existantes pour Mobile et les intégrations sont conservées. Une XSS active peut toujours agir dans la session ouverte, mais elle ne peut pas extraire un JWT réutilisable hors du navigateur.

Comme étape intermédiaire, un serveur peut garder le refresh token dans un cookie HttpOnly et ne remettre qu’un access token court en mémoire. Cela empêche le vol persistant du refresh token, mais le JavaScript XSS peut encore lire/exfiltrer l’access token pendant sa validité. Ce n’est donc pas la cible finale.

## Architecture QPM constatée

- `frontend/src/utils/api.ts` lit les deux jetons dans `localStorage`, envoie l’access token en Bearer et renouvelle la paire via `POST /auth/refresh` avec un JSON contenant le refresh token.
- `frontend/src/contexts/JWTAuthContext.tsx` stocke et restaure la session Web. Les parcours couvrent signin classique/LDAP, OAuth, signup connecté, switch-account, mot de passe et logout.
- STOMP lit l’access token dans `frontend/src/hooks/useImport.ts`, `useExport.ts` et `frontend/src/layouts/ExtendedSidebarLayout/Header/Buttons/Notifications/index.tsx`.
- Spring expose `/auth/signin`, `/auth/signin-ldap` et `/auth/refresh` en JSON, partagés avec Mobile. L’échange OAuth Web `/auth/oauth/exchange` utilise déjà un grant serveur à usage unique, mais retourne encore les JWT en JSON.
- Compose configure `API_URL=/api`; Nginx route `/api` et `/ws` vers Spring sous le même ingress. Caddy publie Nginx. Cette topologie rend un BFF same-origin possible, sous réserve de confirmer les domaines de production et les déploiements self-hosted.

## Solutions comparées

| Solution | Résistance à l’extraction par XSS | Coût QPM | Avis |
|---|---|---|---|
| Garder `localStorage`, renforcer CSP | Faible : tout script même origine peut lire les JWT. | Faible | Mitigation uniquement. |
| `sessionStorage`, chiffrement/obfuscation côté client | Faible : le même JavaScript peut lire les données ou appeler le déchiffrement. | Faible | Ne corrige pas la cause. |
| Refresh HttpOnly + access en mémoire (token-mediating backend) | Le refresh est protégé; l’access reste lisible pendant sa durée de vie. | Moyen | Palier rapide si le BFF complet est trop lourd. |
| JWT directement dans des cookies HttpOnly lus par le filtre API | Empêche leur lecture JavaScript; la XSS peut encore faire des actions. Cookies automatiques ⇒ CSRF obligatoire. | Moyen | Plus léger qu’un BFF, mais n’isole pas autant les tokens du navigateur. |
| BFF same-origin + session opaque; tokens côté serveur | Aucun JWT accessible au navigateur; empêche le vol persistant de bearer. Ne bloque pas les actions d’une XSS en cours. | Élevé | **Cible recommandée.** |

## Plan recommandé

1. Garder inchangés les endpoints JSON Bearer et les droits Mobile/API. Ajouter une surface d’authentification Web dédiée.
2. Le BFF traite signin/LDAP et OAuth côté serveur, puis remet un cookie de session opaque. L’échange OAuth existant reste à usage unique, mais ne renvoie plus de tokens au navigateur.
3. Le BFF ne relaie que les routes QPM explicitement autorisées; pas de proxy URL arbitraire. Il conserve les contrôles RBAC et tenant/site, et ne journalise ni cookies ni Authorization.
4. Cookie de session : `Secure; HttpOnly; SameSite=Lax`, `Path=/`, sans `Domain`, préfixe `__Host-` si compatible. Faire tourner l’identifiant à la connexion et aux changements de privilèges; prévoir expiration, révocation et logout serveur. Si plusieurs instances API sont utilisées, partager l’état de session avant la mise à l’échelle.
5. Défendre les mutations CSRF avec contrôle strict `Origin` et un jeton/en-tête anti-CSRF selon le déploiement. `SameSite` ou CORS seuls ne constituent pas une garantie générale.
6. Migrer avec le BFF REST les pièces jointes, téléchargements/rapports et les trois clients STOMP. Pour STOMP, authentifier la connexion same-origin par session/cookie; ne plus transmettre le JWT depuis le navigateur. Conserver Bearer pour les autres clients.
7. Déployer d’abord en recette, tester par rôle/tenant/site, SSO/LDAP, rotation concurrente, logout, expiration, CSRF, proxy TLS, imports/exports, pièces jointes et WebSocket. Ensuite seulement retirer/vider l’ancien stockage Web et révoquer les sessions héritées.

## Défenses XSS complémentaires

- Garder le rendu React échappé; ne pas introduire `dangerouslySetInnerHTML`. Sanitizer allowlist revu pour tout HTML riche.
- Continuer le contrôle des sinks DOM et des URLs; garder les tests d’impression QR.
- CSP stricte avec nonces/hashes et rapports, et Trusted Types après tests de compatibilité : défenses en profondeur, jamais substituts à l’encodage/sanitization.
- Réduire les scripts tiers et surveiller les dépendances exécutées dans l’origine.

## Sources

- IETF, [RFC 10017 — OAuth 2.0 for Browser-Based Applications](https://datatracker.ietf.org/doc/rfc10017/) : compare BFF et token-mediating backend, exige une défense CSRF avec cookies et rappelle qu’une XSS active peut encore agir dans la session.
- OWASP, [HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) : ne pas stocker d’identifiant de session dans `localStorage`, accessible au JavaScript de l’origine.
- OWASP, [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) : `HttpOnly`, `Secure`, `SameSite`, préfixes de cookies et limites de `HttpOnly`.
- OWASP, [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) et [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).

**Décision proposée :** adopter le BFF same-origin comme cible; utiliser la médiation de jetons comme étape provisoire seulement si nécessaire. Ne pas activer de cookie d’authentification avant d’avoir validé les domaines de production, OAuth/CSRF et WebSocket.
