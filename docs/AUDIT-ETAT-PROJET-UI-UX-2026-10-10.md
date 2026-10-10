# QPM — État du projet et préparation UI/UX

**Revue du dépôt : 10 octobre 2026**
**Portée :** architecture produit présente dans le dépôt, routes et écrans web/mobile, avancement documenté, risques de mise en service et préparation de la future refonte.
**Référence de conception :** [`design.md`](design.md).
**Statut Git observé :** nombreux fichiers modifiés et non suivis; aucun changement n’a été commité par cette revue.

## Synthèse

QPM possède déjà un socle CMMS/EAM étendu : demandes, ordres de travail, équipements et emplacements, maintenance préventive, compteurs, inventaire, achats, personnes/équipes, rapports, paramètres, licences et profil entreprise. Les développements locaux récents étendent fortement les plans PM (prévisions, appels persistants, cycles/stratégies multi-compteurs), la configuration entreprise/sites et l’archivage de documents. Ils constituent un avancement du code, mais leur présence ne prouve pas à elle seule que ces parcours sont actifs sur le serveur.

La priorité immédiate reste la **stabilité de l’environnement**. Les derniers journaux communiqués le 9 octobre montrent un backend qui redémarre pendant la création de Hibernate/JPA après que Liquibase annonce « Database is up to date ». Les erreurs de validation ont évolué au fil des redémarrages : colonne `request.site_id`, colonne d’audit `work_order_aud.site_mod`, puis séquence d’audit `company_configuration_audit_seq`. Les commandes `curl` sur `/api/health-check` ont alors renvoyé `502 Bad Gateway`. Le démarrage fonctionnel de la version contenant les migrations correctives n’est pas confirmé dans les éléments disponibles.

La refonte visuelle doit donc être **préparée maintenant, mais démarrée après confirmation de la stabilité et de la recette MVP**. La prochaine phase UI doit d’abord établir un état de référence réel (navigation authentifiée, rôles, desktop/tablette/téléphone), puis comparer des patterns, prototyper et tester un parcours pilote. Aucun défaut visuel de production n’est affirmé sur la base de cette revue statique.

## Échelle de preuve

| Marqueur | Signification |
|---|---|
| **Confirmé dans le dépôt** | Route, écran, modèle ou mécanisme identifié dans le code source. |
| **Documenté / à revalider** | Résultat consigné dans une note datée, mais pas reproduit pendant cette revue. |
| **À tester en environnement** | Nécessite une instance démarrée, un compte de test, ou un appareil réel. |
| **Proposé** | Décision ou direction de conception à examiner avant développement. |

Cette revue ne s’est pas connectée à une session web authentifiée : l’accès réseau local/public n’était pas disponible dans le contexte d’inspection. Elle n’a pas lancé d’actions de création/modification ni de tests automatisés. Les captures historiques de `docs/validation-pilote/2026-10-03/` sont des preuves datées du pilote, pas une représentation garantie de l’interface actuelle.

## Architecture constatée

| Couche | Constat confirmé | Références |
|---|---|---|
| Web | React 17, TypeScript, MUI 5, Emotion, Redux Toolkit, React Router 6, Formik/Yup; plusieurs tableaux combinent composants internes, MUI et TanStack Table. | `frontend/package.json`, `frontend/src/router/`, `frontend/src/content/own/components/` |
| API | Spring Boot et JPA/Hibernate avec PostgreSQL et Liquibase; endpoints consommés par le client web via `frontend/src/utils/api.ts` et les slices Redux. | `api/src/main/java/com/grash/controller/`, `api/src/main/resources/db/`, `frontend/src/slices/` |
| Mobile | Expo 53, React Native 0.79, React 19, Paper, React Navigation, Redux Toolkit et stockage local. La version source déclarée est 1.0.55; cela ne confirme pas qu’un APK/IPA de cette version est publié ou installé. | `mobile/package.json`, `mobile/app.config.ts`, `mobile/navigation/index.tsx` |
| Sécurité UI | Routes d’application protégées; écrans et éléments d’action utilisent droits, rôles et entitlements. À confirmer par une matrice de rôles en test. | `frontend/src/router/`, `frontend/src/hooks/useAuth.ts`, `mobile/hooks/useAuth.ts` |
| Marque | « QPM » est le nom de travail; le guide produit dit que la marque actuelle reste provisoire et que les éléments client doivent être configurables. | `docs/design.md`, `docs/ORIENTATION-PRODUIT.md` |

Le dépôt reste mono-entreprise selon l’orientation produit approuvée; le concept `Site` enrichit la structure opérationnelle mais ne doit pas être interprété comme la livraison d’une isolation multi-entreprise.

## Inventaire fonctionnel observé

Les routes sont déclarées dans `frontend/src/router/app.tsx` et `frontend/src/router/analytics.tsx`; les principaux modules de premier niveau sont présents dans `frontend/src/content/own/`.

| Domaine / routes principales | Écrans ou capacités repérés | État de preuve / intérêt UI futur |
|---|---|---|
| Travail — `/app/work-orders`, `/app/requests` | Listes et fiches, création/modification, filtres, calendrier/charge, exécution et rapports WO. | **Présent dans le dépôt.** Parcours cœur; priorité de validation par rôle et écran principal de la future refonte. |
| Maintenance — `/app/preventive-maintenances`, `/app/meters` | PM standard/calendaire/compteur, preview, registres d’appels, cycles et stratégie; fiche compteur et relevés. | **Présent dans le dépôt, recette terrain encore nécessaire** pour les appels, cycles multi-compteurs et droits. Formulaires denses à simplifier après observation. |
| Actifs — `/app/assets`, `/app/locations` | Hiérarchie d’actifs, listes, fiches avec onglets (vue générale, détails, WO, pièces, fichiers, compteurs, arrêts, analyses), hiérarchie des emplacements. | **Présent dans le dépôt.** Bon candidat pour une vue équipement 360 cohérente web/mobile. |
| Stocks et achats — `/app/inventory`, `/app/purchase-orders` | Pièces, ensembles, commandes et catégories dédiées. | **Présent dans le dépôt.** Couverture exacte du flux demande d’achat → réception doit être validée. |
| Organisation — `/app/people-teams`, `/app/vendors-customers` | Utilisateurs, équipes, fournisseurs, clients. | **Présent dans le dépôt.** Matrice droits et actions de création à vérifier. |
| Analytique — `/app/analytics/...` | Rapports d’ordres (état, analyse, vieillissement, temps/coûts), actifs (fiabilité/coût/utilisation/vie utile), pièces et demandes. | **Code correctif documenté le 9 oct.; état live à reconfirmer**, notamment après le rétablissement API. |
| Administration — `/app/settings`, `/app/account/profile`, `/app/account/company-profile`, `/app/about-licenses` | Paramètres fonctionnels, rôles, checklists, intégrations, profil entreprise, légal, sites, historique de configuration, licence et abonnement. | **Profil entreprise enrichi dans le code.** Permissions, sauvegarde et présentation mobile doivent être exercées en session. |
| Documents et imports — `/app/files`, `/app/imports` | Gestion de fichiers, écrans d’import/export présents dans le code. | Flux asynchrones/STOMP et conservation des documents générés à confirmer sur une instance active. |
| Mobile — navigation `WorkOrders`, `AddEntities`, actifs, emplacements, PM, demandes, compteurs, pièces, équipes, entreprise/licence | Flux terrain prioritaires et sélectionneurs natifs. | **Écrans repérés.** Pas de preuve de parité fonctionnelle complète, de test iOS natif, ni de test actuel Android sur appareil dans cette revue. |

Cette liste est un inventaire ciblé du premier niveau et des parcours demandés par l’orientation QPM; elle ne signifie pas que chaque permission, sous-route ou variante a été testée.

## État d’avancement par chantier

| Chantier | État actuel | Prochaine preuve nécessaire |
|---|---|---|
| Démarrage API / compatibilité schéma | **Bloquant / non confirmé.** Logs fournis : Liquibase indique aucune migration à exécuter, puis Hibernate échoue avec une colonne ou séquence manquante; proxy renvoie 502. | Après intégration des correctifs, attendre un démarrage stable, vérifier `docker compose ps`, la fin des migrations, `/api/health-check` et `/api/instance-config`, puis surveiller l’absence de boucle de redémarrage. |
| Parcours web général | **À revalider** après démarrage API. | Connexion, tableau de bord, listes et fiches Work Orders, Assets, Locations, PM, Users/Teams, avec Network/logs et états d’erreur. |
| Rapports analytiques (13 widgets) | Correctifs ciblés et tests antérieurs consignés; les derniers changements ne sont pas confirmés sur l’instance actuelle. | Tester trois rapports et tous les widgets sur des données réelles; vérifier réponse vide, erreur serveur, retry et période sélectionnée. |
| PM standard, prévision et registre | Fonctions largement présentes selon le code et `docs/BACKLOG-MAINTENANCE-PREVENTIVE.md`; guide de recette utilisateur existe. | Suivre `docs/TESTS-PM-STRATEGIES-MULTICOMPTEURS.md` sur environnement de test, inclure génération et ordre réellement lié. |
| PM cycles/stratégies multi-compteurs OR/AND | **Implémenté dans le dépôt; validation manuelle à poursuivre.** | Confirmer séparément seuils et cycles PM, ordre généré une seule fois, lien au registre, tâches du package et comportement redémarrage. |
| Profil entreprise/sites/documents | Écrans, services et migrations présents localement. | Démarrage schéma, droits propriétaire/administrateur/lecture seule, documents émis, snapshot immuable, données après redémarrage. |
| Android | Source déclare `1.0.55`; aucune preuve de la génération/signature de cet artefact n’est apportée ici. | Produire/identifier l’APK aligné avec l’API confirmée, vérifier signature et URL; installer puis tester connexion, caméra/photo, upload, notifications et tâches terrain. |
| iOS | Configuration Expo/Xcode est présente; un build iOS n’est pas prouvé. | Build signé via macOS/EAS, installation TestFlight/appareil et mêmes scénarios pertinents. |
| Commit et publication | Le dépôt contient de nombreux changements non commités/non suivis. | Revue par lots, exclusions des artefacts secrets et fichiers résiduels, builds/validation, puis commit/push selon instruction séparée. |

## Audit UI/UX fondé sur le code

### Navigation et architecture de l’information

La navigation web place les WO et la maintenance préventive au premier niveau, puis regroupe plusieurs familles de rapports sous « Statistics »; demandes, actifs, emplacements, inventaire, achats, compteurs, personnes/équipes, partenaires, fichiers et réglages suivent dans la barre latérale (`frontend/src/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/items.ts`). L’arborescence réelle est fonctionnelle mais transversale : les demandes et actifs vivent séparément des ordres; les paramètres entreprise/licence sont dans le profil; les checklists sont sous réglages. `docs/design.md` propose comme hypothèse des groupes Travail, Maintenance, Actifs, Matériels, Achats, Personnes, Analytique et Administration. **À prototyper et tester**, pas à imposer sans test de recherche/navigation.

Sur mobile, la barre de navigation inférieure donne accès aux ordres, à la création contextuelle et à des espaces principaux; un écran « More » et plusieurs feuilles modales/action sheets portent le reste. Le web et le mobile sont donc deux expériences complémentaires, pas une simple mise à l’échelle.

### Éléments UI réutilisables et traitement recommandé

| Élément repéré | Recommandation pour la future UI |
|---|---|
| MUI/Emotion, thèmes, icônes Material | Conserver comme base web tant que l’inventaire des thèmes et dépendances ne justifie pas une évolution. Clarifier tokens de couleur, typographie, espaces, rayons, élévation et états sémantiques. |
| Formulaire partagé, Formik/Yup, composants Select, champs configurables | Réutiliser; normaliser libellés, aide, validation visible au champ, erreurs serveur, sections et sauvegarde. Prévoir les formulaires longs en sections progressives. |
| `CustomDatagrid2`, TanStack Table, DataGrid MUI | Évaluer les variantes actuelles et réduire la fragmentation; définir un patron de liste (recherche, filtres, tri, densité, pagination, état vide, adaptation mobile). Ne pas remplacer avant audit des capacités réellement utilisées. |
| Modales, drawers et action sheets | Garder pour tâches courtes/contextuelles; mesurer les parcours qui comportent des formulaires longs ou des modales imbriquées. Sur mobile, vérifier clavier, focus, défilement et taille tactile. |
| `SuspenseLoader`, états Redux, `NoRowsMessageWrapper`, notifications | Standardiser les états chargement, contenu, vide, erreur, accès refusé et reprise. Les erreurs d’API ne doivent jamais être confondues avec un résultat vide. |
| Écrans statistiques et graphiques ApexCharts | Conserver la sémantique métier; uniformiser le choix de période, filtres, unités, chargement, vide, erreur et export. Vérifier contraste et lecture mobile. |
| Bibliothèque de tâches/checklists | Conserver le concept séparé de la saisie WO/PM; rendre statut d’enregistrement, ordre des opérations et réutilisation évidents lors du futur redesign. |
| React Native Paper et composants de terrain | Conserver une bibliothèque native et ses conventions; partager tokens et vocabulaire seulement, pas forcer des composants Web dans l’app native. |

### Constats et risques à tester visuellement

- Le projet a déjà des feedbacks de chargement et d’erreur à plusieurs niveaux, et des correctifs récents dédiés aux erreurs API. La présence de composants ne prouve pas la cohérence de tous les écrans. Le risque prioritaire reste l’API qui ne démarre pas, capable de produire des 502 globaux et états de chargement en cascade.
- L’interface PM cumule cadence, stratégie, packages, tâches et compteurs; c’est une charge cognitive confirmée par la structure de configuration, mais l’impact utilisateur doit être observé en test.
- La navigation étendue, les différents systèmes de tableaux et la répartition web/mobile justifient une consolidation progressive des patrons, pas une réécriture globale.
- Vérifier en navigateur à 1440 px, 1024 px et 390 px : débordement des tableaux et formulaires, menus, onglets, drawers, dates, confirmations de suppression et erreurs. Faire aussi un parcours clavier/focus et un contrôle des contrastes.
- Le précédent guide PM insiste déjà sur les formats numériques, le « valeur null/NaN », les messages de validation, l’état des boutons Save et la persistance après rechargement. Ces cas doivent être intégrés à la recette UI globale.
- Les captures pilotes du 3 octobre sont une base historique utile; elles ne suffisent pas pour conclure sur les changements postérieurs.

## Proposition de trajectoire

| Phase | Priorité | Travail | Critère de sortie |
|---|---:|---|---|
| 0 — Stabiliser et geler une baseline | P0 | Corriger les écarts Liquibase/JPA et démarrer API, web et base; tracer toutes les migrations appliquées. Conserver l’expérience actuelle comme référence. | API stable sans restart, health/config HTTP 200, login et accès multi-rôles, aucune erreur fatale en logs. |
| 1 — Recette MVP basée sur le pilote | P0 | Valider demandes → qualification/affectation → WO → travail terrain → relevés/pièces → clôture → historique; valider PM et rapports sur données réelles. | Guide pilote coché et résultats documentés; écarts bloquants triés. |
| 2 — Recherche UI/UX et baseline | P1 | Observer 3 rôles (demandeur, planificateur/responsable, technicien), mesurer parcours actuels, étudier au moins 5 références pertinentes de 2 sources, comparer 3 directions, définir la matrice responsive et accessibilité. | Rapport de recherche avec sources/liens, baseline et décision de direction avant maquette haute fidélité. |
| 3 — Prototype du flux principal | P1 | Prototyper travail/demande/WO et fiche équipement 360, vues desktop/tablette/mobile; tester avec utilisateurs sans données destructives. | Tâches choisies réussies par utilisateurs pilotes; interactions, erreurs et seuils d’acceptation documentés. |
| 4 — Socle visuel et shell | P2 | Tokens, navigation, en-tête, responsive shell, boutons/champs/états, tableaux et messages. Garder React web et React Native distincts. | Revue clavier/contraste et vues 1440/1024/390; aucun contrat API/permission changé. |
| 5 — Modules opérationnels | P2 | Appliquer les patrons à WO/demandes, actifs/emplacements, PM/compteurs, puis inventaire/achats et analytics selon priorité pilote. | Recette fonctionnelle et visuelle par module et rôle; parcours web-mobile alignés. |
| 6 — Branding final et diffusion | P3 | Appliquer identité validée, vérifier logos/couleurs/documents, préparer APK et distribution iOS selon canaux. | Marque approuvée et builds signés installables; mises à jour compatibles et documentation à jour. |

### Scénarios de référence pour établir la baseline

Ces seuils sont une proposition à confirmer avec les utilisateurs du pilote, conformément à `docs/design.md` (ne pas inventer un objectif unique pour toute l’application) :

1. **Technicien :** retrouver le WO assigné, consulter équipement et consigne, consigner temps/lecture/pièce, joindre une photo et soumettre/clôturer selon ses droits.
2. **Responsable :** qualifier une demande, créer ou lier un WO, choisir actif/priorité/équipe/échéance et vérifier le registre/historique.
3. **Planificateur :** configurer un PM simple, vérifier l’aperçu, générer/contrôler une occurrence et vérifier qu’aucun doublon ne se crée.
4. **Administrateur d’entreprise :** mettre à jour les informations entreprise/site et émettre un PDF dont le snapshot reste inchangé après modification ultérieure du profil.

Pour chaque tâche, relever succès/échec, nombre d’actions, durée, erreurs de saisie, retour après erreur, largeur d’écran et rôle. Les valeurs cibles doivent être définies après la première observation.

## Décisions de conception à garder

- Mon entreprise reste l’hypothèse produit validée; le site est un niveau opérationnel. Ne pas introduire d’interface multi-entreprise sans nouvelle décision.
- La navigation groupée de `docs/design.md` est une piste à comparer à la barre actuelle et à une navigation orientée tâches.
- La refonte ne doit pas modifier simultanément les règles PM, la sécurité, les contrats API, la licence et le vocabulaire métier.
- Les documents émis, la licence, les droits, l’i18n, les unités de mesure et les dates font partie du parcours UX; ils ne sont pas une couche cosmétique.
- Aucune recherche Dribbble/Behance/Mobbin nouvelle ni maquette n’a été conduite pour ce rapport : elle est planifiée en Phase 2, requise avant le redesign majeur par `docs/design.md`.

## Fichiers de référence à parcourir

- Produit et pilote : [`ORIENTATION-PRODUIT.md`](ORIENTATION-PRODUIT.md), [`PILOTE-MINE-CONVOYEUR.md`](PILOTE-MINE-CONVOYEUR.md)
- Politique design : [`design.md`](design.md)
- Préventif : [`BACKLOG-MAINTENANCE-PREVENTIVE.md`](BACKLOG-MAINTENANCE-PREVENTIVE.md), [`TESTS-PM-STRATEGIES-MULTICOMPTEURS.md`](TESTS-PM-STRATEGIES-MULTICOMPTEURS.md)
- Analytique : [`CORRECTION-RAPPORTS-CALENDRIER-2026-10-03.md`](CORRECTION-RAPPORTS-CALENDRIER-2026-10-03.md)
- Diagnostic API/CRUD : [`DIAGNOSTIC-CRUD-2026-10-03.md`](DIAGNOSTIC-CRUD-2026-10-03.md)
- État historique : [`ETAT-REPRISE.md`](ETAT-REPRISE.md)

## Conclusion de revue

Le projet a une base fonctionnelle riche et un travail MVP conséquent déjà codé. Son état de livraison demeure **non validé** tant que le backend ne démarre pas avec le schéma réel et que les parcours pilotes ne sont pas rejoués sur l’instance active. La refonte UI/UX est cadrée, mais sa première tâche est la recherche et le test du parcours pilote, pas le remplacement immédiat de l’interface.
