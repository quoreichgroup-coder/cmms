# ADR — Réduction de l’exposition des jetons dans QPM Web

- **Statut :** première correction OAuth mise en œuvre localement; stockage Web général encore à migrer
- **Date :** 18 octobre 2026
- **Périmètre :** client Web React et flux OAuth Web; les clients mobiles/API existants doivent rester compatibles
- **Liens :** `docs/WEB-UI-SECURITY-AUDIT-2026-10-14.md`, lot `SEC-WEB-06` dans `docs/WEB-UI-REDESIGN-BACKLOG.md`

## Contexte et preuves du dépôt

Le navigateur stocke actuellement les deux jetons dans `localStorage` (`frontend/src/contexts/JWTAuthContext.tsx`, `frontend/src/utils/api.ts`). Le client API ajoute l’access token comme Bearer; la rotation envoie le refresh token dans le corps JSON à `POST /auth/refresh` et conserve la paire retournée. Ce contrat est également utilisé par les applications mobiles, il ne faut donc pas le remplacer globalement.

Avant la correction, le succès OAuth redirigeait avec `token` et `refreshToken` dans l’URL. Le navigateur les conserve désormais hors URL : le backend met la paire dans une session servlet, puis le Web la récupère une seule fois par `POST /auth/oauth/exchange`. Le grant est limité à 60 secondes, lié à la session qui a terminé OAuth et supprimé avant sa validation à l’échange. La redirection de succès n’ajoute ni JWT ni code dans la query string. Les erreurs exposent seulement `authentication_failed`.

Les hooks `frontend/src/hooks/useImport.ts`, `useExport.ts` et le composant des notifications passent l’access token au handshake STOMP. `JWTAuthContext` le transmet aussi au flux Zendesk. Une transition vers un access token uniquement en mémoire doit donc garder un point d’accès contrôlé à la valeur pour ces usages.

Le serveur expose `POST /auth/signin`, `/auth/signin-ldap` et `/auth/refresh` sous forme JSON dans `api/src/main/java/com/grash/controller/AuthController.java`; `/auth/logout` invalide les sessions côté serveur. Les réponses sont consommées par Web et Mobile. Le déploiement effectif des domaines, de CORS et des cookies n’a pas été vérifié dans cette revue.

## Décision

Procéder en deux changements séparés et rétrocompatibles, en donnant priorité à la suppression des jetons OAuth dans l’URL.

1. **OAuth Web (première étape appliquée) :** utiliser un grant temporaire conservé côté serveur dans la session OAuth existante et l’échanger par POST. Cela évite même un code de porteur dans l’URL. Le grant est à usage unique et expire après 60 secondes. Le endpoint valide l’en-tête `Origin` contre les origines Web configurées et renvoie `no-store`. Les cookies/session doivent encore être vérifiés sur les domaines de production. Les réponses `signin` et `refresh` des clients Mobile/API ne changent pas.
2. **Session Web à moyen terme :** évaluer un refresh token en cookie `Secure`, `HttpOnly`, `SameSite` et un access token de courte durée gardé en mémoire. Mettre en place cette session par des routes Web dédiées ou un BFF; préserver les routes JSON Bearer actuelles pour Mobile et intégrations. Avant réalisation, vérifier les domaines de production, le routage proxy et CORS, puis définir une protection CSRF (validation `Origin`/`Referer` et/ou jeton CSRF selon le déploiement), la rotation, la révocation, l’expiration et le comportement multi-onglet.

La première étape réduit l’exposition OAuth dans les URL, sans régler le stockage `localStorage` : Web continue de recevoir les jetons OAuth dans la réponse JSON de l’échange et les conserve via le mécanisme actuel. La prochaine étape est une preuve de concept de session Web cookie/BFF, après vérification des domaines/CORS/CSRF. L’API Bearer et les réponses de connexion existantes restent disponibles pendant la migration.

## Options considérées

| Option | Avantages | Coûts et risques | Décision |
|---|---|---|---|
| Garder `localStorage` et renforcer CSP seulement | Pas de changement backend; compatible avec STOMP et OAuth existants | Une XSS peut toujours lire et exfiltrer les deux jetons; `nginx.conf` autorise actuellement `script-src 'unsafe-inline'` | Rejetée comme solution finale; mitigation transitoire seulement |
| Refresh en cookie HttpOnly, access token mémoire | Le refresh token devient inaccessible au JavaScript; garde un Bearer utilisable par REST/STOMP | Routes et comportement cookies/CSRF/CORS à concevoir; gestion multi-onglet; les jetons de l’échange OAuth restent stockés localement | Retenue comme cible à étudier après validation de déploiement |
| BFF same-origin avec cookie de session | Le navigateur ne manipule aucun JWT; réduit l’exposition des secrets au frontend et simplifie STOMP si le serveur supporte la session | Plus grand changement d’architecture, proxy, websocket, exploitation et scalabilité | Cible préférable si l’infrastructure permet le same-origin; preuve de concept requise |
| Grant OAuth de session, bref et à usage unique | Aucun JWT ou code n’apparaît dans l’URL; grant lié à la session serveur | Dépend du cookie de session OAuth et du routage/CORS de production; réponse JSON contient toujours la paire de jetons | Implémenté localement; recette d’intégration requise |

## Conséquences et exigences de sécurité

- L’access token en mémoire reste accessible à du JavaScript exécuté dans l’origine; CSP stricte, assainissement et contrôle des dépendances restent nécessaires. HttpOnly réduit l’exfiltration du refresh token, sans empêcher une XSS d’agir dans la session active.
- Une cookie d’authentification est automatiquement jointe aux requêtes compatibles : la protection CSRF doit être conçue et testée avant activation. `SameSite` seul ne doit pas être présumé suffisant sans connaître les domaines et les parcours réels.
- Le endpoint OAuth d’échange rejette les origines absentes/non configurées avant de consommer le grant. Le service rejette l’absence de grant, la réutilisation et l’utilisation depuis une autre session; la réponse est `no-store`. Le test du délai d’expiration et la recette multi-instance/session distribuée restent à ajouter. Les journaux ne doivent pas contenir jetons/grants.
- STOMP/WebSocket et Zendesk doivent recevoir uniquement l’access token courant et court-vécu, jamais le refresh token. Vérifier les reconnexions après rotation et déconnexion.
- L’API Bearer, le refresh par JSON et les applications mobiles restent compatibles jusqu’à une décision de dépréciation indépendante.
- Les réponses d’erreur OAuth ne doivent pas exposer de détails internes dans `error` de la query string; examiner séparément ce chemin lors de l’implémentation.

## Plan de migration et critères de validation

1. Documenter les origines Web/API/mobile et le comportement de proxy/CORS/TLS du déploiement réel; relever les consommateurs OAuth.
2. Tester l’échange de session OAuth derrière le proxy réel, avec cookies, CORS et domaines de production; confirmer la réussite SSO Google/Microsoft et les erreurs génériques.
3. Ajouter test d’expiration, tests HTTP d’intégration et vérification qu’aucun jeton n’est dans les redirections ou journaux.
4. Pour supprimer aussi `localStorage`, créer des routes d’authentification Web dédiées qui déposent le refresh token dans un cookie `HttpOnly; Secure; SameSite=Lax` limité au chemin auth; garder l’access token uniquement en mémoire. Couvrir signin classique/LDAP, SSO, renouvellement, changement de compte, inscription avec connexion immédiate, mise à jour de mot de passe et logout. Garder `/auth/signin`, `/auth/refresh` et les autres contrats JSON actuels pour Mobile/API.
5. Remplacer les lectures directes de `localStorage` par une source mémoire contrôlée dans le client REST et ses consommateurs STOMP (`useImport`, `useExport`, Notifications) et Zendesk. Ajouter une protection CSRF/origin à toutes les routes Web avec cookie et étudier le comportement multi-onglet avant migration progressive.
6. Tester la matrice Web/Mobile/API, navigation OAuth, session expirée, navigateur privé, proxy TLS, sous-domaines, rôles, reconnexion STOMP, déconnexion réseau et révocation avant migration progressive.
7. Ne supprimer le support de l’ancien stockage qu’après période de compatibilité, métriques et plan de retour arrière documentés.

**Limite :** ce changement ne supprime pas les JWT de `localStorage`; une XSS exécutée dans l’origine peut encore les lire. Le changement ne modifie pas les contrats signin/refresh des clients mobiles. Aucune migration de base n’est requise.
