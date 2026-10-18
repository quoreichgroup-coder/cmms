# Audit approfondi — application Web QPM

**Audit initial :** 14 octobre 2026  
**Périmètre :** audit statique du frontend Web, de ses parcours d’authentification et de quelques contrôles backend directement sollicités par l’interface. Aucun code applicatif, contrat API, permission ou schéma de données n’a été modifié.

## Résumé exécutif

Le Web repose sur React 17, TypeScript 4.7, MUI 5 et Emotion. L’inventaire repository recense **106 destinations Web actives** et trois redirections exclues; ce nombre décrit des destinations de route, pas 106 écrans visuellement uniques. Le shell principal utilise un header et une sidebar responsive. Les modules sont chargés paresseusement, avec des vues et formulaires métier déjà riches.

La fondation permet une modernisation progressive sans changer l’API : garder React/MUI, formaliser les tokens, unifier les recettes de listes/tableaux, formulaires, filtres, états asynchrones et pages de détail, puis piloter sur les ordres de travail et les demandes.

Les thèmes Web déclarés sont **trois variantes claires**, pas un mode sombre. Les couleurs, espacements et élévations sont en partie centralisés, mais 205 occurrences hexadécimales sont réparties dans 33 fichiers frontend; ce comptage inclut les thèmes, gradients et styles cartographiques et ne signifie pas 205 couleurs distinctes d’interface. Plusieurs composants emploient aussi `sx`/styles locales.

L’authentification est portée par l’API et les contrôles backend existent; toutefois, l’audit statique a trouvé un défaut d’isolation interentreprise sur la suppression des clés API : un utilisateur de rôle client qui possède le droit SETTINGS peut supprimer une clé à partir de son identifiant sans que la suppression vérifie la société propriétaire. Ce constat doit être corrigé et couvert par un test négatif avant la refonte des écrans d’administration. L’audit n’a pas exécuté d’exploitation sur une instance réelle.

## Méthode et limites

- Lecture des consignes `docs/design.md`, des évaluations existantes dans `docs/ui-ux-assessment/`, des routes, thèmes, composants de shell, authentification frontend et contrôleurs/services backend liés aux ordres, actifs, demandes, rôles et clés API.
- Les routes et extraits de code sont vérifiés dans le dépôt. Le rendu réel, les contrastes calculés sur les pixels, les profils utilisateurs et les réponses d’une instance déployée ne sont pas vérifiés ici faute de session Web et de capture authentifiée.
- L’inventaire existant date du 10 octobre 2026; ses descriptions fonctionnelles indiquent explicitement des rôles et comportements à vérifier. Il sert de base de navigation, pas de preuve d’usage réel.
- Une revue statique n’est ni un test d’intrusion ni une certification de sécurité. Les conclusions « défaut confirmé » désignent une faille lisible dans le chemin de code; sa reproductibilité en environnement doit être testée de façon contrôlée.

## Architecture Web vérifiée

| Domaine | Éléments constatés |
|---|---|
| Interface | React 17.0.2, TypeScript 4.7.3, MUI 5.8.2, Emotion 11.9.0, MUI X DataGrid 5.17.3. |
| Navigation | React Router 6.3.0; routes déclarées dans `frontend/src/router/index.tsx`, destinations métier dans `frontend/src/router/app.tsx`; chargement par `React.lazy` et fallback `SuspenseLoader`. |
| État / formulaires | Redux Toolkit 1.8.2; Formik 2.2.9 et Yup 0.32.11; client API maison dans `frontend/src/utils/api.ts`. |
| Données visuelles | ApexCharts, composants de graphiques métier; plusieurs solutions de tableau sont présentes : MUI X, table personnalisée et TanStack Table. |
| Authentification | `JWTAuthContext` initialise la session, appelle l’API, charge profil/société et conserve actuellement les jetons côté navigateur. |
| Autorisation UI | Les menus et de nombreux boutons consultent `hasViewPermission`, `hasCreatePermission`, `hasEditPermission`, `hasDeletePermission`; les filtres UI améliorent l’expérience mais ne remplacent pas l’autorisation backend. |
| Serveur | Spring Security stateless, JWT/API keys, `@EnableMethodSecurity`, BCrypt 12; contrôles de rôle et d’accès aux objets/services métier. |

Routes opérationnelles principales identifiées : tableau de bord, demandes, ordres de travail, calendrier/charge, actifs et vues associées, maintenance préventive, compteurs, lieux, stock/pièces, achats, équipes/personnes, fournisseurs/clients, analyses et administration. Le détail des IDs est conservé dans `docs/ui-ux-assessment/screen-inventory.json`.

## Audit visuel et patterns

### Palette, thèmes et hiérarchie

`frontend/src/theme/schemes/PureLightTheme.ts` définit notamment primaire `#5569ff`, secondaire `#6E759F`, succès `#57CA22`, avertissement `#FFA319`, erreur `#FF1943`, info `#33C2FF`, texte sombre `#223354` et fond `#f2f5f9`. `GreyGooseTheme` utilise un primaire `#2442AF`; `PurpleFlowTheme` un primaire violet `#9b52e1` et une navigation active verte. Les trois définissent `palette.mode: 'light'`.

La personnalisation `CUSTOM_COLORS` n’est appliquée qu’à la palette de `PureLightTheme`; les thèmes alternatifs gardent des valeurs embarquées. Plusieurs gradients sont répétés dans les trois fichiers et les couleurs de statut sont configurées séparément de la marque. `ThemeSettings` propose ces palettes mais son inclusion dans `ExtendedSidebarLayout` est commentée. Le choix persiste dans `localStorage.appTheme` et `themeCreator()` ne possède pas de repli pour une valeur invalide.

La page Web de connexion (`frontend/src/content/pages/Auth/Login/Cover/index.tsx`) suit un patron distinct et simple : carte centrée MUI, logo, titre/sous-titre, formulaire, lien d’inscription et notices. L’écran d’inscription utilise un habillage différent. Ces constats ne s’appuient pas sur l’identité visuelle d’authentification mobile.

### Composition et densité

- Shell desktop avec header et sidebar persistants (`frontend/src/layouts/ExtendedSidebarLayout/`); la zone de contenu réserve l’espace de la sidebar sur grand écran.
- Les routes segmentent les grands modules, et les sous-vues imbriquées couvrent détails, onglets et paramètres.
- Les tables et listes sont critiques pour les flux industriels, mais les trois implémentations de tableau exposent un risque de comportements divergents (tri, pagination, sélection, filtres, densité, clavier et états vides).
- La bibliothèque de couleurs/utilitaires du thème est riche (gradients, ombres, alpha), alors que les tokens fonctionnels de densité, rayon, focus, erreurs de champ et état asynchrone ne sont pas inventoriés comme contrat partagé.
- La cohérence visuelle réelle entre modules, les dimensions exactes des cartes, la densité des tables et les points de rupture doivent être observés dans les captures par rôle avant de fixer la maquette.

### États et accessibilité à vérifier en prototype

Standardiser les états chargement, vide, erreur avec reprise, succès, accès interdit, hors ligne et sauvegarde en cours; garder texte + icône + couleur pour statuts et priorités. Vérifier contrastes WCAG, focus visible, ordre clavier, noms accessibles des boutons/icônes, tableaux au clavier, zoom 200 %, reflow mobile/tablette et annonces des erreurs formulaire. Aucun score automatique de contraste n’a été exécuté pendant cet audit.

## Constat sécurité et RBAC

### Défaut confirmé — suppression de clé API sans contrôle d’appartenance

Dans `api/src/main/java/com/grash/controller/ApiKeyController.java:77-88`, `delete(id, user)` exige un rôle client et le droit `SETTINGS`, puis lit la clé par identifiant et appelle `apiKeyService.delete(id)`. Contrairement à `search`, la suppression ne filtre pas par société; contrairement à `rotateKey` dans `ApiKeyService.java:114-119`, le chemin de suppression ne vérifie pas que la clé appartient à l’utilisateur ou à son entreprise. `ApiKeyService.delete()` exécute simplement `deleteById` (`:74-76`).

**Impact :** un administrateur de société muni du droit SETTINGS peut potentiellement révoquer/supprimer une clé API d’une autre société s’il obtient/devine son ID. Il s’agit d’un problème d’intégrité et d’isolation multi-tenant, classé **P0 sécurité**. La page Web ne doit pas être redesignée de façon à rendre l’action plus accessible avant correction backend. Correction recommandée : méthode de service atomique scindée par `companyId` (et politique explicite d’administration), refus/404 uniforme hors périmètre; tests négatifs entre sociétés et positifs même société. Ne pas appliquer dans ce livrable d’audit.

### Stockage des jetons navigateur

`frontend/src/contexts/JWTAuthContext.tsx:258-273` place access et refresh JWT dans `localStorage`. `frontend/src/utils/api.ts` les relit pour les requêtes et renouvelle le jeton après un 401. Un XSS dans l’origine permettrait à du JavaScript injecté d’accéder aux jetons. C’est une **exposition structurelle confirmée**, sans XSS exploitable identifié dans cette revue. Mitigations immédiates : réduire la surface XSS, éviter HTML non assaini, contrôler les dépendances et renforcer CSP; étudier séparément une migration vers cookie HttpOnly/SameSite ou BFF, qui implique une évolution d’authentification/CSRF et doit préserver la compatibilité mobile/API.

**Risque OAuth complémentaire confirmé statiquement (recontrôle du 18 octobre 2026) :** `OAuth2AuthenticationSuccessHandler.java` ajoute l’access token et le refresh token aux paramètres de requête de la redirection. `OauthSuccess.tsx` les lit puis appelle `loginInternal`, sans remplacer immédiatement l’URL. Des JWT dans une URL peuvent être conservés dans l’historique ou des journaux de proxy. Aucun incident ni fuite en production n’a été vérifié. La correction recommandée est un code d’échange opaque, bref et à usage unique; voir `docs/WEB-AUTH-TOKEN-ADR-2026-10-18.md`. Cette correction nécessite un lot backend/API dédié.

### Déconnexion incomplète si le serveur est indisponible

`JWTAuthContext.tsx:671-687` attend `api.post('auth/logout')` avant de retirer les jetons et de mettre l’état React à déconnecté. Si l’appel échoue, le nettoyage local est sauté. Recommandation : garantir le nettoyage client dans un `finally`, puis tester réseau coupé et erreur serveur; vérifier le contrat de révocation backend avant décision. C’est un défaut de résilience/auth UX confirmé par l’ordre du code.

### Garde de route frontend et garde backend

`router/index.tsx` protège `/app` par `Authenticated`, qui ne vérifie que `isAuthenticated` (`components/Authenticated/index.tsx:18-31`). Il n’existe pas de garde de route déclarative par permission dans le routeur. Les menus et composants font des contrôles UI, tandis que le serveur exige une authentification générale et plusieurs contrôleurs délèguent l’autorisation aux services. La protection serveur reste déterminante; une route UI cachée ou un bouton masqué ne constitue jamais un contrôle d’accès.

À conserver côté serveur : contrôles d’entreprise et d’objet. Exemple favorable : `AssetService.checkAccessToAssetId()` restreint la recherche à `companyId` avant `canBeViewedBy`; lecture NFC/barcode contrôle licence, société et visibilité. `RoleService` limite le périmètre d’édition à l’entreprise et vérifie que le rôle demandeur ne puisse pas accorder des permissions qu’il ne possède pas.

### Surface API publique et configuration

- `WebSecurityConfig.java:58-94` garde la majorité des routes derrière `.authenticated()` et déclare des exceptions publiques (login, reset/activation, santé, configuration d’instance, websockets, portails, webhooks, docs). Chaque exception doit rester limitée au sous-ensemble de données et d’actions attendu, avec expiration/anti-abus pour les liens publics.
- Plusieurs méthodes utilisent `@PreAuthorize("permitAll()")` pour simplifier l’accès méthode; la chaîne HTTP globale continue à exiger un utilisateur hors allow-list. Les noms peuvent induire en erreur lors d’une revue et méritent une convention explicite.
- Le contrôleur Asset a plusieurs lectures `permitAll()` à méthode, mais les services vérifient société/droits/visibilité; la route NFC appelle un service contrôlant licence, company et `canBeViewedBy`.
- `ApiKeyAuthFilter` vérifie révocation, expiration, utilisateur activé et entitlements. Les tests doivent aussi prouver qu’une clé d’une société n’autorise aucune lecture ou mutation dans une autre société.
- CORS est paramétré via les URLs frontend (`WebMvcConfig.java`); vérifier les valeurs exactes du déploiement et le comportement OPTIONS. Spring Security est stateless avec CSRF désactivé, cohérent avec Bearer JWT; réévaluer CSRF si l’auth passe à cookie.
- `nginx.conf` pose une CSP, `X-Frame-Options`, `nosniff` et `Referrer-Policy`. La CSP autorise `'unsafe-inline'` pour scripts et styles; cela affaiblit la protection contre XSS. Les en-têtes d’API/HSTS doivent être vérifiés à la terminaison TLS réelle. La configuration déployée n’a pas été consultée.
- Les buckets de rate limiting sont stockés en mémoire locale (`RateLimiterService`); vérifier le comportement multi-réplica et la croissance/éviction des caches avant de considérer la limite comme robuste à l’échelle.

## Registre des constats

| ID | Sévérité | Type | Constat / preuve | Suite recommandée |
|---|---|---|---|---|
| SEC-WEB-01 | P0 | Défaut confirmé statiquement | Suppression API key sans tenant check, `ApiKeyController.java:77-88`, `ApiKeyService.java:74-76`. | Corriger côté backend, test négatif cross-tenant, puis revoir l’UI admin. |
| SEC-WEB-02 | P1 | Risque structurel confirmé | JWT en localStorage, `JWTAuthContext.tsx:258-273`. Aucun XSS trouvé ici. | Réduire XSS et cadrer un ADR de migration auth sans casser les clients existants. |
| SEC-WEB-03 | P1 | Défaut de résilience confirmé | Échec logout API empêche le nettoyage local, `JWTAuthContext.tsx:671-687`. | Nettoyage garanti, tests réseau indisponible/session. |
| SEC-WEB-04 | P1 | Durcissement | CSP inclut `unsafe-inline`; configuration CORS/HSTS de production non vérifiée. | Inventaire scripts/styles inline, CSP nonce/hash; vérifier ingress/TLS et CORS effectifs. |
| SEC-WEB-05 | P1 | Vérification requise | Routes admin/API publiques et flux de portail/webhook nécessitent matrice de test négative. | Tester rôles, sociétés, objets non visibles, URL directes, liens expirés, quotas. |
| UX-WEB-01 | P1 | Fait de code + hypothèse UX | Trois systèmes de table/listes; divergence de comportement possible. | Comparer WO, demandes et actifs; établir une recette de tableau commune avant consolidation. |
| UX-WEB-02 | P1 | Défaut système confirmé | Trois thèmes Web sont `light`; pas de mode sombre; palette utilisateur non exposée depuis le shell. | Décider si le MVP Web exige Light only ou le système de thèmes; ne pas prétendre que le dark mode existe. |
| UX-WEB-03 | P1 | Défaut système confirmé | Thèmes dupliqués, personnalisation seulement dans PureLight et `themeCreator` sans fallback. | Palette sémantique unique avec validation et fallback; préserver couleurs métier distinctes. |
| UX-WEB-04 | P2 | Hypothèse à valider visuellement | Densité, cohérence cartes, formulaires, focus et états variables selon modules. | Capture par rôle et grille responsive avant choix final. |

## Stratégie de refonte Web sans rupture API

**Phase 0 — sécurité et référence** : corriger/valider SEC-WEB-01; prendre les captures authentifiées desktop/tablette/mobile pour Super Admin, superviseur, technicien et demandeur; vérifier les droits effectifs et la version runtime.

**Phase 1 — fondations visuelles** : définir les tokens sémantiques (surface, texte, bordure, focus, action, état, densité, rayon, élévation); unifier composants de feedback et de formulaire; utiliser MUI/Emotion existants. Préserver couleurs métier d’état et ajouter libellé/icône; vérifier contraste.

**Phase 2 — pilote opérationnel** : refondre la liste WO, filtres, détail/exécution, puis demandes et approbation. Le pilote confronte table dense, lecture de statut, actions dangereuses, permission insuffisante, chargement/erreur/vide et responsive.

**Phase 3 — réutilisation** : étendre les recettes validées aux équipements/lieux/compteurs et PM/calendrier; ensuite pièces/achats/équipes; enfin administration et analytics.

### Règles de compatibilité

- Conserver routes, payloads, paramètres de recherche, permissions et transitions métier à l’identique pendant la passe visuelle.
- Extraire des composants et styles d’abord; toute modification de comportement, backend, politique de permission ou contrat passe en changement séparé avec revue dédiée.
- Ajouter les tests visuels/accessibilité et tests d’intégration sur les parcours critiques avant migration par familles.

## Protocole de validation avant approbation des maquettes

1. Capturer 4 tailles de viewport et 4 profils utilisateurs, inclure clavier, zoom, chargement lent et perte de réseau.
2. Parcours critiques : créer demande, approuver en WO, créer/assigner WO, saisir temps, compléter et consulter historique, chercher actif et ouvrir PM.
3. Tester l’URL directe d’un écran non autorisé et l’appel API équivalent : UI doit expliquer l’accès refusé et API doit répondre 403/404 sans fuite.
4. Tester isolement entre deux sociétés pour lecture, export, pièces jointes, modification, suppression, rôle, clé API et relations d’actif.
5. Contraste calculé pour texte normal/grand, états, focus et boutons; navigation clavier uniquement et lecteur d’écran sur dialogue, table et validation.

## Fichiers de référence

- `docs/design.md`
- `docs/ui-ux-assessment/screen-inventory.json`
- `docs/ui-ux-assessment/07-DESIGN-SYSTEM-AUDIT.md`
- `frontend/package.json`
- `frontend/src/router/index.tsx`, `frontend/src/router/app.tsx`
- `frontend/src/theme/ThemeProvider.tsx`, `frontend/src/theme/schemes/`
- `frontend/src/content/pages/Auth/Login/Cover/index.tsx`
- `frontend/src/contexts/JWTAuthContext.tsx`, `frontend/src/utils/api.ts`
- `api/src/main/java/com/grash/configuration/WebSecurityConfig.java`
- `api/src/main/java/com/grash/controller/ApiKeyController.java`, `api/src/main/java/com/grash/service/ApiKeyService.java`
- `nginx.conf`

## Recontrôle et correction — 16 octobre 2026

- Relecture statique ciblée du chemin de clés API : le contrôleur de lecture et suppression récupérait l’objet par identifiant seul, et la suppression déléguait à `deleteById`. Le `@PostLoad` du modèle constituait un garde-fou supplémentaire, mais ne remplaçait pas une requête explicitement limitée à la société.
- Correction appliquée : le service interroge désormais `findByIdAndCompany_Id` pour lire, tourner et supprimer une clé. Un identifiant d’une autre société suit le même chemin `404` qu’un identifiant absent. La vérification SETTINGS reste en place; aucune route/payload API ni permission n’a été changée.
- Tests négatifs ajoutés pour vérifier que la suppression et la rotation hors société ne touchent aucune clé. Exécution non vérifiée : Maven n’est installé ni dans l’environnement local ni accessible via Docker (accès au socket refusé). À exécuter avec `mvn -Dtest=ApiKeyServiceTenantIsolationTest test` dans `api/`.
- Contrôles frontend ciblés (déconnexion en échec réseau, états d’erreur demandes/OT, état tableau/pagination/recherche et contraste/navigation) passés. Le lint complet avait été tué par la limite de ressources de l’environnement.
- L’instance Web authentifiée, le comportement ingress/TLS/CORS, les parcours inter-sociétés en environnement et les captures multi-résolutions restent à vérifier. Ce recontrôle statique ne vaut pas test d’intrusion ni validation visuelle réelle.

## Recontrôle ciblé Web — 16 octobre 2026

- La route `/api-keys` a été relue opération par opération. La recherche filtre par société; la création est limitée au compte courant et vérifie SETTINGS/licence; la lecture, rotation et suppression utilisent désormais une recherche société-scopée, et la rotation vérifie aussi le propriétaire de la clé.
- Défense en profondeur : la méthode interne `ApiKeyService.update()` (sans endpoint correspondant dans `ApiKeyController`) utilise elle aussi la recherche par société. Les helpers internes non-scopés `getAll()` et `findById()` ont été retirés après vérification qu’ils n’avaient aucun appelant dans le dépôt. Aucune route ni payload API ne change.
- Un test négatif couvre l’impossibilité pour `update()` de charger ou sauvegarder une clé hors société; il complète les tests existants de suppression et rotation. **Non exécuté** : Maven manque dans l’environnement et le socket Docker est inaccessible. À vérifier avec `mvn -Dtest=ApiKeyServiceTenantIsolationTest test` depuis `api/`.
- Les tests automatisés frontend `node --test scripts/*.test.cjs` passent **25/25**. Un test de rendu de la page Société avait des mocks incomplets (modules TypeScript relatifs); ils ont été corrigés, et les deux cas de titre rendent maintenant correctement.
- Le build optimisé et `tsc --noEmit` ont été tentés, mais aucun processus de compilation/code de sortie exploitable n’a été récupéré dans ce conteneur; ils sont donc marqués **non vérifiés**.
- Toujours non vérifiés : session navigateur authentifiée, matrice de rôles/deux sociétés en environnement, CSP/CORS/HSTS réellement servis, et parcours visuels/responsive/clavier/lecteur d’écran. Le risque structurel JWT en `localStorage` et la CSP avec `unsafe-inline` restent des travaux sécurité distincts.

## Relecture ciblée Web — 16 octobre 2026 (suite)

- Défaut de préférence visuelle confirmé : `themeCreator()` retournait `undefined` pour une valeur `appTheme` inconnue ou devenue obsolète. Repli ajouté vers `PureLightTheme`, avec test des valeurs valides et invalides.
- Défaut de navigation confirmé dans les détails directs des OT et demandes : une réponse réseau tardive pouvait remplacer l’objet plus récemment demandé et conserver un indicateur de chargement trompeur. Les slices ignorent désormais les réponses et erreurs obsolètes; tests concurrents ajoutés pour les deux modules. Les routes, appels et contrats API ne changent pas.
- Ajustement UI de la sidebar : sa surface est maintenant distincte du fond d’application (`#E9EEF8` contre `#F4F6FD`); la teinte secondaire de navigation est assombrie pour conserver un contraste calculé supérieur ou égal à 4,5:1. Le bleu reste réservé à la sélection et au focus.
- Validation actuelle : `node --test scripts/*.test.cjs` — **26/26 passés**; ESLint ciblé et Prettier passent. `tsc --noEmit` et le build de production ont été lancés, mais le processus de vérification a disparu sans code de sortie exploitable dans cet environnement; ces deux contrôles restent donc **non confirmés** pour cette relecture.
- Aucun rendu Web authentifié ni test de permissions entre deux sociétés n’a été possible dans cette session. Les risques SEC-WEB-02/04/05 restent ouverts : JWT dans `localStorage`, CSP avec `unsafe-inline`, configuration effective CORS/TLS et campagne négative par rôle/tenant. La correction API-key en place est limitée au tenant dans le code et possède des tests négatifs de service, mais son exécution Maven/environnement reste à confirmer.

## Recontrôle sécurité ciblé — 16 octobre 2026 (impression du QR portail)

- Défaut confirmé : `SharePortalModal` construisait le document d’impression avec `document.write()` et interpolait `portal.title` dans le HTML. Le titre est contrôlable par un utilisateur qui gère le portail; des balises dans ce champ pouvaient donc devenir du HTML dans une nouvelle fenêtre de même origine.
- Correction locale : le document est maintenant construit avec `createElement`, `textContent`/propriétés DOM et `replaceChildren`; aucune chaîne contrôlée par l’utilisateur n’est analysée comme HTML. La référence `window.opener` est neutralisée immédiatement. Le parcours et les API restent inchangés.
- Test de régression `frontend/scripts/print-qr-security.test.cjs` : un titre contenant fermeture de balise, script et image reste du texte et n’ajoute aucun élément injecté. Le test ciblé passe.
- Cette correction ne ferme pas SEC-WEB-02/04/05 : les JWT restent dans `localStorage`, la CSP autorise encore `unsafe-inline`, et l’environnement de production ainsi que les tests négatifs par rôle/tenant ne sont pas vérifiés ici. La recherche source n’a pas relevé d’autres usages de `dangerouslySetInnerHTML`, `innerHTML` ou `insertAdjacentHTML`; le `document.write` vulnérable relevé dans le portail a été supprimé.
- Vérifications après correction : `node --test scripts/*.test.cjs` passe **27/27**; `npx tsc --noEmit --pretty false` termine avec code 0; Prettier et `git diff --check` sur les fichiers de la correction passent. Le build optimisé échoue avant compilation complète avec « process exited too early » (pression mémoire/arrêt externe probable); ESLint ciblé n’a pas fourni de fin exploitable. Aucun test navigateur authentifié n’a été réalisé.

## Recontrôle fonctionnel et sécurité des fenêtres — 16 octobre 2026

- `useExport` et `CompanyPlan` ouvraient un nouvel onglet après la fin d’une requête asynchrone. Le défaut de compatibilité avec le blocage des fenêtres contextuelles est confirmé par le séquencement du code; il n’a pas été observé dans une session navigateur authentifiée.
- Correction locale Web : la fenêtre est ouverte dans le geste utilisateur avant l’appel API/WebSocket avec un message d’attente, son `opener` est neutralisé, et la destination est limitée aux URL HTTP(S) sans identifiants intégrés. Une erreur ferme la fenêtre en attente. Le portail Paddle affiche maintenant un message d’échec au lieu d’une promesse rejetée sans feedback.
- Tests de régression : popup refusée, URL relative de stockage signée autorisée, schémas dangereux et identifiants rejetés, fenêtre fermée sur erreur. La suite frontend passe **28/28**; ESLint ciblé et Prettier passent. Le typecheck avait réussi avant le dernier libellé d’attente; sa relance et le build optimisé n’ont pas fourni de code de sortie exploitable dans cette session. La recette réelle des exports et du portail de facturation reste requise.
- Cette correction ne clôt pas SEC-WEB-02/04/05. Les JWT restent dans `localStorage`, la CSP effective et permissive reste à durcir, et les contrôles de rôles/tenants nécessitent une campagne dans un environnement connecté. Aucun test d’intrusion ni test réel d’isolation multi-société n’a été exécuté ici.
- Vérification QR côté Web : la fiche actif produit/télécharge un QR à partir de `asset.barCode` (`frontend/src/content/own/Assets/Show/AssetDetails.tsx`), mais aucun scanner caméra Web (`getUserMedia`, `BarcodeDetector` ou composant équivalent) n’existe dans `frontend/src`. La fonction d’identification par caméra est donc absente du Web dans l’état du code; ce n’est pas un flux Web cassé à corriger sans confirmation de périmètre. Le scan mobile est hors de ce recontrôle Web.

## Relecture continue — 16 octobre 2026 (ouverture de liens Web)

- Défaut confirmé : plusieurs vues ouvraient des URLs de fichiers ou de marque provenant des réponses API/configuration via `window.open(url, '_blank')` sans neutraliser systématiquement `window.opener`. Les liens vers les fichiers de lieux et du module Fichiers n’appliquaient pas non plus de restriction de protocole; des données altérées pouvaient donc tenter d’ouvrir des schémas actifs dans une nouvelle fenêtre.
- Correction locale : `frontend/src/utils/safeWindow.ts` centralise l’ouverture synchrone des liens, accepte HTTP(S), accepte `mailto:` uniquement au lien d’assistance explicitement autorisé, rejette les protocoles actifs et les identifiants URL, normalise les sites de marque sans schéma en HTTPS et ouvre avec `noopener,noreferrer`. Les vues Fichiers, Actifs, Localisations, site de marque public, documentation API et demande d’assistance réutilisent ce helper. Les fenêtres temporaires pour requêtes asynchrones et impression QR demeurent gérées par leurs helpers spécifiques.
- Tests `frontend/scripts/safe-window.test.cjs` couvrent les URL HTTP(S), chemins signés relatifs, `javascript:`, `data:`, identifiants, `mailto:` et normalisation HTTPS. Recherche source après correction : les seules ouvertures directes restantes sont la fenêtre provisoire contrôlée (`asyncWindow.ts`), la fenêtre d’impression QR contrôlée (`SharePortalModal.tsx`) et le helper sûr.
- Vérifications locales : la suite frontend passe **30/30**, ESLint ciblé et Prettier sur les nouveaux fichiers passent. `tsc --noEmit` ne s’est pas terminé en 30 secondes (code 124); le build de production et la recette navigateur restent à faire.
- Risques non corrigés par ce lot : stockage JWT dans `localStorage`, CSP avec `unsafe-inline`, configuration CORS/TLS déployée non vérifiée et campagne d’autorisation entre rôles/sociétés non exécutée. Ces sujets nécessitent respectivement une décision d’architecture d’authentification, l’inventaire des scripts tiers/inline et une instance de test multi-tenant; aucune modification de ces mécanismes n’est incluse.
- Défaut d’accessibilité confirmé en relisant le shell Web : `frontend/public/index.html` interdisait le zoom utilisateur (`maximum-scale=1`, `user-scalable=0`). La limite a été retirée, le comportement d’affichage initial restant `width=device-width, initial-scale=1.0`. `frontend/scripts/viewport-zoom-accessibility.test.cjs` empêche le retour de cette restriction.
- Aucun rendu visuel réel ni test navigateur authentifié n’a été exécuté dans cette relecture.

## Relecture complémentaire des liens et du thème — 16 octobre 2026

- Des `href` issus de données de documents et de la configuration Société n’étaient pas validés au rendu. `getSafeHttpUrl()` les normalise désormais et n’autorise que HTTP(S), sans identifiants intégrés; les valeurs invalides n’exposent aucune action de navigation. Les chemins signés relatifs restent compatibles.
- Un chemin d’import de `safeWindow` incorrect dans `Settings/Integrations/Webhooks.tsx` bloquait le typecheck global; corrigé après signalement de `tsc`.
- La fiche Société utilisait une couleur noire forcée pour les valeurs; remplacement par `text.primary` pour suivre le thème courant.
- Suite frontend : **30/30**; Prettier et ESLint ciblés passent; `npx tsc --noEmit --pretty false` passe après les corrections. Le build de production a été interrompu après disparition du processus de compilation; aucun résultat exploitable. Aucun test navigateur authentifié ou de séparation effective par rôle/tenant n’a été réalisé.
- Les risques d’architecture non résolus restent inchangés : JWT dans `localStorage`, CSP permissive, configuration de production CORS/TLS non vérifiée. Aucun contrat API ni règle métier n’a été modifié.

## Relecture ciblée Webhooks — 16 octobre 2026

- **P0 corrigé dans le code, tests Java en attente :** `WebhookEndpointService.update` et le chemin de suppression acceptaient un ID global sans scoper la lecture à la société courante. Les deux opérations utilisent maintenant `findByIdAndCompanyId`; les tests négatifs correspondants sont ajoutés.
- **Exposition de secret corrigée dans le code :** le endpoint de liste et la réponse de mise à jour n'incluent plus `secret`; le frontend ne rend plus de secret de ligne et n'en conserve aucun dans Redux. Création/rotation restent des réponses ponctuelles pour que l'administrateur puisse provisionner le consommateur webhook.
- **Contrôle d'action et feedback :** rotation avec confirmation; création exige un événement côté client et serveur; suppression n'affiche le succès qu'après confirmation de l'API.
- **Vérification d'exécution :** ESLint ciblé, Prettier et tests frontend **30/30** réussis. Le typecheck complet avait réussi avant les derniers ajustements du traitement de suppression/validation; sa relance n'a pas fourni de résultat (processus disparu sans code de sortie). Le test Maven ne tourne pas ici (`mvn` absent); il doit passer avant livraison. Recette Web authentifiée et tests multi-sociétés réels non exécutés.
- **Risque à traiter ensuite :** `WebhookUrlValidator` résout et vérifie le DNS, puis `RestTemplate` ouvre la connexion séparément. Un changement DNS entre les deux étapes ou une redirection n'a pas été exclu par la preuve statique; traiter ce point dans le durcissement backend des webhooks, indépendamment du redesign Web.
