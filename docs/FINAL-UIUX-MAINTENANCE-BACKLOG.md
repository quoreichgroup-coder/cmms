### WEB — corriger le CRUD de l’historique d’arrêts d’équipement — 27 octobre 2026

- Le formulaire d’édition appelait l’action de création; corriger un arrêt pouvait donc poster un nouvel enregistrement. Il appelle maintenant l’action `PATCH /asset-downtimes/{id}` existante, met à jour le cache de l’équipement concerné et affiche l’erreur API localisée si la modification échoue. La création, les permissions et le contrat serveur restent distincts.
- Ce sont des arrêts observés (`AssetDowntime`), à garder séparés des futures fenêtres prévisionnelles du chantier SHUTDOWN-01, conformément au découpage SAP entre événement/fenêtre de maintenance et ordre d’entretien.
- `git diff --check` passe; aucun test ni build n’est lancé dans cette passe.

### API — borner les durées des arrêts d’équipement — 27 octobre 2026

- `AssetDowntime.getEndsOn()` calcule la fin avec `Math.toIntExact(duration)`. Une durée négative ou supérieure à `Integer.MAX_VALUE` secondes pouvait créer une plage invalide ou faire échouer sa sérialisation. La durée est maintenant validée entre zéro et la limite représentable; la date de début est obligatoire à la création.
- Le DTO de modification traite maintenant la durée omise comme absente (`Long`) et MapStruct ignore les propriétés `null`, pour qu’une mise à jour partielle ne remplace pas la date de début ou la durée déjà enregistrées.
- Compilation API `mvn -o -DskipTests compile` et `git diff --check` passent; aucun test automatisé n’a été exécuté.

### API — appliquer la portée site aux exports et aux statistiques PM — 27 octobre 2026

- Les exports de mouvements de pièces et de plans PM, ainsi que l’agrégat analytique des appels PM, vérifiaient le droit fonctionnel et la société, mais utilisaient encore l’ensemble des sites. Un compte limité pouvait donc exporter ou voir dans les totaux des données hors de sa portée.
- Les requêtes paginées et l’agrégat filtrent maintenant par site autorisé; les entrées historiques sans site restent accessibles conformément à `User.canAccessSite(null)`. Les utilisateurs avec accès à tous les sites gardent les requêtes globales; les mouvements d’inventaire non liés à un OT sont conservés.
- Compilation API `mvn -o -DskipTests compile` et `git diff --check` passent; aucun test automatisé n’a été exécuté.

### API — sécuriser la suppression d’un plan PM — 27 octobre 2026

- La suppression chargeait le plan par identifiant global et ne contrôlait que le droit métier `canBeDeletedBy`. Elle vérifie maintenant l’entreprise dans la requête, puis le site accessible avant d’arrêter le scheduler et de supprimer le plan. Un ID d’une autre entreprise retourne le même « not found » que les autres lectures tenant-scopées.
- Le droit de suppression existant, l’arrêt du scheduler et la suppression en cascade restent le parcours métier.
- Compilation API `mvn -o -DskipTests compile` et `git diff --check` passent; aucun test automatisé n’a été exécuté.

### API — tenant-scoper les lectures et l’historique d’un plan PM — 27 octobre 2026

- Le détail du PM et le déclenchement manuel d’OT pouvaient charger par ID global avant de vérifier droits/site; l’endpoint des OT récents utilisait aussi `.get()` et renvoyait une erreur serveur si le plan était absent. Ces parcours résolvent maintenant le PM dans la société, vérifient les mêmes droits/site, et renvoient « not found » pour un ID manquant ou d’un autre tenant.
- Le report d’un appel de calendrier contrôlait le tenant et le droit de modification, mais pas le site du plan. Il vérifie désormais aussi le site autorisé avant d’ajuster la date et de recréer le job planifié.
- La recherche de l’historique des OT et son ordre métier ne changent pas; elle s’effectue après validation du PM parent.
- Compilation API `mvn -o -DskipTests compile` et `git diff --check` passent; aucun test automatisé n’a été exécuté.

### API — borner le CRUD des arrêts à l’entreprise et au site — 27 octobre 2026

- Les routes de lecture, création, modification et suppression d’un arrêt suivaient la permission de l’actif sans toujours borner l’actif à la société ou vérifier le site. La lecture passe maintenant par le contrôle tenant/site central de l’actif; les mutations résolvent l’actif dans la société du demandeur et contrôlent aussi son site avant d’utiliser la permission d’édition existante.
- Le CRUD d’arrêt reste attaché à l’actif; cette validation ne modifie ni les dates métier ni les données mobiles.
- Compilation API `mvn -o -DskipTests compile` et `git diff --check` passent; aucun test automatisé n’a été exécuté.

### API — borner le CRUD et l’approbation des PO à l’entreprise — 27 octobre 2026

- Les endpoints de lecture, édition, approbation et suppression des bons d’achat chargeaient le bon par identifiant global. Ils résolvent maintenant le PO dans la société active; le verrou pessimiste d’approbation applique aussi ce filtre avant toute mise à jour de stock.
- Les droits fonctionnels et l’effet de stock historique de `respond(approved=true)` restent inchangés. Ce correctif d’isolation ne met pas en place les réceptions; elles restent séparées conformément au cadrage SAP/QPM.
- Le PATCH utilise aussi désormais la sémantique partielle : une propriété absente/null conserve la valeur actuelle au lieu d’effacer les données de livraison ou le fournisseur par inadvertance.
- Lors d’approbations de PO concurrentes contenant la même pièce, chaque stock est maintenant chargé sous verrou d’écriture et les lignes sont traitées par ID croissant. Consommation OT, restock et PATCH de quantité verrouillent la même ligne de pièce, ce qui évite d’écraser une mise à jour concurrente.
- Le service de modification et de suppression relit maintenant le bon avec le filtre société, au dernier point avant sauvegarde/suppression; il ne retombe plus sur un chargement global par ID après le contrôle du contrôleur.
- Compilation API `mvn -o -DskipTests compile` et `git diff --check` passent; aucun test automatisé n’a été exécuté.

### API / PROC-02 — poser l’identité externe des objets d’achat — 27 octobre 2026

- Ajout du registre `integration_object_reference`, unique par entreprise, provider, type d’objet et identifiant externe, avec une référence locale QPM distincte et indexée. `IntegrationObjectReferenceService` normalise provider/type, retourne la correspondance existante lors d’une répétition et refuse le réattachement d’une référence déjà liée (`409`). Migration Liquibase additive intégrée au master.
- Ajout du reçu d’événement `integration_event_receipt` unique par entreprise/provider/clé idempotente, avec SHA-256 du payload, état, compteur de tentatives et code d’échec non sensible. Le service refuse une même clé pour un autre type/contenu, verrouille les reçus existants pendant les décisions de reprise et permet de réclamer à nouveau les événements échoués; un doublon déjà actif/terminé n’est pas autorisé à retraiter.
- Aucun endpoint, connecteur SAP, événement réellement consommé ou effet de stock n’est ajouté. Ces primitives et leurs limites sont consignées dans `PROCUREMENT-SAP-ARCHITECTURE.md`.
- L’insertion simultanée d’une même référence externe est maintenant tranchée par l’unicité en base; après conflit, le service relit le gagnant et retourne le mapping identique ou un `409` si l’objet local diffère. La tentative d’insertion est isolée dans une transaction `REQUIRES_NEW` pour que la collision n’abîme pas la transaction appelante. Avant un consommateur actif, restent à faire : reprise sûre des collisions d’événements, bail/lease après crash en `PROCESSING`, politique de rétention/purge, endpoint authentifié et adaptateur ERP.
- Compilation API `mvn -o -DskipTests compile`, validation XML des deux changelogs et `git diff --check` passent; aucun test automatisé n’est exécuté.

### API — notifications d’achat réservées aux comptes actifs — 27 octobre 2026

- Le filtre des destinataires appliquait `isEnabled` aux comptes avec SETTINGS, mais pas aux Limited Admins. Les notifications e-mail et in-app de nouveau PO excluent maintenant les comptes désactivés dans les deux cas.
- Le groupe destinataire conserve les comptes actifs autorisés par les rôles déjà pris en charge.
- Compilation API `mvn -o -DskipTests compile` et `git diff --check` passent; aucun test automatisé n’a été exécuté.

### API — valider fournisseur et catégorie des PO dans le tenant — 27 octobre 2026

- La création et la modification d’un bon pouvaient recevoir des références fournisseur/catégorie résolues par ID sans prouver qu’elles appartiennent à la société active. Le serveur résout désormais ces relations dans le tenant avant la sauvegarde et rejette les références étrangères ou inexistantes.
- Le contrat continue d’accepter les objets existants avec leur ID; l’API remplace la référence reçue par l’entité canonique de la société.
- Les routes individuelles de lecture, édition et suppression d’une catégorie PO appliquent aussi le périmètre `CompanySettings` du demandeur avant les droits fonctionnels.
- Le service conserve maintenant ce même périmètre au dernier point avant la mise à jour/suppression; il ne recharge plus une catégorie par ID global après le contrôle du contrôleur.
- À la création, le service remplace aussi la relation `CompanySettings` reçue dans le corps par celle du compte authentifié; un client ne peut donc pas créer une catégorie dans un autre tenant en falsifiant cette relation.
- La mise à jour rejette désormais aussi un nom déjà utilisé par une autre catégorie du même tenant, tout en permettant de conserver le nom de la catégorie elle-même.
- Création et édition réutilisent maintenant le nettoyage de catégorie déjà appliqué aux autres référentiels; le contrôle de doublon s’effectue donc sur le nom nettoyé qui sera réellement persisté.
- Les lectures et mutations de lignes `PartQuantity` rattachées à un PO vérifient maintenant la société du PO parent; création et remplacement des lignes chargent le bon par société.
- Les routes des lignes liées aux OT bornent aussi le parent à la société et au site. Les PATCH/suppressions appliquent maintenant l’écriture à la ligne déjà vérifiée, sans relecture globale par ID dans le service.
- La lecture, la modification et la suppression des fournisseurs résolvent également le fournisseur dans l’entreprise du demandeur avant d’appliquer les permissions; le chemin non-client garde la lecture existante par ID.
- Compilation API `mvn -o -DskipTests compile` et `git diff --check` passent; aucun test automatisé n’a été exécuté.

### API / SAP — protéger les commandes approuvées — 27 octobre 2026

- L’approbation du PO crédite encore le stock dans le flux historique. Une suppression physique ultérieure laisserait ce stock sans document d’achat auditable.
- La suppression relit maintenant le PO sous verrou et répond `409 Conflict` s’il est déjà `APPROVED`; les commandes en attente ou rejetées restent supprimables selon les permissions existantes. Une annulation/réversion explicite attend le futur modèle de réception et de mouvements de stock.
- Après approbation, PATCH du PO et toutes les voies d’ajout, édition ou suppression des lignes `PartQuantity` répondent aussi `409 Conflict`. Ces mutations verrouillent le parent PO, comme l’approbation, afin qu’une modification concurrente ne passe pas pendant le crédit du stock.
- La création ignore maintenant un statut `APPROVED` éventuellement injecté dans le modèle reçu et enregistre toujours `PENDING`. La transition des workflows a depuis été unifiée avec `/respond` dans le lot « API / SAP — unifier l’approbation PO manuelle et workflow » ci-dessus.
- Compilation API `mvn -o -DskipTests compile`, validation XML de la migration d’intégration et `git diff --check` passent; aucun test automatisé n’a été exécuté.

### WEB — registre des appels PM adapté au téléphone — 27 octobre 2026

- Les lignes du registre placent maintenant date/ordre puis statut/action de report en deux niveaux sur petit écran, au lieu de comprimer ces éléments sur une seule rangée. La fenêtre de report s’ouvre en plein écran sur téléphone avec des marges réduites.
- Pagination, ordre des données, permissions et endpoints ne changent pas. `git diff --check` passe; aucun test ni build lancé. Recette visuelle responsive requise.

### WEB — détails PM plein écran sur téléphone — 27 octobre 2026

- Le panneau détail PM occupe désormais toute la largeur sur téléphone. Le padding diminue aux petits breakpoints, le nom long revient à la ligne et les actions s’alignent sur plusieurs lignes si nécessaire. Les onglets et registres conservent leur comportement actuel.
- Aucun changement métier ou API. `git diff --check` passe; aucun test ni build lancé. Recette visuelle à différentes largeurs requise.

### WEB — formulaires PM adaptatifs — 27 octobre 2026

- Les fenêtres d’ajout et de modification des plans PM passent en plein écran sous le breakpoint tablette. Les marges internes diminuent sur téléphone pour conserver une zone de saisie confortable et scrollable.
- Les champs restent en une colonne; les règles PM, l’envoi, la gestion des erreurs et la confirmation de brouillon ne changent pas. `git diff --check` passe; aucun test ni build n’a été exécuté. Recette visuelle responsive à faire.

### WEB — revue PM / OT et état fiable des formulaires — 26 octobre 2026

- Revue SAP PM : le chemin QPM conserve bien la séparation plan/cycle → occurrence d’appel → ordre de travail; les opérations et tâches fournissent le contenu de l’ordre. Le registre des appels reste distinct de l’historique des OT, cohérent avec le parcours SAP documenté.
- Le formulaire de création PM gardait la forme « propre » avant upload et enregistrement réussis. L’état n’est maintenant réinitialisé qu’après confirmation serveur, afin qu’un échec conserve la protection contre la fermeture avec brouillon.
- L’événement analytique `first_wo_creation` était émis avant la réussite de la requête. Il ne part maintenant qu’après la création de l’OT confirmée.
- Vérification : TypeScript Web, ESLint ciblé et Prettier passent; aucun test automatisé lancé.
- La séparation en deux appels créait un enregistrement partiel possible si la fiche échouait après la synchronisation des tâches. Les formulaires PM et OT transmettent maintenant tâches + fiche dans un seul PATCH; la synchronisation des tâches, la validation des références du plan et la sauvegarde parent rejoignent la transaction serveur. Les tâches OT gardent la protection contre la suppression d’une ligne avec preuve d’exécution.
- Vérification : TypeScript Web, ESLint ciblé, Prettier, compilation Java (`mvn -q -DskipTests compile`) et `git diff --check` passent. Les images API/frontend ont été construites puis les conteneurs recréés; Spring Boot est démarré et le frontend/proxy répond HTTP 200 avec le bundle `main.7c2df193.js`. Aucun test automatisé exécuté.

### WEB/API — portée multi-site Users Management — 26 octobre 2026

- Les utilisateurs ont maintenant un accès explicite « tous les sites » ou une liste de sites de leur entreprise, avec migration Liquibase. Les comptes déjà existants gardent l’accès global; les enregistrements opérationnels historiques sans site restent visibles.
- L’interface People permet de modifier cette portée pour un autre compte lorsqu’on a la permission d’administration. L’API valide la société des sites, empêche un administrateur limité d’accorder un site hors de sa propre portée, filtre les recherches/listes mini, protège les opérations CRUD de compte et contrôle les lectures/écritures d’actifs, OT, PM et demandes. Les invitations héritent maintenant de la portée de l’invitant et la transmettent à l’inscription.
- Export d’actifs/OT et événements PM appliquent également la portée. Compilation Java `mvn -DskipTests compile`, typecheck `npx tsc --noEmit --pretty false`, validation XML Liquibase et `git diff --check` réussis; aucun test automatisé lancé. Images Docker API/frontend reconstruites et services recréés; Liquibase a appliqué les deux changesets, Spring Boot a démarré, le frontend/proxy répond HTTP 200 avec `main.c142d355.js`.
- Référence métier : garder l’entreprise comme frontière, les sites comme portée d’accès et les rôles comme permissions fonctionnelles, sans déduire un site à partir de la localisation. Les sites des comptes existants nécessitent une affectation explicite par un administrateur.
- Analyse RBAC : aujourd’hui chaque utilisateur porte un rôle unique dont les permissions sont des ensembles d’actions (`create`, `view`, `viewOther`, `editOther`, `deleteOther`); une équipe regroupe des utilisateurs et des actifs/localisations, mais ne doit pas devenir une permission implicite. Garder ce RBAC lisible, ajouter une portée de données séparée (entreprise → sites autorisés), puis centraliser une décision `permission + portée + cible` réutilisée par contrôleurs et services. Les changements d’équipe doivent rester distincts des changements de rôle et de portée site.
- Suite livrée le 26 octobre : édition People expose prénom, nom, téléphone et profession; le PATCH User ignore les propriétés absentes et journalise les champs changés. Les confirmations désactivation/activation/suppression n’affichent le toast succès qu’après réponse réussie, et la suppression UI appelle la route PATCH `/users/soft-delete/{id}`. Rôles non supprimables lorsqu’ils sont attribués; les permissions SETTINGS sont exigées pour leurs mutations. Propriétaire et dernier administrateur actif protégés des changements de rôle, désactivation et suppression. Teams filtrées par portée membre; création recharge les membres depuis la société, et lecture/modification/suppression valident tenant et portée. Audit des mutations USER/ROLE/TEAM ajouté.
- Garde-fou ajouté : désactivation et suppression sont refusées avec HTTP 409 lorsqu’un compte reste affecté à un OT actif (ouvert, en cours ou en pause), directement ou via une équipe. Le contrôle est borné à la société du demandeur et autorise l’opération après réaffectation ou clôture de l’OT.
- Création People : le formulaire permet maintenant de générer un mot de passe aléatoire de 20 caractères via Web Crypto, puis de le vérifier avant l’envoi du formulaire. Les invitations e-mail échouent explicitement si les notifications sont désactivées; leur envoi est maintenant synchrone pour remonter les erreurs SMTP/SendGrid, supprime l’invitation créée si l’envoi échoue et encode correctement l’adresse dans le lien.
- Complément de portée multi-sites — compteurs : les recherches, mini-listes et exports appliquent maintenant le site de l’équipement lié; les détails, lectures, histogrammes, création/modification/suppression de relevés et mutations des déclencheurs vérifient également la société et la portée site. La création d’un compteur valide l’équipement dans la société et la portée de l’acteur; le lieu associé doit appartenir à la société. La compilation API `mvn -o -DskipTests compile` réussit. Les tests automatisés n’ont pas été lancés.
- CRUD plans au sol : la création exige maintenant le droit de création sur les emplacements, et valide que l’emplacement parent appartient à la société et est visible par l’acteur. La suppression requiert le droit de suppression effectif sur l’emplacement parent; la modification conserve son contrôle d’édition. `FloorPlan` ne porte aucune relation directe avec `Site`; aucune portée site n’est donc déduite du nom ou de la localisation.
- Portée des affectations d’opérations : à la création ou au remplacement d’une définition de tâche depuis un OT ou un plan PM, l’API vérifie maintenant que l’acteur peut accéder aux sites de l’utilisateur affecté, de l’équipement et du compteur référencés. Les modèles de listes de tâches partagés restent validés à l’échelle société et ne sont pas restreints à un site.
- Affectations indirectes par workflow : l’exécution vérifie maintenant que le workflow et l’OT/la demande sont de la même entreprise; une équipe n’est affectée que si elle appartient à cette entreprise et que chacun de ses membres peut accéder au site cible. Une affectation incompatible est ignorée et journalisée, sans modifier le reste du workflow.
- Affectations directes OT/demandes : les API de création et modification résolvent maintenant l’équipe, le responsable principal et les intervenants dans la société de l’acteur, puis vérifient leur portée par rapport au site de travail (ou au site de l’équipement lié si le site du dossier est absent). Les équipements sont eux aussi résolus dans la société et la portée autorisée; les routes et les champs utilisés par Web/mobile restent inchangés.
- Portée inventaire : les affectations de pièces aux utilisateurs et aux équipes sont maintenant résolues dans l’entreprise et limitées aux comptes/équipes dont la portée est compatible avec celle de l’acteur. Les vues de recherche et listes mini incluent les pièces créées ou explicitement affectées à l’utilisateur tout en conservant les permissions existantes; le catalogue et les stocks restent partagés à l’échelle entreprise, car `Part` ne porte pas de site. Les routes et modèles API utilisés par le mobile ne changent pas.
- Intégrité des lignes de pièces OT/achats : chaque ligne API doit maintenant porter exactement un parent, la pièce est résolue dans l’entreprise et les OT vérifient aussi la portée site. Les droits sont contrôlés avant de consommer/modifier le stock; remplacement de lignes, création, modification et suppression sont transactionnels pour éviter les mouvements partiels. Les doublons de pièce dans le remplacement d’une liste sont refusés. Compilation Maven hors tests et `git diff --check` réussis; aucun test automatisé lancé. Le problème distinct de réception partielle et de mise à jour d’une commande déjà approuvée reste ouvert et n’a pas été masqué par ce correctif.
- Reste à faire pour Users Management : faire une recette authentifiée avec deux comptes/sites réels. Les invitations n’ont pas encore d’écran de portée distincte : elles reprennent volontairement celle de l’invitant. Email reste non éditable dans People; changement de portrait utilisateur disponible depuis le profil utilisateur.
- Vérification du garde-fou : compilation Java `mvn -q -DskipTests compile` et `git diff --check` réussis; aucun test automatisé lancé.

### WEB — date active visible dans le registre d’appels PM — 26 octobre 2026

- Après un report, le registre affiche maintenant l’échéance effective en premier et conserve la date initiale comme repère. Un report ultérieur reprend l’échéance actuelle pour garder l’heure locale de l’occurrence et éviter de repartir de l’ancienne date.
- Vérification : TypeScript Web, ESLint ciblé et Prettier passent. Aucun test automatisé exécuté. Build CRA réussi; bundle `main.af13a19c.js` actif, conteneur frontend recréé et HTTP 200; API restée en ligne.

# QPM — Backlog UI/UX final et modules de maintenance

### WEB — ignorer les réponses PM obsolètes sur le tableau de bord — 26 octobre 2026

- Si la période du tableau de bord change pendant le chargement des appels PM, une réponse de l’ancienne période ne peut plus écraser les lignes du graphique, son erreur ni son état de chargement. Le bouton de nouvelle tentative utilise le même contrôle de requête.
- Aucun indicateur ni règle de maintenance n’a changé. TypeScript Web, ESLint ciblé, Prettier ciblé et `git diff --check` passent. Le rebuild frontend a réussi (bundle `main.1ec160b1.js`) et le conteneur frontend répond HTTP 200; l’API est restée en ligne. Aucun test automatisé exécuté; la recette authentifiée des graphiques reste à faire avec un compte de test. Chrome 156 est maintenant installé : les captures publiques de la connexion ont été vérifiées aux largeurs 375, 768 et 1440 px; recette des graphiques authentifiés encore à faire avec un compte de test.

### WEB — états fiables du sélecteur de listes de tâches — 26 octobre 2026

- Le sélecteur de listes réutilisables distingue maintenant le chargement, une erreur réseau relançable et une bibliothèque effectivement vide. Une liste ne peut être choisie que lorsque les enregistrements sont chargés. Les traductions EN/FR sont disponibles.
- Le chargement initial absorbe aussi le rejet de la promesse après avoir enregistré l’état d’erreur, sans bruit de rejet non géré dans la console. Les listes déjà en cache restent sélectionnables pendant une actualisation ou après l’échec de celle-ci; l’erreur et la relance restent visibles.
- Vérification : `npx tsc --noEmit --pretty false`, ESLint ciblé, Prettier et `git diff --check` passent. Inclus dans le build Docker frontend final CRA (`Compiled successfully`), bundle `main.bf392ce4.js`, image `atlas-cmms-frontend:local`, manifest `506e499eb89670914696e5662ddebef81618848ff68c3f29a6414a1ad0cef05c`. Le conteneur frontend a été recréé et le proxy sert ce bundle. Chrome est maintenant installé; les captures de connexion publiques sont vérifiées, la recette visuelle authentifiée reste à faire avec un compte de test.

### WEB — navigation accessible du calendrier de capacité — 26 octobre 2026

- Les boutons de semaine précédente/suivante du calendrier d’exceptions ont maintenant des noms accessibles localisés EN/FR. Le calendrier conserve sa navigation et ses dates existantes.
- Vérification : TypeScript Web, ESLint ciblé, Prettier et `git diff --check` passent. Build Docker frontend réussi avec CRA (`Compiled successfully`), bundle `main.bf392ce4.js`, image `atlas-cmms-frontend:local`, manifest `506e499eb89670914696e5662ddebef81618848ff68c3f29a6414a1ad0cef05c`. Seul le conteneur frontend a été recréé; l’index servi par Nginx référence `main.bf392ce4.js` et ce bundle répond HTTP 200. L’essai visuel authentifié demeure bloqué parce que Chrome stable n’est pas installé. Cette amélioration ne change ni la capacité enregistrée ni les règles d’affectation. Référence SAP : capacités disponibles consultées par période, en gardant séparés le calendrier individuel et le roster d’équipe.

### WEB — statistiques capacité regroupées par période — 26 octobre 2026

- La page Statistiques capacité propose maintenant une granularité par jour, semaine ISO ou mois, indépendamment de la fenêtre de 7/30/90 jours. Les heures disponibles et allouées sont additionnées par période et le taux est recalculé sur les totaux, sans moyenne de pourcentages journaliers. Les libellés EN/FR et le résumé accessible du graphique suivent le nombre réel de périodes affichées.
- Les données restent celles de l’API Resource Planning et reflètent la capacité et les affectations actuelles; les seuils, permissions et règles de capacité ne changent pas. Alignement SAP : la lecture agrégée demeure distincte de la capacité disponible et de l’affectation planifiée, comme le cadrage SAP de capacité référencé dans la phase Shift Roster ci-dessous.
- Vérification : TypeScript Web, ESLint ciblé, Prettier ciblé et `git diff --check` passent. Build Docker frontend réussi avec CRA (« Compiled successfully »); bundle `main.673b2c71.js`, image `atlas-cmms-frontend:local`, manifest `20d6e3055675a62d4c1ec155bffe8eb96a58dad705534f0ce1f2b2f83e11119d`. Aucun service redémarré; la recette visuelle navigateur reste ouverte car Chrome n’est pas installé dans l’environnement.

### WEB — palette stable et légende du graphique PM — 26 octobre 2026

- Le graphique en secteurs attribuait sa couleur par position après avoir retiré les statuts à zéro; une couleur pouvait donc changer de signification selon la période. La palette est maintenant liée au statut métier et les noms sont présentés dans une légende au lieu d’étiquettes de part potentiellement chevauchées.
- TypeScript Web, ESLint ciblé, Prettier ciblé et `git diff --check` passent. CRA compile avec succès; image `atlas-cmms-frontend:local` reconstruite avec le bundle `main.271a5c79.js`, manifest `88be4afa60d323597a065ed3f519993e8a1e6b25dec082d606af5d240e602be2`. Aucun service n’a été redémarré; Chrome manque pour la recette visuelle.

### API — protéger les workflows lors de la suppression d’une liste de tâches — 26 octobre 2026

- L’audit des relations a révélé deux suppressions en cascade dangereuses : `WorkflowAction.checklist_id` pouvait supprimer l’action d’automatisation et son workflow, et `Checklist.taskBases` pouvait effacer les bases auxquelles des tâches d’OT/PM historiques font référence. La suppression est refusée en HTTP 409 tant qu’un workflow la référence; le contrôle applicatif donne un message précis et la nouvelle contrainte SQL protège aussi contre une course concurrente. Les associations d’un modèle vers ses `TaskBase` ne sont plus orphelinées lors d’une édition/suppression : les anciennes définitions restent disponibles aux tâches historiques, tandis que l’édition crée des définitions fraîches pour le modèle.
- Alignement SAP : SAP décrit la liste de tâches comme les étapes, pièces et outils de travail à affecter à un élément de maintenance, et permet d’assigner une liste existante ou d’en créer une ([SAP — Manage Maintenance Plans](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/f0e9632b0e654fbeae597bad6abb823c.html)). QPM conserve cette séparation : la suppression d’un modèle ne doit pas effacer silencieusement une automation qui le référence ni les tâches d’exécution qui gardent sa définition.
- Pour les nouvelles associations de tâches, les IDs d’utilisateur, d’équipement et de compteur sont maintenant résolus par des recherches limitées à la société courante. Un ID invalide ou étranger ne crée plus une tâche amputée de son affectation; l’API retourne un code fonctionnel identique pour éviter de révéler les données d’une autre société. L’interface distingue désormais un échec de chargement de la bibliothèque d’une bibliothèque vide et permet de réessayer; le refus de suppression d’une liste liée à un workflow reste localisé.
- Une réponse de chargement commencée avant une mutation locale ne peut plus restaurer une ligne supprimée ou écraser une édition : le store prend une révision à la requête, relit l’API si la révision a changé, puis remplace la bibliothèque avec l’instantané courant. Les requêtes en vol sont également invalidées à la déconnexion/changement de compte; les réponses d’un ancien compte ne repeuplent pas les listes du compte suivant.
- Compilation API `mvn -o -DskipTests compile` réussie; typecheck, ESLint ciblé, Prettier et `git diff --check` réussis. Le build frontend consolidé réussit avec `NODE_OPTIONS=--max_old_space_size=1536`, sourcemaps désactivées : bundle `main.aa814c5a.js`, chunk des messages `2630.b1172c5a.chunk.js`; l’artefact contient le message d’erreur des références et les états de chargement EN/FR. Les images locales `atlas-cmms-backend:local` et `atlas-cmms-frontend:local` sont reconstruites. Pour le build Docker frontend, le heap a été augmenté à 2,5 Go; CRA a compilé avec succès et l’image a été exportée (manifest `2d29fc72923721d3c79966d5d593a22dceb3d8e21c9cba83e7931b92564973ce`). Le `Dockerfile` conserve `--max_old_space_size=2560` pour que les prochains builds reproduisent ce résultat. Aucun service n’a été redémarré, l’image construite n’est donc pas encore servie. L’essai de recette Chromium de cette session a échoué avant ouverture de page : l’exécutable Chrome stable attendu par l’outil n’est pas installé. L’application Liquibase sur une base de développement n’a pas été effectuée. La recette d’un workflow utilisant une liste, puis de son retrait/remplacement avant suppression, reste nécessaire.

### API — conserver l’exécution quand on modifie les tâches d’un OT — 26 octobre 2026

- L’édition identifie maintenant chaque tâche d’OT avec son identifiant d’exécution (`workOrderTaskId`), distinct de l’identifiant de modèle `TaskBaseDTO.id`. Quand sa définition change, l’API crée une nouvelle définition et rattache la ligne existante; valeur, notes, photos et identifiant d’exécution sont conservés. La recherche est limitée aux tâches de l’OT déjà autorisé. Une tâche peut être retirée seulement si elle n’a ni réponse exécutée, ni note, ni photo; sinon l’API retourne 409 et annule la mise à jour. Les PM et anciens clients gardent la correspondance historique par définition.
- Alignement SAP : une modification descriptive ne doit pas effacer une confirmation déjà enregistrée ([SAP — Completion Confirmation](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/18f4b853dcfcb44ce10000000a174cb4.html)). La valeur reste conservée en cas de changement de type; valider avec l’équipe métier comment rendre une telle modification visible dans l’historique.
- Compilation Maven locale et builds Docker API/frontend réussis. Le build consolidé du 26 octobre produit `main.aa814c5a.js`; le build Docker frontend final compile `main.2509bc9c.js` et exporte l’image `atlas-cmms-frontend:local`. Les changements récents de la bibliothèque de listes et de conservation de l’exécution sont maintenant dans le build. À faire ensuite : confirmer la politique produit pour un changement de type après saisie et recette API authentifiée. Aucun test automatisé exécuté.

### WEB — expliquer le verrouillage des étapes avec preuves — 26 octobre 2026

- La fenêtre de modification d’un OT avertit maintenant quand des résultats, notes ou photos sont enregistrés; l’erreur de retrait bloqué dispose d’un libellé localisé distinct du conflit générique. Le build Docker frontend final inclut ces changements ainsi que ceux de la bibliothèque de listes. La recette authentifiée reste à faire.

### WEB — protéger l’édition de capacité individuelle pendant l’enregistrement — 26 octobre 2026

- Les commandes de capacité (jour type, exceptions de la semaine, navigation de semaine et changement d’onglet) restent maintenant verrouillées pendant la requête de sauvegarde. Avant, le modal pouvait être modifié pendant l’envoi puis se fermer au retour réussi, en perdant les changements saisis après le début de la requête.
- Aucun calendrier de poste, pause ou règle de capacité supplémentaire n’est inféré. Alignement SAP : maintenir la capacité d’une personne disponible dans sa plage calendaire, sans confondre ce réglage avec un roster d’affectation. Build frontend de production réussi; frontend et proxy servent `main.c08f57ae.js`, et l’image du conteneur correspond à `atlas-cmms-frontend:local`.

### WEB — UX-06, action Annuler du formulaire partagé — 26 octobre 2026

- Le bouton optionnel `onCanceled` du formulaire partagé était inactif (toujours désactivé, callback jamais appelé). Il déclenche maintenant le callback, porte le libellé localisé « Annuler » et n’active pas la soumission du formulaire; seul l’envoi en cours le désactive. Aucun écran ne passe encore cette propriété.
- Build de production réussi, image `atlas-cmms-frontend:local` et service frontend recréés. Le proxy et le frontend servent tous deux `static/js/main.7af811eb.js`, identique au bundle compilé. Aucun test n’a été ajouté ni exécuté.

### WEB — Dashboard capacité, période mois à date — 26 octobre 2026

- Le bouton et la sous-légende du graphique Capacity précisent maintenant que la période va du début du mois à aujourd’hui; le dernier total hebdomadaire peut être partiel. Les données et les bornes de requête restent inchangées. Cela explique l’arrêt du graphique au jour courant.
- L’unité de mesure des compteurs s’affiche dans le badge et le champ de la checklist OT. L’action de joindre des photos et l’explication d’offre sont localisées EN/FR.
- Les notes utilisent des mises à jour d’état fonctionnelles; une tâche retirée avant une mutation ne produit pas d’accès à une référence absente. Compilation de production réussie, frontend recréé et hash vérifié aussi via `atlas_nginx` : `main.7af811eb.js`.

### WEB — checklist d’exécution OT, UX-04 — 25 octobre 2026

- La commande de pièces jointes de la checklist localise maintenant son nom accessible et l’explication d’offre requise en français et en anglais; le libellé anglais codé en dur a été retiré. Compilation frontend consolidée en cours.
- Les mises à jour rapides d’état notes sont fonctionnelles; une tâche disparue entre le rendu et l’enregistrement des notes/photos ne déclenche plus d’accès invalide. Code modifié après la copie du contexte Docker; recompilation consolidée requise.

- Le détail OT présente maintenant la checklist même quand la réponse chargée est vide, distingue le chargement initial et l’échec relançable, et expose une progression calculée à partir des valeurs réellement enregistrées. Les sous-tâches ne comptent comme terminées qu’avec l’état `COMPLETE`; les autres types comptent comme renseignés lorsqu’une valeur existe.
- La modification d’une tâche affiche son état d’enregistrement et restaure la valeur précédente si l’API échoue. Les champs texte/nombre se resynchronisent avec la valeur relue et déclenchent leur sauvegarde à la sortie du champ. L’état d’ouverture des notes et pièces jointes suit les tâches rechargées; un seul contrôle nommé ouvre ce panneau. Les images s’ouvrent au clavier et portent un libellé accessible. Les lignes identifient aussi leur type (inspection, relevé, texte, numérique ou choix multiple) avant saisie; les relevés compteur affichent l’unité fournie avec le compteur dans le badge et le libellé du champ. Les anciennes tâches sans choix optionnels ni association compteur ne font plus planter la ligne.
- Référence SAP : une confirmation d’exécution documente le statut et l’avancement des opérations, ainsi que les relevés et matériaux associés ([SAP — Completion Confirmation](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/18f4b853dcfcb44ce10000000a174cb4.html)). La liste Fiori met en avant l’identifiant, les attributs clés et le statut d’un objet ([SAP Fiori — Object List Item](https://experience.sap.com/fiori-design-web/object-list-item/)). QPM garde ici ses valeurs et contrats actuels; l’indicateur de checklist ne remplace ni la confirmation de temps ni la clôture métier SAP.
- Le build optimisé compilé et déployé le 26 octobre couvre la synchronisation, l’accessibilité, la sauvegarde au blur, les badges de type, l’unité du compteur, les libellés EN/FR et les garde-fous Notes/photos. Une compilation ultérieure a livré le payload d’identité de tâche dans `4119.8e26c430.chunk.js`; le proxy et le conteneur le servent. Recette visuelle authentifiée toujours requise.

### API — planifier une OT aujourd’hui dans le temps de poste restant — 25 octobre 2026

- L’ordonnanceur pouvait positionner une nouvelle OT au début du poste, même si cette heure était déjà passée, et le chemin sans OT concurrente ne vérifiait pas que la durée finissait avant la fin du poste. Pour la date du jour, le premier créneau commence maintenant au plus tôt à l’heure actuelle dans le fuseau de l’entreprise; chaque créneau candidat doit tenir avant la fin de la capacité configurée. Les capacités journalières restent des minutes consécutives à partir de l’heure de début; pauses et postes fractionnés ne sont pas déduits.
- Compilation API réussie; l’image locale `atlas-cmms-backend:local` a été reconstruite avec ce correctif et le rafraîchissement du registre stratégie. Aucun test fonctionnel ni redémarrage des conteneurs n’a été effectué.

### API — rafraîchir le registre après un seuil stratégie ignoré — 25 octobre 2026

- Lorsqu’aucun package n’est dû, le seuil traité est maintenant marqué ignoré, le seuil suivant est avancé et les échéances planifiées sont synchronisées immédiatement. Compilation API réussie; image locale reconstruite. Les conteneurs en cours gardent leur image antérieure jusqu’à leur redémarrage.

### API — ne déclencher qu’après un seuil compteur atteint — 25 octobre 2026

- Le calcul d’ordinal utilisait un arrondi au plus proche : un relevé à 60 % d’un intervalle pouvait donc déclencher prématurément le cycle suivant d’un plan à stratégie. Le calcul compte désormais les intervalles entièrement atteints et tolère seulement l’erreur de représentation au voisinage exact d’un seuil décimal.
- Compilation API locale et compilation Maven dans l’image réussies; `atlas-cmms-backend:local` reconstruit. Aucun test fonctionnel ni redémarrage de conteneur n’a été effectué. La règle de rattrapage de plusieurs seuils franchis dans un seul relevé reste à confirmer avec le site pilote.

### WEB — cohérence de la capacité individuelle non configurée — 25 octobre 2026

- L’éditeur affichait 8 h par jour lorsqu’aucune configuration n’existait, tandis que Workload comptait cette personne à 0 minute. Les jours absents sont maintenant à 0 et désactivés; un message explique qu’il faut définir les jours puis enregistrer. Une exception de date reprend la capacité du jour hebdomadaire correspondant au lieu d’introduire arbitrairement 8 h.
- Aucun horaire de début, pause, rotation ou règle d’équipe n’est supposé. Cela reste cohérent avec la référence SAP, qui distingue la capacité productive et les calendriers de shifts; QPM ne persiste actuellement que des minutes disponibles par jour/date. TypeScript et le build de production frontend passent; la recette visuelle/authentifiée reste à faire. Source : [SAP — Available Capacities](https://help.sap.com/docs/SAP_ERP/f9ecce75e3bc4f94b5ebab70731a9a75/4a73b65334e6b54ce10000000a174cb4.html).

### WEB — validation des limites de capacité journalière — 25 octobre 2026

- Les champs heures/minutes acceptent maintenant uniquement des entiers et limitent leur combinaison à 24 h, conformément au plafond API de 1 440 minutes/jour. Le réglage des heures et des minutes reste possible sans permettre une valeur que le backend rejetterait. La vérification Workload reste côté serveur; le frontend améliore seulement la saisie.

### WEB — destinations Workload sans capacité — 25 octobre 2026

- Une journée à capacité nulle n’accepte plus le dépôt d’un nouvel OT dans Workload; une courte mention explique la raison. Les OT déjà affectés restent déplaçables vers une autre destination, et le serveur continue de valider la capacité lors de toute planification. TypeScript et le build frontend passent. Source métier de référence : [SAP — Available Capacities](https://help.sap.com/docs/SAP_ERP/f9ecce75e3bc4f94b5ebab70731a9a75/4a73b65334e6b54ce10000000a174cb4.html).

### WEB/API — expliquer la capacité journalière dans Workload — 25 octobre 2026

- Le DTO Workload indique maintenant si une capacité nulle vient d’un calendrier absent, d’un calendrier désactivé ou d’un jour sans heures de travail. Les cellules affichent la cause et la plage de capacité (début–fin, avec indication lorsque la fin tombe à minuit). Le calcul conserve les minutes individuelles configurées et la date spéciale prioritaire sur le jour hebdomadaire; il n’infère ni pause, ni capacité d’équipe, ni calendrier de production. Cela suit le principe SAP de capacité disponible calculée à partir des capacités individuelles et du temps de fonctionnement, sans prétendre reproduire les calendriers d’usine SAP.
- La durée quotidienne peut se terminer à minuit, mais pas se prolonger au jour suivant : Workload n’alloue pas encore une OT sur plusieurs dates. L’éditeur ajuste la durée maximale au début choisi et l’API applique la même règle.
- Vérification : TypeScript Web, compilation API et `git diff --check` réussis. Les images locales API (`atlas-cmms-backend:local`) et frontend (`atlas-cmms-frontend:local`) ont été reconstruites. Aucun test fonctionnel ni redémarrage de service n’a été effectué; les conteneurs actifs utilisent donc encore leurs images précédentes.

### WEB — synchroniser les déplacements d’OT avec les affectations Workload — 25 octobre 2026

- Quand une OT planifiée apparaissait dans plusieurs cellules (équipe ou plusieurs personnes affectées), son déplacement ne retirait auparavant que la première copie du store; les barres de capacité pouvaient alors garder une allocation fantôme. Le store retire maintenant toutes les occurrences et tous les totaux associés, puis recharge l’aperçu et la file non planifiée depuis l’API après planification ou désaffectation.
- Le commutateur de configuration indique désormais que la capacité est activée, et le bouton de cellule annonce l’édition de la capacité individuelle plutôt que d’un planning.
- Prettier, TypeScript Web et `git diff --check` réussis. L’image frontend locale vient d’être reconstruite dans la passe du 26 octobre; le conteneur n’a pas été redémarré et aucun test fonctionnel n’a été effectué.

### WEB — recherche persistante dans la liste des équipes — 21 octobre 2026

- Le champ de recherche des équipes était rendu seulement si la page courante contenait au moins une équipe. Après une recherche sans résultat, le champ disparaissait avec la liste : l’utilisateur ne pouvait plus effacer le terme pour retrouver ses équipes.
- Le champ reste maintenant affiché au-dessus de la liste, y compris pendant un état vide. Les filtres, la pagination, les routes, les permissions et les appels API ne changent pas.
- `frontend/scripts/team-search-empty-state.test.cjs` vérifie que le champ n’est pas conditionné par le contenu de la page (**1/1**). TypeScript Web, ESLint TSX, Prettier sur les fichiers modifiés et `git diff --check` passent; la recette dans Chromium authentifié reste ouverte.

### WEB — isolation et reprise du portail public de Demande — 21 octobre 2026

- En changeant l’UUID du portail dans une session de navigation, l’ancien portail pouvait rester dans Redux. Une réponse tardive de l’ancienne URL pouvait aussi remplacer le portail courant; si le nouveau chargement échouait, l’interface risquait d’afficher le mauvais formulaire et ses informations société.
- Le chargement public est maintenant isolé par UUID : chaque nouvelle navigation efface les données et saisies précédentes, les réponses tardives sont ignorées, et le démontage nettoie uniquement la requête actuellement affichée. Une erreur de chargement est distinguée d’un portail absent et propose une relance localisée EN/FR. Les endpoints, soumissions, autorisations et règles de demande restent inchangés.
- Le test `request-portal-public-load.test.cjs` couvre la navigation concurrente entre deux UUID et l’échec suivi d’une reprise (**2/2**). TypeScript Web, ESLint sur les sources, Prettier et le test ciblé passent; la suite Web complète et la recette sur portail public réel restent à faire.

### MOBILE — doublons des notifications en pagination — 21 octobre 2026

- Une notification reçue en temps réel est insérée en tête pendant que l’API utilise une pagination par offset. La page suivante peut alors répéter le dernier élément déjà affiché; le reducer ajoutait toutes les entrées sans déduplication.
- La pagination des notifications écarte désormais les IDs déjà présents et conserve l’élément actuellement affiché. Les critères, routes API, ordre fourni par le serveur, compteur non lu et actions de notification restent inchangés.
- Un test de régression simule la réception temps réel entre la première et la deuxième page; il passe avec le test principal `mobile-regression.test.cjs`, le typecheck Mobile et Prettier. Les validations sur appareil restent à faire.

### WEB — recherche des équipements et pagination — 21 octobre 2026

- La recherche d’équipements construisait ses nouveaux filtres depuis les critères capturés à l’ouverture de l’écran. Après avoir appliqué un filtre, une recherche ou son effacement pouvait donc rétablir des filtres obsolètes; la page courante n’était pas non plus réinitialisée, ce qui pouvait produire une liste vide après un changement de recherche.
- Le gestionnaire utilise désormais une mise à jour fonctionnelle à partir des critères courants, préserve les filtres non liés à la recherche et remet à la première page les vues liste et hiérarchie. Les routes, APIs et règles métier restent inchangées.
- Le test de recherche partagée vérifie les critères (**2/2**) et ajoute une vérification ciblée du câblage Équipements (**1/1**). TypeScript Web, ESLint sur l’écran, Prettier sur les deux fichiers et `git diff --check` passent; recette navigateur authentifiée restante.

### WEB/MOBILE — mises à jour partielles des disponibilités — 21 octobre 2026

- Le DTO `ShiftConfigurationPatchDTO` utilisait un booléen Java primitif et le mapper MapStruct pouvait appliquer des champs omis (`enabled`, jours ou exceptions) comme valeurs par défaut/null. Une modification partielle risquait donc d’éteindre une configuration ou de supprimer des jours et exceptions qui n’étaient pas dans la requête.
- Le champ `enabled` est maintenant nullable dans le DTO et le mapper ignore les valeurs nulles. Une valeur explicite `false` continue de désactiver la configuration. Aucun endpoint, modèle de données, droit ou cycle de rotation n’a changé.
- `ShiftConfigurationMapperTest` vérifie la conservation des champs omis et la désactivation explicite (**2/2**); `ShiftConfigurationControllerTest` vérifie aussi la lecture de la configuration personnelle (**2/2**). Ensemble, **4/4** tests ciblés passent après recompilation Maven. Reste une recette de l’édition Web et de la lecture Mobile avec une configuration de test réelle.

### Revalidation Mobile et validation API Webhook — 21 octobre 2026

- Mobile : tests de régression **38/38**, onboarding première connexion **5/5**, TypeScript Mobile et Prettier ciblé réussis. Cela valide les chemins automatisés de navigation/dates/erreurs/format monétaire couverts par ces scripts, pas le rendu tactile réel sur Android ou iOS.
- Web/API : Workload ciblé **4/4**, tests backend `WorkloadServiceTest` **2/2**; contrôle des intégrations webhook par service et contrôleur **5/5**. Le nouveau test MockMvc refuse la lecture sans `SETTINGS.view` avant accès au service; le contexte MockMvc désactive les filtres, donc il ne remplace pas la recette JWT authentifiée.
- Runtime Docker vérifié séparément : API et Nginx étaient `Running`, `/api/health-check` répondait HTTP 200. Ce contrôle porte sur l’image déjà présente, pas sur les changements locaux de cette session. Aucun build/recréation de conteneur, migration, commit, push ou déploiement n’a été fait.

### MOB — dates d’exception des disponibilités de shift — 21 octobre 2026

- L’écran personnel acceptait tout texte au format `YYYY-MM-DD`, même des dates inexistantes. Le helper valide maintenant le jour/mois/année réels (y compris les années bissextiles) avant d’afficher une exception. Les jours hebdomadaires absents d’une réponse API ancienne retombent sans crash sur le défaut existant de 8 h.
- Couverture ajoutée à `test:shift-availability` : **5/5**. Régression Mobile complète **38/38**, onboarding **5/5**, TypeScript Mobile et Prettier passent. Aucun changement API ou métier; vérification sur appareil non effectuée.

**Statut : base de navigation Mobile et onboarding versionné intégrés; backend `mvn test` complet réussi. La recette Work Orders contre API réelle, Chromium authentifié et validation appareil restent ouvertes. APK signé 1.0.59 reconstruit le 20 octobre.**
Ce document complète [`WEB-UI-REDESIGN-BACKLOG.md`](WEB-UI-REDESIGN-BACKLOG.md) et [`MVP-MOBILE-QPM.md`](MVP-MOBILE-QPM.md). Il conserve les routes, contrats et règles métier tant qu’un lot backend dédié n’a pas été cadré.

### Suite Workload Web — validation de durée et date — 21 octobre 2026

- Le Web refuse maintenant les dates calendaires impossibles et les identifiants de technicien invalides dans les cibles de glisser-déposer. Le serveur refuse une durée estimée non finie ou non positive avant toute modification d’OT; les champs HTTP concernés portent aussi `@Positive`.
- Les quatre tests Workload ciblés, la suite Web complète, le typecheck Web, ESLint et Prettier ciblés passent. `mvn -f api/pom.xml -Dtest=WorkloadServiceTest test` réussit (**2/2**, après compilation de 825 sources et 128 sources de test). La validation endpoint/API réelle, la recette visuelle et le build CRA récent restent ouverts.

## Audit initial fondé sur le dépôt

| Domaine | Existant vérifié | Écart / décision de backlog |
| --- | --- | --- |
| Mobile — navigation | `mobile/navigation/index.tsx` expose Home (ou Requests pour Requester), Work Orders, Scan, Stats et More; la création contextuelle est un FAB séparé. | Implémentation incrémentale faite sur les routes et permissions existantes. Recette Android/iOS requise pour confirmer safe-area, clavier, cibles tactiles et rendu du bouton Scan. |
| Mobile — Home / Stats | Les deux écrans consomment l’overview existant; Home montre les signaux opérationnels disponibles, Stats les répartitions analytiques. Les états de chargement/erreur viennent du store API. | Présentation dédoublonnée; aucune donnée ni KPI fictif. Recette appareil reste à faire. |
| Mobile — apparence | Tokens QPM clair/sombre centralisés; pilule et Scan utilisent ces tokens. | Les cartes de la famille principale utilisent `cardLarge`; rayon commun ajusté de 20 à 18 dp pour respecter la cible 16–18 dp. Recette contraste/rendu physique encore requise. |
| Web — sidebar | `ExtendedSidebarLayout` dispose d’un toggle desktop, d’un drawer mobile et d’états focus/actif; UX-02/UX-14 restent à vérifier visuellement. | Direction retenue après retour utilisateur : surface blanche, sélection QPM bleue et survol bleu pâle des sous-entrées. Routes, dimensions et permissions conservées; recette responsive requise. |
| Équipes / horaires | `ShiftConfiguration`, `ShiftException`, `ShiftConfigurationController` et `ShiftConfigurationModal` existent; la configuration individuelle est utilisée par Workload. | Réutiliser les données personnelles existantes. Elles ne constituent pas un roster d’entreprise avec rotations, absences, affectations site/centre, relève ou approbation. Auditer DTO, règles et permissions avant extension. |
| Arrêts planifiés | Recherche statique dans `api/src/main/java`, `frontend/src` et `mobile` : aucun module Shutdown Calendar dédié trouvé. Les traductions d’arrêt d’urgence ne prouvent pas l’existence d’un calendrier. | Nouveau domaine probable, distinct des OT et shifts; cadrer le modèle BP versionné, l’audit trail et les contrats avant création. |
| Pièces / approvisionnement | `Part`, `PartQuantity`, `PurchaseOrder`, workflows d’achat et pages/API existent; quantités liées aux pièces, OT et commandes. | Étendre autour des objets présents : vérifier PR, réservations, réceptions partielles et suivi fournisseur avant tout nouvel écran/champ. Ne pas créer un second inventaire ou outil d’achat. |
| Préparation maintenance | Planning OT, shifts individuels, pièces et achats existent partiellement. | Aucune disponibilité/readiness complète confirmée. Indicateurs explicables seulement, avec état inconnu quand une source manque; ne jamais autoriser automatiquement l’exécution. |
| Hiérarchies Équipements / Postes techniques | Deux arbres distincts restent en place; l’import/export propose maintenant des UUID `exchangeId`, clés de parent/poste et chemins complets lisibles dans les exports; mises à jour idempotentes dans la société cible, garde-fou sur collisions d’ID SQL, parents absents/ambigus et cycles. Migration additive ajoutée mais non exécutée. | Recette avec migration sur base de test, export/import réel entre environnements, contrôle du périmètre de site et vérification de tous les exports paginés. Le chemin est exporté pour lecture/réconciliation; les UUID demeurent les clés de rattachement. Le détail est dans la section « Hiérarchies techniques et transferts de données » de [`WEB-UI-REDESIGN-BACKLOG.md`](WEB-UI-REDESIGN-BACKLOG.md). Tests générateur CSV **23/23** en build temporaire; migration et échange inter-environnements non vérifiés. |

Audit statique seulement : les routes présentes ne prouvent pas le fonctionnement en production. Les permissions par site, parcours multi-utilisateur et comportements sur appareil restent à valider.

## Backlog priorisé

| ID | Priorité | Portée | Dépendances |
| --- | --- | --- | --- |
| MOB-NAV-01 | P1 | **Base implémentée, finition en cours** : pilule flottante, Scan central surélevé, FAB Create contextuel et More; labels compacts et palette reliée aux tokens QPM ajoutés le 19 octobre. Recette appareil restante. | Frontend existant; routes et permissions existantes conservées. |
| MOB-HOME-02 | P1 | **Implémenté** : Home centré sur les actions disponibles; Stats conserve l’analyse et les répartitions API. Recette visuelle appareil restante. | APIs existantes; aucun nouveau KPI. |
| MOB-CARD-03 | P1 | **Audit ciblé et rayon partagé ajusté à 18 dp**; valider contraste, densité, clipping et grandes polices sur Android/iOS. | Tokens et composants existants; recette Light/Dark sur appareils. |
| MOB-WO-04 | P0 | **Correctif de coercition implémenté; tests du moteur avancé 43/43** : les chaînes date sont converties en `Date`/`Timestamp` selon le type réel du champ. Ce chemin correspond à l’exception signalée, sans confirmer qu’il s’agissait du payload fautif du serveur. | Compilation et tests ciblés réussis dans une copie temporaire du code courant; trace complète, payload production et recette des WO avec API réelle restent requis avant fermeture. Aucun changement de schéma/API. |
| MOB-NAV-05 | P1 | **Corrections intégrées et couvertes par tests** : onglet OT compact sur petits écrans, labels accessibles, Scan élevé selon les tokens QPM, FAB Add séparé, contextuel, autorisé et masqué au clavier. | Routes/droits existants conservés. Bundles Android/iOS valides; reste la recette réelle tactile, safe-area, grands textes et petits appareils. |
| MOB-ONBOARD-06 | P2 | **Implémenté dans le code** : cinq écrans EN/FR, progression par balayage/boutons, contenu adapté aux rôles et modules autorisés, skip/fin persistés par utilisateur et replay depuis Paramètres. | Préférence dans `UserSettings`; endpoint dédié protégé à l’utilisateur courant; migration Liquibase additive. Appliquer la migration et valider l’API puis la recette Android/iOS avant livraison. Aucun changement de rôle/droit ni permission caméra/NFC pendant l’introduction. |
| WEB-SIDEBAR-01 | P1 | Le pied compact réserve maintenant 208 px pour empiler jusqu’à quatre actions avec des cibles de 48 px; la liste de navigation garde son défilement indépendant. Restent les labels, la tablette et le drawer mobile à vérifier visuellement. | Complète UX-02/UX-14 existants; aucun changement de route/droit. Le test de layout vérifie la réserve; recette navigateur réelle encore requise. |
| WEB-SIDEBAR-02 | P2 | Vérifier la surface claire, les sous-entrées en survol/sélection, les contrastes et les captures à plusieurs largeurs. | Décision visuelle avec contrôles responsive et WCAG AA; tenir compte de l’accent entreprise. |
| SHIFT-ROSTER-01 | P2 | Spécifier puis étendre le roster par site/centre : shifts et rotations configurables, équipes/personnes, repos, absences, remplacements, validation, relève et présence prévue/réelle. | Réutiliser shift config et People/Teams; migration/API probable. Import/export et détection de conflits après contrats validés. |
| SHUTDOWN-01 | P2 | **Découverte initiale terminée** : SAP/QPM comparés, `AssetDowntime` confirmé comme historique réel à préserver; modèle proposé et questions pilote consignées dans [SHUTDOWN-PLANNING-ARCHITECTURE.md](SHUTDOWN-PLANNING-ARCHITECTURE.md). Prochain lot : règles métier et lecture des fenêtres. | Nouveau domaine backend, migrations, droits par site et audit. Liens OT/ressources en lecture d’abord; aucune mutation des dates/statuts WO. |
| PROCUREMENT-01 | P1 | **Fondation P02, garde du module, mutations Web atomiques et workflows PO exécutables vérifiés** : correspondances QPM/externe, reçus idempotents, reprise récupérable et bornée avec fencing de tentative/index; écritures PO/lignes/catégories dédiées protégées par entitlement, historique consultable; quantités d’achat finies, positives et cohérentes avec unité; quantités regroupées par unité sur Web/Mobile. `POST /purchase-orders/with-lines` et `PATCH /purchase-orders/{id}/with-lines` valident et persistent le bon et toutes ses lignes dans une transaction avant de lancer leurs workflows; les notifications de création partent après commit. Les formulaires Web de création et édition les utilisent. L’action PO `ASSIGN_CATEGORY` est exécutée; références fournisseur/catégorie limitées à la société et seuls les workflows activés sont déclenchés. L’action rappel par email non implémentée est masquée des nouveaux workflows et les anciens restent supprimables avec un avertissement. L’audit de conduite retient `Part.vendors` comme informatif (source-list exclusive future = relation dédiée et datée), recommande un prix PO figé distinct du coût courant, une réception mobile ultérieure en ligne seulement et une séparation des droits par action. Comparaison SAP/QPM et lots ordonnés consignés dans [PROCUREMENT-SAP-ARCHITECTURE.md](PROCUREMENT-SAP-ARCHITECTURE.md) et [`MOBILE-CAPABILITIES-AND-MODULARITY.md`](MOBILE-CAPABILITIES-AND-MODULARITY.md). | Aucun connecteur n’est activé. Le code interne Web utilise maintenant les routes atomiques; les routes historiques restent disponibles pour compatibilité externe et l’absence d’usage externe doit être confirmée auprès des intégrateurs. Le reçu physique attend le mode historique/nouveau par PO, les décisions unités/précision/site/inspection/sur-réception/reliquat/annulation, les droits et la migration historique. L’audit confirme que `PartTransaction` ne relie pas les mouvements aux PO et que l’approbation change `Part.quantity` directement; un backfill automatique de réceptions passées n’est pas fiable. Les montants utilisent le coût courant et ne sont pas figés par ligne. Contrôle responsive et recette appareil restent à faire. |
| READINESS-01 | P3 | Afficher disponibilité, état de préparation WO, pièces, arrêt et accès équipement avec provenance et date de chaque signal. | Dépend de SHIFT-ROSTER-01, SHUTDOWN-01 et PROCUREMENT-01; aucun score non expliqué ni autorisation implicite. |

## Critères d’acceptation par phase

### Phase 1 — Mobile UI/UX

- **MOB-NAV-01 / MOB-NAV-05** : cinq destinations au maximum; l’onglet OT ne grossit pas au point de couper son libellé; icônes alignées et état actif contenu dans sa cellule. Scan reste centré, élevé de 14–18 dp, sans clipping et entièrement tactile. FAB Add de 52–56 dp, en bas à droite, au-dessus de la barre et hors du contenu important; se masque au clavier et respecte les permissions. Utiliser les tokens QPM pour clair/sombre, contrastes accessibles, safe-area et tests à petites/grandes largeurs. Le scan ne démarre qu’après action explicite.
- **MOB-HOME-02** : Home répond à « que faire maintenant ? » avec assignations, retards, notifications et pénuries uniquement si leurs données sont accessibles. Stats regroupe les indicateurs existants; tout KPI sans source validée est absent ou indisponible.
- **MOB-CARD-03** : tokens QPM conservés, couleurs sémantiques métier inchangées; vérification WCAG AA, petit écran, texte agrandi, thèmes, lecteur d’écran et recouvrement du FAB.

### Phase 1b — Chargement des Work Orders

- Reproduire l’appel API Mobile fautif avec requête, utilisateur/site et trace serveur complète; identifier le champ, la projection ou le mapping qui envoie une chaîne vers un `Timestamp`. Comparer type Java, SQL, JSON et valeurs legacy/null; documenter la sémantique temporelle et le fuseau avant correction.
- Corriger à la frontière responsable avec un type temporel cohérent; garder le contrat existant sauf impossibilité démontrée. Ne pas masquer les enregistrements mal formés et ne pas modifier les données de production par migration non revue. Le client montre un état d’erreur/action de reprise compréhensible sans afficher la stack trace.
- Critères: liste/filtre/détail/création/modification des OT passent; tests API/mapping/date couvrent valeur valide, null et cas legacy; aucun message de conversion Timestamp dans les journaux du scénario vérifié.

### Phase 1c — Onboarding première connexion

- Audit avant code : architecture Expo/navigation, tokens clair/sombre, écrans auth/Home/OT/Scan/Stats/More, droits/features déployés, préférences utilisateur et mécanismes de synchronisation déjà disponibles. Réutiliser les composants et illustratifs existants; ne pas installer de bibliothèque sans besoin établi.
- Produire cinq écrans : accueil QPM; gestion des OT avec aperçu réaliste; scan équipement; planification (uniquement fonctions activées); écran de fin. Style SaaS maintenance haut de gamme, typographie et composition travaillées, mais identité, tokens et contraste QPM restent maîtres. Pas de permission caméra/NFC au chargement de l’onboarding.
- Navigation accessible : swipe, Suivant, Retour, Ignorer, progression, langues française/anglaise, petites tailles Android et grossissement système. Adapter les messages aux droits existants (technicien, superviseur, planificateur, administrateur) sans demander ni attribuer un rôle.
- Présenter une fois par utilisateur et par version; enregistrer terminé/ignoré, gérer session interrompue, reconnexion et plusieurs appareils. Préférence existante réutilisée : `UserSettings`; endpoint dédié `PATCH /user-settings/{id}/onboarding`, limité au settings de l’utilisateur authentifié. La migration marque les lignes déjà présentes comme résolues en version 1, et les nouveaux settings commencent à la version 0. « Rejouer la visite » est accessible dans Paramètres.
- Critères: premier login, retour, ignorer, fin, redémarrage, déconnexion/reconnexion, changement langue/thème, rôle et replay; ne jamais réafficher après chaque connexion ni inclure de fonctions indisponibles.

### Phase 2 — Web UI/UX

- **WEB-SIDEBAR-01/02** : tester 1440, 1024, 768, 390 et 360 px, clavier, zoom, groupes, footer et drawer. Toute inversion de couleur exige une comparaison approuvée et un contrôle de contraste; routes, menus, compteurs et permissions restent identiques.

### Phase 3 — Shift Roster

- **Individual capacity editor (web)**: responsive day rows, accessible labels for availability and duration, save-in-progress/error feedback, a “use default” action for dated overrides, and confirmation before discarding edits. SAP’s [available-capacity reference](https://help.sap.com/docs/SAP_ERP/f9ecce75e3bc4f94b5ebab70731a9a75/4a73b65334e6b54ce10000000a174cb4.html) covers productive time by day or shift, breaks, and utilization; QPM currently models individual weekly availability. Keep this capacity setting separate from roster assignments.

- Définir avec le site pilote le fuseau, nuits traversant minuit, jours de repos, rotations configurables (ex. 7/7 et 4/4), absence, remplacement et validation. Ne pas coder ces exemples comme cycles fixes.
- Accès limité au site autorisé; historique des changements; conflits montrés avant sauvegarde; aucune écriture silencieuse. Web équipe et Mobile personnel lisent une source commune. Import Excel idempotent avec prévisualisation, erreurs par ligne et contrôle de droits.

### Phase 4 — Shutdown Calendar

- Définir BP, propriétaire, états brouillon/revue/publié, périodes multi-jours, zones, reports et heures réelles. Une révision publiée est immuable; tout report est historisé (date, acteur, motif).
- Comparaison baseline/révision/prévu/réel traçable; import validé avant écriture. Allocation d’OT/ressources reste une proposition tant qu’un superviseur autorisé ne confirme pas.

### Phase 5 — Suivi des pièces

- Auditer réservations, commandes, reçus et quantités existants. Distinguer besoin WO, réservé, commandé, reçu et restant sans double-compter les mouvements.
- Réception partielle transactionnelle; relances datées; responsable et prochaine action visibles; alertes basées sur seuils configurés. Aucune commande ni mutation de stock automatique sans action autorisée. SAP ECC reste une intégration future par backend; aucun secret dans le frontend.

### Phase 6 — Readiness et recette

- Indiquer preuves disponibles (équipe, pièces, arrêt, accès) et manques avec source/date. Une donnée absente donne « à vérifier », jamais « prêt » par défaut.
- Tester API/services, migrations réversibles, RBAC/isolement site-tenant, concurrence, imports répétés, responsive, thème, caméra/scanner sur appareil et parcours réels par rôle. Les tests statiques ne remplacent pas la recette native ni le site pilote.

## Hors périmètre avant validation des règles et contrats

- Migrations, nouveaux endpoints, droits ou stockage de roster/shutdown/procurement avant spécification métier.
- Connecteur SAP ECC direct, secrets SAP côté Web/Mobile, écritures automatiques vers SAP.
- Scan à l’ouverture d’écran, transitions WO par drag-and-drop ou autorisation d’intervention via un score.
- Capacités, KPI ou données d’exemple présentés comme des données réelles.

## Prochaine étape recommandée

Installer le build 1.0.59 sur un appareil Android et vérifier les scénarios natifs qui n’ont pas encore été réalisés. L’utilisateur indique que la plupart des recettes visuelles sur téléphone sont déjà effectuées et qu’aucun problème n’est signalé; ne pas reprogrammer une recette visuelle Mobile générale. Le P0 MOB-WO-04 reste ouvert jusqu’à reproduction de la liste/filtres/détails WO contre l’API réelle et examen de la trace/payload d’origine. La recette Chromium Web authentifiée reste ouverte faute de navigateur exécutable. Avant d’implémenter Shift Roster, Shutdown BP ou Procurement Tracking, produire des spécifications métier distinctes.

### Audit de préparation — Shift Roster, Shutdown Calendar et Procurement — 20 octobre 2026

- **Shift Roster : partiel, ce n’est pas un planning d’équipe.** `ShiftConfiguration` / `ShiftDayConfiguration` / `ShiftException` (`api/src/main/java/com/grash/model/`) stockent une disponibilité hebdomadaire et des exceptions **par utilisateur**. `WorkloadService.getUserCapacityForDay` en déduit des minutes disponibles; `ShiftConfigurationController` expose `GET /shift-configurations/users` et `PATCH /shift-configurations/user/{userId}` avec contrôles de permissions et d’entreprise. Le Web réutilisable est `frontend/src/content/own/PeopleAndTeams/components/ShiftConfigurationModal.tsx` et `frontend/src/slices/shiftConfiguration.ts`. Aucun écran Mobile de roster, définition d’équipe/centre, cycle 7/7 ou 4/4, présences, absences, remplacements, relève ou approbation de planning n’a été trouvé.
- **Shutdown Calendar : absent dans les modules parcourus.** La recherche de routes, entités, composants et services n’a trouvé aucun calendrier d’arrêt, baseline BP, révision publiée, période planifiée/réelle ou historique de report. Le statut équipement `EMERGENCY_SHUTDOWN` n’est pas une planification d’arrêt.
- **Procurement : flux PO existant à préserver, suivi opérationnel incomplet.** `PurchaseOrder` conserve fournisseur, catégorie, statut d’approbation et date de livraison attendue (`shippingDueDate`); `PartQuantity` lie une quantité de pièce soit à un PO, soit à un WO; `Part` conserve le stock, emplacement, fournisseur et un `@Version`. Routes existantes : `/purchase-orders` et `/part-quantities`. Les statuts du PO sont `PENDING`, `APPROVED`, `REJECTED`, sans cycle commande/réception partielle ni champs PR/PO externes, réservation, suivis datés ou responsable de relance.
- **Effet métier à protéger :** `PurchaseOrderController.respond(approved=true)` augmente actuellement le stock de la quantité entière de chaque `PartQuantity` du PO. L’approbation est donc aussi un événement de stock dans le comportement existant; ajouter la réception partielle sans séparer ces étapes pourrait dupliquer les entrées de stock. Toute extension doit définir un reçu idempotent et transactionnel, gérer l’existant sans réappliquer des quantités, et préserver les contrats/routes historiques. Ces constats sont une lecture de code, pas une validation d’exécution API.
- **Prochaine tranche sûre :** écrire et faire valider les règles de domaine (propriétaire d’un plan de shift, fuseau, modèles de cycle, statut d’absence, signatures/approbations, règle d’entrée de stock à la réception); puis proposer un modèle/API versionné et des tests d’isolation par entreprise avant les migrations. Ne pas ajouter des écrans factices dans les menus existants.

## Historique

### 19 octobre 2026 — reprise Web/Mobile et validation de régression

- Relance de `npm run test:mobile-regression` : **31/31 tests réussis**. `npx expo export --platform web` bundle l’application mobile pour le Web (1 891 modules) avec succès; cela valide le bundling, pas le rendu sur appareil natif.
- Le typecheck Web `npx tsc --noEmit --pretty false` réussit. Le typecheck Mobile réussit également avec une configuration temporaire excluant `mobile/dist`, généré par l’export Expo; aucun fichier de configuration du dépôt n’a été modifié.
- Les points mobile restent MOB-WO-04 (trace Hibernate complète requise), recette de MOB-NAV-05 et validation backend/appareil de MOB-ONBOARD-06. Aucun APK n’est déclaré généré ou validé dans cette passe.
- Les lots Shift Roster, Shutdown Calendar et Procurement Tracking restent à spécifier avec le site pilote avant toute évolution de modèle ou d’API; ils ne sont pas remplacés par des écrans de démonstration.

### 19 octobre 2026 — MOB-WO-04, coercition des filtres date

- L’inspection des Work Orders confirme des champs persistés en `java.util.Date`, alors que les filtres JSON génériques transportent `value` comme `Object`. Les constructeurs Web/Mobile utilisés pour les plages standard renseignent `JS_DATE`; le moteur générique laissait cependant les valeurs brutes pour `eq`, `ne`, `gt`, `ge`, `lt`, `le` et `in` quand le champ n’était pas marqué.
- `WrapperSpecification` convertit désormais les valeurs ISO en fonction du type Java du chemin (dont `Timestamp`) avant de construire les prédicats; les dates invalides sont rejetées par la validation de filtre. Des tests ciblent l’égalité date et la comparaison d’un champ Timestamp.
- C’est un chemin plausible correspondant à l’exception, pas une reproduction de l’incident original : le payload fautif et la trace complète du serveur manquent encore. La compilation Maven des sources et tests passe dans `/tmp`; `SearchDateValueConverterTest` passe **4/4**. Les tests d’intégration Mockito échouent avant leurs assertions, Byte Buddy ne pouvant pas attacher son agent JVM dans le sandbox. Le P0 reste ouvert jusqu’à exécution des tests d’intégration dans un environnement Java normal et recette API.

### 18 octobre 2026 — MOB-NAV-01, première intégration

- Barre mobile remplacée par une pilule flottante à cinq emplacements maximum : Accueil, OT, Scan, Stats et Plus. Pour le rôle Requester, Requests remplace Accueil; les demandes restent aussi accessibles depuis Plus lorsqu’elles sont autorisées et activées.
- Scan ouvre l’écran du scanner uniquement après appui; ses permissions de consultation d’équipements restent appliquées.
- Le bouton central de création devient un FAB contextuel séparé, caché au clavier et présent seulement si le rôle dispose d’au moins une permission de création. Requesters conservent la création de demande; les autres rôles réutilisent la feuille existante.
- Les couleurs de navigation utilisent les tokens QPM clair/sombre. Aucun endpoint, contrat, permission ou transition métier n’est modifié.
- La régression dédiée et la suite Mobile (**31 scripts de test**) passent; TypeScript, Prettier et `git diff --check` passent aussi. Les tests couvrent les routes, le déclenchement explicite du scan, les permissions de création, le masquage au clavier et l’accès aux demandes. La recette visuelle Android/iOS reste à faire sur appareil.

### 18 octobre 2026 — MOB-HOME-02 / MOB-CARD-03, finition ciblée

- Home et Stats sont maintenant consignés comme dédoublonnés : Home garde les indicateurs opérationnels effectivement disponibles; Stats garde les répartitions analytiques API. Aucun KPI n’est inventé.
- L’audit statique des cartes Home, OT, statistiques et répertoires confirme l’usage des surfaces/couleurs du thème et des couleurs de statut sémantiques; aucun code couleur direct n’a été trouvé dans ces écrans. Les cartes principales partagent leurs rayons par tokens.
- `qpmLayoutTokens.radius.cardLarge` passe de 20 à 18 dp (cible backlog 16–18 dp); les cartes qui utilisent ce token sont harmonisées sans modifier leur contenu ou leurs interactions. Le rayon `card` existant reste 16 dp.
- La suite Mobile, TypeScript, Prettier et `git diff --check` passent après la navigation; test d’apparence mis à jour pour fixer le token à 18 dp. Le contraste réel et les tailles de texte agrandies doivent encore être contrôlés sur appareils; l’audit statique ne vaut pas validation visuelle.

### 19 octobre 2026 — ajout stabilisation navigation, Work Orders et onboarding

- Ajout de MOB-WO-04 P0 après signalement d’une conversion String → `java.sql.Timestamp` empêchant le chargement des Work Orders. L’implémentation attend une reproduction et l’identification du mapping exact; aucune migration ou modification API n’est présumée.
- Ajout de MOB-NAV-05 pour corriger les défauts visibles rapportés sur l’onglet OT, l’alignement du Scan, les tokens et le FAB. La navigation existante est à auditer/corriger, pas à remplacer.
- Ajout de MOB-ONBOARD-06 pour cadrer l’onboarding premium first-login en cinq écrans, localisé, versionné, role-aware et rejouable. Les permissions restent backend-authoritative; la persistance serveur dépend de l’audit des préférences existantes et d’un contrat dédié si nécessaire.
- Cette mise à jour est documentaire uniquement : les trois lots restent ouverts, aucun écran, endpoint, permission ni schéma n’a été modifié.

### 19 octobre 2026 — MOB-NAV-01 / MOB-NAV-05, finition responsive et tokens

- Les couleurs de navigation ne reprennent plus une paire navy/lavande indépendante : la surface, son texte, l’accent actif et son texte sont dérivés respectivement des tokens QPM `surface`, `textPrimary`, `brandPrimary` et `onPrimary`, en thèmes clair et sombre.
- À 439 dp et moins, les libellés sont masqués pour éviter que « Ordres de travail » déborde de sa cellule; les boutons gardent un `tabBarAccessibilityLabel` traduit. À partir de 440 dp, les libellés restent visibles. La composition conserve les cinq destinations autorisées par rôle.
- Le contrôle automatique confirme que Scan reste un bouton de 60 dp, élevé de 18 dp et non rogné. Le FAB reste contextuel, autorisé par permission et masqué au clavier.
- Tests ciblés `appearance.test.cjs` et `mobile-navigation-redesign.test.cjs`, puis suite `npm run test:mobile-regression` : **31/31 passés**; `tsc --noEmit`, Prettier ciblé et `git diff --check` passent. L’affichage sur téléphone/tablette et la zone tactile au-dessus du conteneur restent à confirmer sur appareil.
- MOB-WO-04 n’est pas corrigé : le dépôt contient le mapping WorkOrder en `java.util.Date` et les colonnes historiques attendues en `TIMESTAMP`, mais cette inspection ne suffit pas à attribuer l’exception à un champ précis. L’environnement courant refuse l’accès au socket Docker et aucun stack trace complet du scénario fautif n’est disponible; aucune modification de schéma ou conversion spéculative n’a été faite.

### 19 octobre 2026 — MOB-ONBOARD-06, première implémentation

- L’audit a confirmé que `UserSettings` et `PATCH /user-settings/{id}` existent déjà et que le contrôleur vérifie l’appartenance au settings de l’utilisateur. Le modèle Mobile n’avait toutefois aucun état d’onboarding.
- Ajout d’un état versionné (`onboardingVersion`, `onboardingStatus`) et d’un endpoint ciblé `PATCH /user-settings/{id}/onboarding`. Le endpoint ne peut écrire que sur les préférences du compte courant et n’accepte que la version d’introduction actuellement publiée et un état ignoré/terminé.
- Migration Liquibase additive; les préférences existantes sont initialisées comme résolues pour éviter de surprendre les utilisateurs actuels. Les nouveaux comptes démarrent en `NOT_STARTED`. Les mises à jour génériques des anciens clients conservent les champs d’onboarding.
- Cinq écrans Mobile localisés EN/FR; swipe et boutons Précédent/Suivant/Ignorer, indicateur de progression, aperçu de modules autorisés et CTA final. Aucun accès caméra/NFC n’est demandé avant une action explicite. Replay ajouté dans Paramètres.
- Garde au démarrage authentifié : charge les préférences avant de choisir l’écran initial pour éviter un flash Home; si le service de préférences est en panne, l’application reste accessible et ouvre Home. Les anciens serveurs sans champs d’onboarding n’imposent pas l’introduction.
- Tests ciblés d’état : 5/5; suite Mobile : **31/31**; TypeScript Mobile, Prettier ciblé et export Expo Web passent. L’unique échec de la première suite était un test d’apparence qui comptait les icônes de Settings avant l’ajout de l’action Replay; l’attendu a été ajusté et la suite complète repasse. Revalidation backend du 21 octobre : les tests `UserSettingsControllerTest` et `UserSettingsServiceOnboardingTest` passent **7/7** dans une copie de travail sous `/tmp` (la compilation directe dans `api/target` est bloquée par des fichiers immuables du répertoire cible). Le test Maven complet n’a pas été relancé. Test visuel natif et application de migration en base restent à faire.
- Le contenu de bienvenue et de scan respecte les droits du compte : le scan n’est présenté que si l’accès Equipements est accordé; les aperçus de modules sont filtrés avec les permissions et la configuration déployée. Aucun état ou fonctionnalité n’est simulé comme actif.
- Le même audit a trouvé que le PATCH générique `/user-settings/{id}` validait l’ID du chemin mais sauvegardait l’ID reçu dans le corps. Le contrôleur lie maintenant la sauvegarde à l’ID des préférences authentifiées; les tests contrôleur incluent le refus d’accès aux préférences d’un autre utilisateur et passent dans la revalidation ciblée **7/7** du 21 octobre.
- MOB-WO-04 reste P0 ouvert, faute de trace backend complète et d’accès Docker dans l’environnement courant.

### 19 octobre 2026 — Web Request, garde des champs configurés

- Le formulaire de Demande ne traitait pas le cas où la configuration d’entreprise ciblait un champ retiré par la configuration UI; un index absent pouvait corrompre la liste des champs ou empêcher l’ouverture du formulaire.
- L’application de `REQUIRED`/`HIDDEN` est maintenant limitée aux champs présents et configurés. Test dédié **3/3**, tests CRUD/sélecteurs Request et suite Web complète **71 tests** passent; aucune API, permission ou règle métier ne change.
- Le typecheck tenté cette session n’a pas produit de résultat observable. La recette visuelle/Chromium reste ouverte; aucune validation sur compte authentifié n’est revendiquée.

### 19 octobre 2026 — vérification croisée des backlogs Web/Mobile

- La suite de régression Mobile a été relancée sans changement d’application : **31/31 tests réussis**. Les parcours natifs Android/iOS et le backend MOB-WO-04 restent non vérifiés dans cette passe.
- Le sidebar Web a été corrigé localement pour retrouver sa palette de surface indigo nuit/sélection bleue approuvée et ouvrir les groupes correspondant aux routes imbriquées; les détails sont suivis dans `WEB-UI-REDESIGN-BACKLOG.md`. Aucun flux métier Mobile, contrat API ou permission ne change.

### 19 octobre 2026 — erreurs de délai API Mobile et recette statique croisée

- Les expirations de requêtes Mobile émettent maintenant une erreur typée `REQUEST_TIMEOUT` et `getErrorMessage` la traduit via la langue i18n active (anglais/français, avec repli anglais pour les autres langues). Le message français codé en dur ne peut donc plus apparaître sur un compte anglophone; une expiration reste distincte d’une erreur de connexion refusée. Aucun contrat API ni comportement d’autorisation ne change.
- Régression vérifiée pour les timeouts, l’annulation utilisateur silencieuse et le message en français/anglais. Suite Mobile complète **31/31**, TypeScript Mobile passent. Suite Web complète **72/72**, TypeScript Web et les tests sidebar navigation/state/layout passent. La recette Chromium authentifiée et Android/iOS physiques restent à faire.

### 19 octobre 2026 — conservation de session et bundles natifs JS

- Mobile ne supprime plus les jetons lorsqu’un appel de renouvellement échoue sur une exception réseau; les réponses explicitement refusées/invalides continuent à les invalider. Cette note précédait l’ajout de la reprise progressive documentée plus bas (5 à 60 secondes, erreurs transitoires, application active).
- Les exports Expo Android (**2 227 modules**) et iOS (**2 218 modules**) réussissent. Ils vérifient le bundle JavaScript, pas le build natif ou l’expérience sur appareil.
- Web : les 3 tests du sidebar avaient réussi séparément et la suite Web **72/72** avec TypeScript avait passé à la vérification précédente. Un nouveau build CRA a été lancé mais interrompu sans rapport d’erreur exploitable; le rendu Chromium authentifié reste ouvert.
- Revue de MOB-NAV-05 : les comportements de dimensionnement, Scan, FAB et tokens sont présents dans le code et protégés par la suite Mobile. Le backlog le marque implémenté côté code; la validation tactile et safe-area reste à faire sur appareil.

### 19 octobre 2026 — renouvellement Mobile sur erreurs HTTP temporaires

- Le renouvellement effaçait les jetons après n’importe quelle réponse HTTP non-2xx, y compris `429` et les erreurs serveur `5xx`. Il conserve maintenant la session sur ces réponses transitoires comme sur les erreurs réseau; seules les réponses explicites `401`/`403` ou un corps de succès invalide invalident les jetons.
- Régressions ajoutées pour `429`, `500` et `503`; les tests existants couvrent aussi la panne réseau et le refus `401`. Suite Mobile (**31/31 scripts**), TypeScript Mobile et `git diff --check` passent. Prettier signale les deux fichiers entiers comme non formatés; aucune réécriture globale n’a été appliquée pour éviter un diff de formatage sans rapport. Aucun endpoint, stockage natif, contrat API ou permission ne change.
- La reprise automatique reste dépendante de l’événement online/foreground déjà présent; essai de coupure réelle et validation Android/iOS sur appareil toujours requis.

### 19 octobre 2026 — vérification croisée Web/Mobile

- Web : suite `node --test --test-reporter=dot scripts/*.test.cjs` et typecheck TypeScript terminent avec le code retour 0. Le build de production CRA a été lancé mais n’a produit aucun résultat exploitable après l’étape de compilation optimisée; il a été interrompu et reste **non vérifié**.
- Mobile : suite `npm run test:mobile-regression` passe **31/31**; `npx tsc --noEmit --pretty false` passe. Les exports Expo natifs du bundle JavaScript réussissent pour iOS (**2 218 modules**) et Android (**2 227 modules**). Ils ne compilent pas le code natif et ne valident ni les permissions caméra/NFC, ni les interactions sur appareil.
- Les prochains contrôles bloquants restent : trace/payload serveur complet pour MOB-WO-04, tests Maven/API de l’onboarding et de l’isolement, recette Chromium Web authentifiée, puis essais Android/iOS sur appareils réels. Le roster d’équipe complet, Shutdown Calendar et Procurement restent en cadrage; seul l’accès personnel en lecture aux disponibilités existantes est ajouté ci-dessous.

### MOB-SHIFT — consultation personnelle des disponibilités — 21 octobre 2026

- L’API existante expose les horaires d’autres personnes uniquement aux utilisateurs autorisés People & Teams; `auth/me` n’inclut pas la configuration de quart. Pour éviter d’élargir ces permissions, ajout d’un `GET /shift-configurations/me` qui ne prend aucun identifiant et retourne uniquement la configuration du principal authentifié. Une configuration absente renvoie une structure vide afin que l’application puisse afficher un état non configuré.
- Mobile ajoute « Mes disponibilités » dans Plus, en lecture seule, avec horaires hebdomadaires, exceptions datées à venir, états chargement/erreur/réessai et messages français/anglais. Les durées par jour manquant suivent la valeur par défaut de l’éditeur Web existant (8 h, actif). L’écran rappelle que cette disponibilité n’est pas une affectation de quart publiée.
- L’éditeur Web réutilisé pour régler la capacité individuelle indique maintenant explicitement en français/anglais qu’il ne publie pas de roster ni d’affectation de quart.
- Tests Mobile ciblés **3/3**, TypeScript Mobile et Prettier passent. Le test contrôleur Maven du nouvel endpoint passe **2/2** dans une copie sous `/tmp`; le `api/target` du checkout contient des fichiers en lecture seule issus de builds Docker et n’a pas été modifié. Les scripts de régression Web complets passent; Prettier Web passe. Le typecheck Web et le lint ciblé n’ont pas fourni de résultat exploitable dans ce runner. Pas de migration, écriture, permission d’accès à autrui, build natif, déploiement ni publication.

### Reprise de session Mobile — erreurs temporaires sans changement de connectivité — 19 octobre 2026

- La reprise existait au retour de l’application au premier plan et après le retour du réseau. Elle ne retentait pas nécessairement après une panne serveur temporaire lorsque le réseau demeurait disponible.
- Le contexte Mobile programme maintenant des tentatives progressives (5, 10, 20, 40 puis 60 secondes maximum) si les jetons sont conservés et que l’erreur est réseau, timeout, `408`, `429` ou `5xx`. La requête n’est relancée que lorsque l’application est active. Les refus `4xx` — dont `401`/`403` — ne sont pas retentés; les tentatives sont nettoyées après connexion réussie, déconnexion ou démontage du contexte.
- Aucun endpoint, schéma, permission ni contrat API ne change. Tests dédiés de délai et de classification ajoutés. Suite Mobile complète, TypeScript et vérification de build/bundle restent en cours ou à compléter dans cette passe; le comportement en arrière-plan et la reprise réseau doivent encore être vérifiés sur Android/iOS réels.

### Validation finale — reprise de session Mobile — 19 octobre 2026

- `npm run test:mobile-regression` passe **32/32 suites de test**; `./node_modules/.bin/tsc --noEmit --pretty false`, Prettier ciblé et `git diff --check` passent.
- Les exports Metro réussissent pour iOS (**2 219 modules**) et Android (**2 228 modules**). Il s’agit de bundles JavaScript, pas d’un APK/IPA ou d’une validation native sur appareil.
- Les cas HTTP 400 non retentable et transport/408/429/5xx retentables sont couverts. Essais de reprise après panne réelle, arrière-plan, Android et iOS restent à faire sur appareils/environnement de recette.

### Revalidation Web/Mobile — 19 octobre 2026

- Mobile : `npm run test:mobile-regression` réussit **32/32**; `./node_modules/.bin/tsc --noEmit --pretty false` passe. Expo exporte le bundle iOS (**2 219 modules**) et Android (**2 228 modules**) avec succès. Ces exports ne compilent pas les binaires natifs et ne remplacent pas un essai physique.
- Web : la suite frontend complète et `tsc --noEmit --pretty false` passent; le build CRA optimisé termine par **Compiled successfully**. Chromium authentifié, parcours visuels à différentes largeurs et essais sur Android/iOS restent ouverts.
- Le backend compile en Java 17 et le test autonome `SearchDateValueConverterTest` passe **4/4**. Les tests intégration ne sont pas validés : Mockito/Byte Buddy échoue lors de l’attachement JVM dans cet environnement. L’API Docker a répondu HTTP 200 au health-check, ce qui ne valide pas la route Work Orders authentifiée.
- L’association EAS demandée pour `fbfaa721-adb1-463a-8757-3e256cf7337a` n’a pas abouti : `eas init` exige un compte Expo ou `EXPO_TOKEN`, absent de cette session. `app.config.ts` et `eas.json` n’ont pas été modifiés. Le build `--platform all --auto-submit` n’a donc pas été lancé; les profils `production` configurés impliquent une build de production et une soumission aux comptes de distribution configurés.

### Recontrôle MOB-WO-04 et dépendances de recette — 19 octobre 2026

- Le convertisseur date a été compilé directement avec Java 17 dans un dossier temporaire et un smoke test autonome vérifie Date, Timestamp, date seule UTC et rejet d’une chaîne invalide (**4/4**). Cela ne vérifie pas Hibernate ni l’API réelle.
- Les tests d’intégration Spring restent bloqués : `mvn` et `api/mvnw` ne sont pas disponibles; l’accès au daemon Docker retourne `permission denied`. La trace serveur et le payload ayant déclenché l’erreur ne sont toujours pas présents. MOB-WO-04 demeure donc P0 ouvert.
- La tentative Chromium DevTools échoue aussi sur l’absence de `/opt/google/chrome/chrome`; aucune recette visuelle Mobile Web ou captures authentifiées n’est revendiquée. Les exports Metro et tests répertoriés plus haut restent des validations de bundle/tests automatisés, pas un test sur appareil.

### Vérification Docker et tests backend — 19 octobre 2026

- L’accès Docker a été relancé avec `sudo`, autorisé par l’utilisateur. `atlas-cmms-backend` est `Up`; `GET http://localhost:3000/api/health-check` renvoie **HTTP 200**. Les logs API consultés ne montrent pas d’erreur Timestamp récente. Cela confirme la disponibilité générale du service, pas le chargement d’une liste Work Orders authentifiée ni la reproduction du payload fautif.
- Maven 3.9.12 est désormais disponible sur le poste de développement. Le premier lancement depuis `api/` n’a pas pu écraser certains artefacts de `api/target` (droits existants); les tests ont été relancés depuis une copie temporaire sous `/tmp` sans modifier les sources.
- Compilation des 823 fichiers Java réussie. `SearchDateValueConverterTest` passe **4/4**. Le lot combiné compte 311 cas et échoue sur 307 erreurs d’initialisation Mockito/Byte Buddy (`Could not self-attach to current VM`), avant les assertions métier; zéro échec d’assertion n’est interprétable comme validation. MOB-WO-04 reste **ouvert** jusqu’à test Spring dans un environnement permettant l’attachement JVM et recette de la requête authentifiée.
- Le contrôle Chromium reste bloqué : Chrome DevTools attend `/opt/google/chrome/chrome`, absent ici. Pas de captures ni de validation visuelle authentifiée revendiquées. Aucun rebuild Docker, déploiement, commit ou push n’a été effectué.

### MOB-WO-04 — validation ciblée après configuration de l’agent Mockito — 20 octobre 2026

- Les sources `SearchDateValueConverter` et `WrapperSpecification` de la copie temporaire correspondent au dépôt; Maven recompile les **823 classes Java** et les **120 classes de test** avec l’agent Mockito du POM.
- `SearchDateValueConverterTest` et `WrapperSpecificationTest` passent **43/43**. Cela couvre la conversion date/horodatage et les opérations de filtre, mais ne reproduit pas l’appel mobile authentifié contre le serveur ni ne confirme le payload fautif.
- P0 MOB-WO-04 reste ouvert jusqu’à obtention de la trace/payload de l’incident et recette de liste, filtres, détails et mutations Work Orders contre l’API réelle. Docker n’est pas accessible sans privilèges dans cette exécution; aucun changement de données ni migration n’a été effectué.

### Revalidation Mobile — onboarding et régressions — 20 octobre 2026

- `npm run test:mobile-regression` termine avec **34/34 tests Node**; la suite inclut `test:onboarding`, qui passe **5/5** pour nouveau compte, skip, complétion, nouvelle version et serveur ancien.
- `./node_modules/.bin/tsc --noEmit --pretty false` passe sur Mobile. Aucun code Mobile n’a été modifié dans cette vérification; tests tactiles, NFC/QR réel et installation sur appareils Android/iOS restent à faire.

### Reprise de session — vérification du suivi — 20 octobre 2026

- La note antérieure sur l’absence de reprise automatique était obsolète : `AuthContext` conserve la session en cas d’erreur transitoire, réessaie avec un délai progressif plafonné à 60 secondes lorsque l’application est active et relance aussi au retour au premier plan. Logout et démontage nettoient le timer.
- `auth-recovery.test.cjs` passe; `npm run test:mobile-regression` passe **34/34**, `test:onboarding` passe **5/5**, et le typecheck Mobile passe. Aucune modification du code Mobile dans cette vérification. L’essai réel de perte/reprise réseau et des transitions arrière-plan reste à faire sur Android/iOS.

- Web UX-12 (20 octobre) : le sélecteur de vues calendrier masque ses libellés sur téléphone et les montre à partir de `sm`, sans perdre les noms accessibles. Tests dédiés **2/2**, suite complète, TypeScript, Prettier et build CRA (**Compiled successfully**) réussis; recette responsive Chromium toujours ouverte.
- Mobile : `npm run test:mobile-regression` réussit **34/34**; `test:onboarding` passe **5/5**; le typecheck Mobile `./node_modules/.bin/tsc --noEmit --pretty false` termine avec le code **0**.
- Aucun changement d’API, permission ou règle métier. Pas de rebuild Docker, APK/IPA, déploiement, commit ou push.

### Workload Web et NFC iOS — reprise des backlogs — 20 octobre 2026

- Web : la capacité du Workload distingue maintenant capacité indisponible, temps restant et dépassement. La surcharge n’est plus présentée comme `0h00 restant`; le dépassement est explicite, localisé et annoncé aux technologies d’assistance. Tests frontend complets, TypeScript et Prettier passent. Le build CRA a été relancé seul, mais n’a produit aucun résultat après « Creating an optimized production build » et a été interrompu; il n’est pas revendiqué comme réussi. Les écrans authentifiés restent à contrôler visuellement.
- Mobile : NFC est activé sur iOS et Android dans la configuration source; Expo autolinking expose `react-native-nfc-manager` pour iOS. La suite Mobile passe **32/32**, le typecheck et Prettier ciblé passent. Le projet iOS contient usage description et entitlement Core NFC `TAG`.
- Limite iOS : aucune compilation CocoaPods/Xcode signée ni lecture physique n’a été effectuée. Il faut régénérer/valider les Pods sur macOS, signer avec un profil autorisant Core NFC, installer sur un iPhone compatible puis tester MIFARE/ISO 15693. L’application ne désactive plus le NFC iOS dans le code, mais une ancienne IPA déjà installée ne change pas rétroactivement.
- Aucun changement d’API, de permission QPM ou de règle métier; aucun APK/IPA, déploiement, commit ou push produit.

### Garde de configuration native NFC — 20 octobre 2026

- Une régression Mobile verrouille désormais ensemble l’autolinking iOS, `NFCReaderUsageDescription`, l’entitlement Core NFC `TAG` et sa déclaration dans `CODE_SIGN_ENTITLEMENTS`. La suite Mobile passe **32/32**, TypeScript, Prettier ciblé et `git diff --check` passent.
- L’export Expo iOS a réussi avec un seul worker (**2 219 modules**) après qu’une tentative sans limite de workers s’est arrêtée sans résultat exploitable. L’export confirme le bundle JavaScript, pas la signature Apple, CocoaPods ou la lecture physique d’un tag.
- Calendrier Web : précédent/suivant, Aujourd’hui et les choix de vue ont une cible minimale de 48 × 48 px sur téléphone et gardent leur densité desktop à partir de `sm`. Suite Web complète (code 0), typecheck, test responsive ciblé et Prettier passent. Le build CRA isolé termine avec succès; test tactile visuel dans Chromium reste à effectuer.
- Mobile : le garde NFC couvre aussi la permission Android et conserve le matériel comme facultatif. Suite Mobile relancée après cet ajout : **32/32**; Prettier ciblé passe. Tests statiques uniquement pour Android; pas d’installation ou scan physique dans cette passe.
- Web UX-11 : les actions de copie, de menu et d’arborescence des familles Équipements, Localisations et Pièces sont harmonisées avec les icônes MUI Outlined. Suite Web, test icon-family, TypeScript, Prettier ciblé et build CRA passent. La famille globale d’icônes et la revue visuelle restent à finir.

### Retour de contraste sur le sidebar Web — 20 octobre 2026

- Le fond navy `#101B36` était toujours perçu comme l’ancienne palette bleu-noir. Le fond passe au blanc, avec texte gris foncé, séparateurs neutres et survol bleu très pâle; le bleu QPM est conservé pour la sélection principale. Le logo du sidebar est adapté à la surface claire.
- Les sous-entrées affichent maintenant une surface au survol et un état sélectionné lisible, avec texte bleu et focus clavier visible. Le test de contraste vérifie les libellés secondaires sur la surface et au survol. Recette visuelle Chromium authentifiée encore requise.
- Validation : suite Web **76/76**, TypeScript, tests sidebar/contraste, Prettier et `git diff --check` passent. Le build CRA n’a pas rendu de résultat après son démarrage et a été arrêté; relancer un build de production avant toute réplication Docker.

### Validation ciblée API — 20 octobre 2026

- Maven direct depuis `api/` échoue avant compilation en essayant d’écraser un ancien fichier `api/target/classes` non modifiable. Dans une copie temporaire de `api/src` et `pom.xml`, la compilation de 823 sources Java réussit.
- Les tests ciblés `SearchDateValueConverterTest` (**4/4**) et `WorkOrderExecutionTimeCalculatorTest` (**3/3**) passent. Quatre tests `UserSettingsControllerTest` / `UserSettingsServiceOnboardingTest` s’arrêtent avant assertions : Mockito/Byte Buddy ne peut pas s’attacher à cette JVM (`Could not self-attach to current VM`). Le lot total rapporte 7 réussites et 4 erreurs d’initialisation; le flux backend d’onboarding et l’intégration réelle de recherche Work Orders ne sont donc pas validés par cette exécution.
- Mobile : suite de régression **32/32** et `tsc --noEmit --pretty false` terminent avec le code retour 0. Aucun APK/IPA, rebuild Docker ou déploiement produit.

### Pipeline iOS — lancement Fastlane depuis le bon répertoire — 20 octobre 2026

- Le `Fastfile` était dans `mobile/ios/fastlane`, mais GitHub Actions et Jenkins lançaient Fastlane depuis `mobile/`, ce qui empêchait la découverte standard de la configuration. Les deux lanes utilisent maintenant `mobile/ios/`; `BUNDLE_GEMFILE` pointe toujours vers `mobile/Gemfile`.
- `mobile/scripts/ios-build-pipeline.test.cjs` vérifie les deux working directories et commandes; le test dédié, Prettier et `git diff --check` passent. Aucun runner macOS/Xcode n’est disponible pour exécuter réellement `verify_build` ou produire un IPA signé.

### Couverture onboarding et régression croisée — 20 octobre 2026

- Les cinq tests Jest de versionnement et de persistance de l’onboarding existaient, mais n’étaient pas exécutés par `npm run test:mobile-regression`. Un script `test:onboarding` est maintenant inclus à la fin de cette commande afin que les scénarios premier compte, ignoré/terminé, nouvelle version et serveur ancien soient vérifiés ensemble.
- La règle racine Git ignorait les répertoires `node_modules`, mais pas un lien symbolique de ce nom. Elle ignore désormais aussi ces liens; le lien local du prototype Web n’est donc pas proposé par `git status`.
- Validation de la reprise : suite Mobile intégrée (**33 tests Node + 5 tests Jest**), TypeScript Web/Mobile et suite Web terminent avec code retour 0. `git diff --check` passe. Cette vérification automatisée ne remplace pas la recette visuelle authentifiée; Chromium reste indisponible et aucun build/déploiement/commit n’a été produit.

### Vérification backend complète et rebuild mobile — 20 octobre 2026

- `mvn test` dans une copie propre temporaire avec Docker/Testcontainers disponibles : **2 159 tests, 0 échec, 0 erreur, 10 ignorés**, `BUILD SUCCESS` en 4 min 58 s. Liquibase et les intégrations PostgreSQL utilisent les conteneurs temporaires du test; aucun jeu de données QPM existant n’est ciblé.
- Maven dans le répertoire du dépôt reste bloqué avant compilation par un fichier `api/target/classes` non écrasable. La copie temporaire contourne les artefacts locaux sans modifier les sources.
- Mobile : `npm run test:mobile-regression` passe (**33 tests Node + 5 Jest onboarding**) et `tsc --noEmit --pretty false` passe. L’APK `1.0.59` du 19 octobre ne contenait pas l’onboarding ajouté le 20 octobre; le rebuild au même numéro est maintenant réussi et l’artefact vérifié ci-dessous.
- Web : suite de tests, typecheck, rebuild Docker local et smoke Nginx HTTP 200 vérifiés; Chromium visuel reste indisponible, aucun parcours authentifié ni déploiement VPS revendiqué.

### APK 1.0.59 — rebuild validé — 20 octobre 2026

- `NODE_ENV=production npm run build:apk` : bundling Expo Android (**2 228 modules**) et Gradle `BUILD SUCCESSFUL` (**1 124 tâches, 18 exécutées, 1 106 à jour**). Le script a signé l’APK avec le keystore release existant et l’a écrit dans `mobile/dist/QPM-1.0.59.apk`.
- Métadonnées vérifiées avec `aapt`: `com.atlas.cmms`, `versionCode 42`, `versionName 1.0.59`. `apksigner verify --verbose` confirme la signature APK v2, un signataire. Les textes d’accueil, de gestion des OT, d’identification équipement et de planification onboarding sont présents dans `assets/index.android.bundle`. Taille : **101 MB**; SHA-256 : `e854402ebe00d6cf45e63e6260558f0de63b024bf274f1824d76357e849d5450`.
- Le numéro de version n’a pas été incrémenté. `adb devices` n’a pas pu démarrer le daemon dans cette session (`Operation not permitted`); installation et vérification physique restent à faire sur téléphone. Aucun IPA iOS n’a été généré.
- Audit de taille : APK universel contenant les ABI `armeabi-v7a`, `arm64-v8a`, `x86` et `x86_64`; le manifeste conserve `CAMERA` et `NFC`, avec le matériel NFC facultatif. Les entrées principales incluent le bundle JS (9,03 MB), React Native natif et Barhopper/ML Kit barcode pour plusieurs ABI. Une future réduction peut comparer App Bundle/splits ABI après une matrice d’appareils; ne pas supprimer d’ABI avant validation de compatibilité.
- Export iOS non natif réussi avec `NODE_ENV=production expo export --platform ios --max-workers 1` : **2 219 modules**, bundle Hermes **9,45 MB**, export dans le dossier ignoré `.expo-export-ios-check`. Cela ne compile ni ne signe l’app iOS; Fastlane/Xcode, Pods, IPA et test Core NFC physique restent bloqués par l’absence de macOS et de credentials Apple.

### APK 1.0.59 — rebuild après correctif tableau de bord — 21 octobre 2026

- `NODE_ENV=production npm run build:apk` termine avec `BUILD SUCCESSFUL` (**1 124 tâches, 18 exécutées, 1 106 à jour**). Le bundle Metro Android a compilé **2 231 modules**; l’APK de release utilise le keystore déjà présent et reste en `versionName 1.0.59` / `versionCode 42`.
- Artefact : `mobile/dist/QPM-1.0.59.apk`, **101 MB**. `aapt dump badging` confirme `com.atlas.cmms`; `apksigner verify --verbose` confirme les signatures APK v2 et v3 avec un seul signataire. SHA-256 : `0dea0b3a84d4b9768e2441087aff80133febb8f4559c0bd4314597f3307abf17`.
- Le code inclus aligne les filtres « aujourd’hui » de Home/Stats sur le fuseau de l’entreprise, avec bornes locales prenant en charge les journées de 23/25 h, et inclut la borne initiale inclusive (`ge`) pour correspondre à l’intervalle `[début, fin)` du backend. Suite Mobile **36/36**, onboarding **5/5**, TypeScript Mobile et Prettier ciblé réussis. Installation réelle sur téléphone non vérifiée. Aucun changement de version, migration, commit ou push.

### Correctif KPI Mobile — ordres dus aujourd’hui — 20 octobre 2026

- L’API excluait une échéance exactement à `00:00` UTC (`after(start)`), alors que l’intervalle du jour doit inclure sa borne de départ. La conversion via le fuseau système du serveur pouvait aussi décaler les limites UTC.
- Le calcul utilise maintenant l’intervalle UTC semi-ouvert `[début du jour, début du jour suivant)` et inclut donc minuit tout en excluant minuit le lendemain. Le contrat API et les permissions restent inchangés.
- Deux tests ciblés vérifient minuit, la dernière milliseconde du jour, le lendemain, une date nulle et des bornes indépendantes du fuseau système : **2/2 réussis**. Revalidation Maven complète sur ce code : **2 161 tests, 0 échec, 0 erreur, 10 ignorés**, intégrations PostgreSQL/Liquibase incluses (`BUILD SUCCESS`, 4 min 56 s).
- Les essais ont été exécutés dans une copie temporaire propre sous `/tmp`, pour contourner les artefacts de compilation non remplaçables dans `api/target`; aucun dossier de build de production ni aucune donnée du serveur n’a été modifié par Maven.
- L’image `atlas-cmms-backend:local` a ensuite été reconstruite et seul le conteneur API local a été recréé. Après son démarrage Spring/Liquibase (~44 s), `GET /api/health-check` via Nginx répond **HTTP 200**. Les 502 observés avant la fin du démarrage étaient transitoires; aucun déploiement VPS n’a été effectué.

### CI smoke test — configuration runtime frontend — 20 octobre 2026

- L’exécution GitHub Actions `39359873194` passe les tests backend, mais le smoke test échoue car le conteneur frontend redémarre; la requête `/` via Nginx renvoie 502. L’image API répond bien à `/health-check`.
- Cause identifiée dans la configuration : `runtime-env-cra` en production exige une valeur non vide pour chaque clé de `frontend/.env.example`. `HOME_URL` était injectée vide par Compose (`${HOME_URL:-}`), ce qui interrompait la génération de `runtime-env.js`. Le fallback Compose fournit maintenant un espace; le client le supprime déjà avec `.trim()` et utilise ensuite l’origine courante.
- Les diagnostics de smoke affichent maintenant séparément les journaux frontend, Nginx et API pour éviter que les centaines de lignes Spring masquent la cause frontend. Le workflow vérifie aussi `pipefail` sur Maven et ne déploie que lorsque le contrôle smoke demandé a réussi.
- Vérifications locales : régression frontend **77/77**, TypeScript, Prettier, syntaxe/normalisation Compose et reproduction de `runtime-env-cra` avec HOME_URL vide puis espace : réussies. Le patch workflow/Compose attend encore le prochain run GitHub Actions pour confirmer le smoke test sur une image fraîche.
- La même exécution GitHub n’a pas pu publier les images Docker : Docker Hub répond `Username and password required`; le job de déploiement VPS a donc été ignoré. Les secrets Docker Hub requis ne sont pas disponibles dans ce contexte. Aucun déploiement VPS n’est revendiqué.

### CI — chemin Liquibase de test et smoke self-hosted — 20 octobre 2026

- Le run GitHub Actions `39361040016` confirme que le smoke test self-hosted réussit désormais : images API et frontend construites, `/health-check` via Nginx et page frontend servis correctement. La publication des images et le déploiement VPS sont restés ignorés, car `mvn test` échouait.
- Cause du démarrage Liquibase en tests : `api/src/test/resources/application.yml` masque la configuration principale et ne déclarait pas le changelog; Spring cherchait le chemin YAML standard absent du dépôt. Le fichier de test pointe maintenant explicitement vers `classpath:/db/master.xml`, utilisé par l’application.
- Le run suivant a révélé une seconde cause : le job exportait `SPRING_PROFILES_ACTIVE` depuis une variable GitHub possiblement vide. Cela désactivait le profil `test`; certains contextes chargeaient une configuration incomplète et échouaient notamment au décodage de la clé JWT. Le job fixe désormais explicitement `SPRING_PROFILES_ACTIVE=test`; une assertion du test de workflow protège cette règle.
- Vérification dans une copie temporaire propre : compilation des 823 sources réussie et 1 893 tests exécutés sans échec d’assertion. Neuf tests d’intégration Testcontainers ont échoué avant assertions parce que le daemon Docker n’est pas accessible dans cet environnement; aucune erreur Liquibase n’apparaît dans les rapports. La suite complète doit être confirmée par le runner GitHub, qui a accès à Docker.
- Le workflow active maintenant `pipefail` pour que `tee` ne masque pas un échec Maven et réserve la publication/déploiement aux chemins de succès. Les logs du run `39361040016` montrent encore que les identifiants Docker Hub ne sont pas configurés ou accessibles (`Username and password required`); sans ces secrets, aucune image ne peut être publiée et aucun déploiement VPS ne peut partir.
- Les tests frontend de workflow smoke couvrent aussi le trimming de `HOME_URL` et son fallback sur l’origine. Aucun changement d’API ou de données; Chromium connecté, appareils physiques et déploiement ne sont pas validés ici.

### Validation distante après correction du profil Spring — 20 octobre 2026

- Le run GitHub Actions `39362684410` sur `3f3bb804` confirme que les tests backend Maven passent et que le smoke test self-hosted passe (API, frontend et Nginx). Le profil `test` fixe et le changelog Liquibase explicite corrigent les deux causes observées dans les runs précédents.
- Les deux jobs de publication échouent à l’étape de connexion Docker Hub; les jobs de déploiement sont donc ignorés. Le workflow n’a pas déployé le VPS. Il faut configurer dans GitHub Actions les secrets `DOCKERHUB_USERNAME` et `DOCKERHUB_TOKEN` avec un compte/token Docker Hub autorisé; aucune valeur de secret ne doit être commitée.
- Le build Web CRA lancé localement dans cette session a été interrompu par une sortie prématurée du processus (pression mémoire probable). Le build du frontend dans le smoke test GitHub a, lui, réussi. La vérification UI Chromium authentifiée reste séparément non exécutée.
- Vérification de reprise sur le checkout `80b3c9f5` : `node --test --test-reporter=dot scripts/*.test.cjs` (Web) et `npx tsc --noEmit --pretty false` passent; côté Mobile, `npm run test:mobile-regression` passe (**33/33**), la suite Jest d’onboarding passe (**5/5**) et le typecheck TypeScript passe. Ces tests n’incluent pas un appareil Android/iOS ni la recette visuelle Chromium.

### MOB-DASH-01 — compteur des OT prévus aujourd’hui selon le fuseau entreprise — 20 octobre 2026

- `GET /analytics/work-orders/mobile/overview` calculait la tuile « aujourd’hui » avec les limites UTC même si l’entreprise a un fuseau choisi dans Paramètres → Général. Un OT autour de minuit pouvait donc être compté le mauvais jour pour les utilisateurs.
- Le calcul utilise maintenant `GeneralPreferences.timeZone`; les intervalles journaliers sont construits via `LocalDate.atStartOfDay(zone)` afin de respecter les transitions heure d’été/hiver. Un fuseau ancien absent ou invalide retombe sur UTC pour éviter une erreur 500.
- Aucun contrat API, champ de base, règle de statut, filtre de rôle ou donnée n’a changé. `WOAnalyticsControllerTest` couvre les bornes locales, la journée de passage à l’heure d’été, les valeurs nulles et le fallback : **3/3**. Le projet API complet compile (823 sources Java et 121 sources de test) dans une copie temporaire Maven; seul ce test ciblé a été exécuté sur cette passe (`BUILD SUCCESS`). La recette avec données réelles et appareil Mobile reste ouverte.

### SEC-WEB-02 / SEC-MOBILE — suppression des trames STOMP de la console — 20 octobre 2026

- Les connexions de notifications, import et export Web ainsi que les notifications Mobile transmettaient le JWT dans l’en-tête STOMP `CONNECT`. Le logger par défaut du client peut imprimer l’intégralité de cette trame, y compris le jeton, dans la console développeur.
- `client.debug` est maintenant désactivé avant chaque `connect()` dans les quatre clients; chacun reçoit aussi une fabrique SockJS et un délai de reconnexion de 5 secondes. La connexion réessaie avec un nouveau socket, et le callback Notifications rétablit l’abonnement à chaque reconnexion. L’authentification, le format de l’en-tête et les contrats API restent inchangés. Après ce complément, le test STOMP, ESLint ciblé, Prettier ciblé, TypeScript Web/Mobile, toute la suite Web (code 0), la régression Mobile (**33/33**) et onboarding (**5/5**) passent. Le run CI sur le commit final reste à confirmer.
- Cette correction retire la copie du JWT dans les logs du navigateur/appareil; elle **ne** déplace **pas** les jetons Web hors de `localStorage`. La migration SEC-WEB-02 vers cookies HttpOnly/access token mémoire et sa recette CSRF restent ouvertes.

### Garde de compatibilité des mises à jour EAS de production — 20 octobre 2026

- Le workflow `.github/workflows/mobile-update.yml` cible le canal OTA `production`. Le run `39381436620` s’est arrêté au contrôle `EXPO_TOKEN` absent, avant checkout/installation/publication; **aucun OTA n’a été publié**.
- Le workflow vérifie maintenant la présence du secret et l’absence de changements natifs/configuration (`android/`, `ios/`, configuration Expo, dépendances, plugins) avant de publier. Si le jeton manque ou qu’un build natif est requis, il termine avec une explication dans le résumé et saute l’OTA. Le token n’est jamais injecté dans une commande shell.
- Le run `39381749054` valide le comportement : étape Gate réussie, puis Setup Node/EAS, installation et publication sautés vu l’absence du secret. Le test `ios-build-pipeline.test.cjs` protège ce garde-fou; la suite ciblée, le parse/formatage Prettier YAML et `git diff --check` passent. Aucun OTA n’a été publié; l’accès EAS production reste bloqué jusqu’à configuration d’`EXPO_TOKEN`.

### Build Android 1.0.59 sans incrément — 20 octobre 2026

- Le build Release a abouti après une relance Gradle ciblée; l’APK signé courant a été copié vers `mobile/dist/QPM-1.0.59.apk`. `apksigner verify` confirme la signature v2, `aapt dump badging` confirme `com.atlas.cmms`, version `1.0.59`, `versionCode 42` et SDK minimum 24. Taille : 101 MB; SHA-256 : `e725fbae599cb56e6788fc0007476459972a5df72214c736016895e2d4c942d0`.
- Aucun incrément Android n’a été effectué. L’installation sur un téléphone et la recette visuelle restent à faire.
- iOS : ce poste est Linux, donc aucun build Xcode local. Le workflow GitHub Actions macOS propose une validation d’archive non signée sans secrets Apple; un IPA Ad Hoc installable reste dépendant de certificats/profils Apple et du dépôt Fastlane Match. Aucune IPA n’est revendiquée.
- Revalidation après push : TypeScript Mobile passe; la suite de régression Mobile passe (**33/33**) et Jest onboarding passe (**5/5**). Le test structurel `ios-build-pipeline.test.cjs` passe (**1/1**); cela ne valide pas Xcode.

### MOB-WO-UX — messages d’erreur de chargement des OT — 20 octobre 2026

- La liste des Work Orders distinguait l’échec par une seule valeur booléenne, puis affichait toujours un texte demandant de vérifier la connexion. Les erreurs HTTP 5xx et 401/403 étaient donc mal décrites.
- La liste et la pagination catégorisent maintenant réseau/délai, indisponibilité serveur (5xx), refus d’accès et autre échec avec des messages FR/EN. Le texte du backend (qui peut contenir une exception interne) n’est pas affiché. Requêtes, retries, API, permissions et transitions restent inchangés.
- Test de classification ajouté : **1/1**; régression Mobile complète **34/34**, onboarding **5/5**, TypeScript et Prettier passent. APK Release `1.0.59`, `versionCode 42`, signature v2 vérifiée : `mobile/dist/QPM-1.0.59.apk` (101 MB), SHA-256 `974ba94767b1163fc70c58399466402c07e28226656817d5e4f2a942d1f2bab5`. La vérification sur appareil n’est pas encore faite.

### MOB-WO-UX — erreurs API dans le détail des OT — 20 octobre 2026

- Le détail d'un OT retombait encore sur un message « vérifiez votre connexion » pour toute erreur de chargement, alors que la liste catégorisait déjà les pannes réseau, réponses serveur et refus d'accès. La fiche réutilise désormais le même classement FR/EN et prend en compte les statuts HTTP exposés par Axios dans `response.status`.
- Aucune erreur interne du serveur n'est affichée, et les appels API, permissions, rechargements et règles de clôture restent inchangés. Test ciblé (**1/1**), suite Mobile complète (**34/34 + 5 tests Jest d'onboarding**), typecheck TypeScript Mobile, Prettier et `git diff --check` passent. ESLint n'a pas été exécuté : aucun binaire local n'était disponible et `npx` a échoué car l'accès à npm est indisponible. La vérification appareil/API réelle reste à faire.

### Rebuild APK après reprise des backlogs — 20 octobre 2026

- Le build initial a échoué en fin de `packageRelease` par manque de mémoire du daemon Gradle. Un rebuild avec heap Gradle temporairement augmentée à 2,6 Go a abouti; le réglage suivi dans le dépôt a ensuite été restauré à sa valeur initiale.
- `mobile/dist/QPM-1.0.59.apk` est signé et vérifié avec `apksigner` (signature v2); `aapt` confirme `com.atlas.cmms`, version `1.0.59`, `versionCode 42` et `minSdk 24`. Taille : 101 MB. SHA-256 : `080924b1068f209b3f07f2ad52a2820328068f0ee173ace9f15463a51fa368bb`.
- L’APK inclut le code mobile courant, notamment les messages d’erreur API différenciés dans les listes et le détail WO. Installation, connexion à l’API et recette visuelle sur téléphone ne sont pas encore vérifiées.

### SEC-MOBILE — filtrage des erreurs journalisées — 20 octobre 2026

- Plusieurs blocs `catch` passaient directement des erreurs Axios ou natives à `console.warn/error`. Les erreurs Axios embarquent la configuration de requête et peuvent contenir l’en-tête `Authorization`; messages et réponses serveur peuvent aussi exposer des détails internes.
- `mobile/utils/safeErrorLog.ts` n’émet plus de diagnostic en production. En développement, il n’autorise que quelques codes de transport et un statut HTTP numérique; il exclut message, stack, configuration, en-têtes et corps de réponse. Les consommateurs d’erreurs réseau, d’authentification, de navigation, de listes, NFC, fichiers et permissions ont été migrés.
- Test dédié vérifie le filtrage des propriétés sensibles. Suite de régression Mobile (**34/34**), onboarding et journaliseur Jest (**8/8**), TypeScript Mobile, Prettier et `git diff --check` passent; chargement d’équipements liés aux pièces/localisations (**2/2**). Le build 1.0.59 mentionné plus haut précédait ce changement; le rebuild suivant l’inclut.
- Build suivant réussi sans incrément : `mobile/dist/QPM-1.0.59.apk`, `versionCode 42`, signature v2 confirmée, taille 101 MB, SHA-256 `dc661132c70a0931217d989ac37274941a549e798a274b762046e6088d7bc327`. `gradle.properties` a retrouvé son heap de dépôt après le build. Installation et vérification sur appareil restent à faire.

### Passe QA Mobile — 20 octobre 2026

- `npm run test:mobile-regression` réussit **34/34 scripts**, `npm run test:onboarding` réussit **5/5**, et TypeScript Mobile (`tsc --noEmit --pretty false`) passe.
- Ces tests couvrent notamment navigation, sélecteurs d’équipement, formulaires Request, chargement et clôture WO, permissions scan/caméra, gestion de session et pipeline iOS structurel. Aucun appareil Android/iOS n’était connecté; les contrôles safe-area, caméra/NFC, installation et rendu visuel restent non vérifiés.
- Aucun changement source/API n’a été fait pendant cette passe QA. Le P0 MOB-WO-04 attend toujours trace serveur et payload fautif, puis validation de liste/filtres/détail WO avec une session réelle.

### Export iOS JavaScript — 20 octobre 2026

- `npx expo export --platform ios` réussit depuis le dépôt courant et bundle **2 221 modules** en `mobile/dist`. Cela confirme le bundling JavaScript/Metro de la version présente après les changements Web; ce n’est ni une compilation Xcode ni un IPA installable.
- La suite Mobile reste **34/34**, onboarding **5/5**, TypeScript passe. Un build macOS et la signature Apple restent nécessaires pour produire/tester un IPA; essai sur iPhone toujours ouvert.

### SEC-MOBILE — réponses serveur 5xx sans détails internes — 20 octobre 2026

- Le helper API mobile affiche désormais un message générique localisé FR/EN pour les réponses 5xx au lieu du texte d’exception serveur. Les erreurs de validation 4xx gardent leur traitement existant; aucun endpoint ni contrat API n’a changé.
- La régression Mobile, les **34/34** tests de régression, les **5/5** tests Jest d’onboarding et le typecheck passent. `npx expo export --platform ios` bundle **2 221 modules** avec succès; il s’agit du bundle JavaScript, pas d’une compilation Xcode/IPA. Recette sur appareil et API distante restent à faire.

### SEC-MOBILE — journal d’erreur caméra du scanner QR/code-barres — 20 octobre 2026

- Le callback d’échec de montage caméra de `SelectBarcodeModal` écrivait directement le message natif dans `console.error`. Il passe maintenant par `logSafeError`, qui ne conserve que les champs techniques autorisés en développement et n’écrit rien en production; le contenu du code scanné n’était déjà pas journalisé.
- La régression du scanner vérifie le logger filtré et l’absence d’affichage direct de `event.message`; le fichier de régression et le typecheck Mobile passent. La caméra, les permissions et le rendu doivent encore être testés sur un appareil Android/iOS.

### Audit de rebranding QUOREICH/QPM et captures README — 20 octobre 2026

- L’audit `docs/REBRANDING-AUDIT.md` confirme qu’un rebranding progressif des éléments visibles est possible sans modifier les contrats API. Les noms affichés Web/PWA et mobile sont déjà largement QPM/QUOREICH; restent notamment des textes, domaines, contacts, templates backend et métadonnées Atlas à trier avec leurs propriétaires.
- À préserver pendant une mise à jour visuelle : identifiants Android/iOS, schémas et liens profonds historiques, signatures, projets EAS, noms de volumes/base, contrats webhook/API et mentions légales amont. Leur changement exigerait une migration coordonnée et pourrait empêcher les applications installées de recevoir une mise à jour.
- Le README racine contient encore deux captures distantes historiques; `images/mobile/Home.png` est un visuel de référence daté, pas une capture vérifiée de la build actuelle. Aucun appareil Android (`adb`) ni émulateur n’est disponible et Chromium Snap ne démarre pas dans ce runner; ces images restent donc inchangées jusqu’à une capture authentique sur appareil ou émulateur.
- Revalidation de la suite Mobile dans cette session : régression **34/34**, onboarding **5/5**, TypeScript passe. Cela ne remplace pas les captures natives, le test caméra/NFC ni la recette visuelle sur appareil.

### Rebranding visible QUOREICH/QPM — première passe — 20 octobre 2026

- Métadonnées Web, titres des README Web/API, exemple de fournisseur Mobile et descriptions documentaires des webhooks sont rebrandés vers QUOREICH/QPM. Les contrats REST, rôles, navigation et données ne changent pas.
- Le test `frontend/scripts/rebrand-visible-copy.test.cjs` valide les libellés et empêche de modifier accidentellement les identifiants Android/iOS ou le scheme historique. Les URLs Atlas sans remplaçant confirmé, les identifiants de build/store, noms des offres et licences, et l’attribution amont restent en place.
- Vérifications : TypeScript Web et Mobile passent; suite de scripts Web passe; tests Mobile passent (34 régressions + 5 onboarding); build Web CRA passe (`Compiled successfully`). La compilation Maven est bloquée par les droits du fichier existant dans `api/target/classes` (`Operation not permitted`), même en dirigeant la sortie vers `/tmp`. ESLint Mobile n’est pas installé et son téléchargement a échoué faute de DNS (`EAI_AGAIN`); aucune dépendance n’a été ajoutée.
- Aucun déploiement ni build Android/iOS n’est revendiqué pour cette passe de textes. Les captures du README restent à remplacer par des captures authentiques après accès à un appareil ou émulateur.

### Rebuild de validation APK 1.0.59 — 20 octobre 2026

- Après le rebranding du libellé de fournisseur Mobile, l’APK Release a été reconstruit sans incrément de version. Metro a bundle **2 230 modules** et Gradle a terminé avec **BUILD SUCCESSFUL** (1 124 tâches, 18 exécutées, 1 106 à jour).
- `mobile/dist/QPM-1.0.59.apk` : 105 812 708 octets; SHA-256 `0e526f95195a49fd18212b3d5a6f88e04e03af5c7ef8c6426a8087ec322632bb`; signature v2 valide; `com.atlas.cmms`, version `1.0.59`, `versionCode` 42, `minSdk` 24 confirmés par `aapt` et `apksigner`.
- `mobile/INSTALLER-APK.md` reflète maintenant cette archive. Installation/régression sur appareil physique, caméra/NFC et vérification visuelle restent à faire; ce build ne constitue pas une validation sur téléphone.

### Rebranding des textes produit Mobile — traductions — 20 octobre 2026

- Les derniers textes de fonctionnalités encore marqués « Atlas » étaient dans les traductions bosnienne, polonaise et hongroise (descriptions des modules, rapports, coût de main-d’œuvre et abonnements). Ils affichent maintenant QPM. L’avis de provenance amont Web et les noms opérationnels/identifiants historiques ne sont pas concernés.
- `scripts/rebrand-copy.test.cjs` contrôle tous les fichiers de traduction Mobile; suite Mobile **35/35**, onboarding **5/5** et TypeScript passent.
- Après ce changement, l’APK 1.0.59 a été rebâti sans incrément : 105 812 624 octets, SHA-256 `8142cbd1af1b4c69af387c50421861b9812bfbe94e221ee8b902987f3cc71b8c`, signature v2 valide, `versionCode` 42. Test sur appareil réel toujours nécessaire.

### SEC-MOBILE — suppression des logs de parcours courants — 20 octobre 2026

- L’ouverture et la lecture du scanner QR, l’annulation du sélecteur de documents et le refus des notifications écrivaient des événements de routine directement dans `console`. Ces sorties n’aidaient pas au diagnostic et le scanner n’a plus besoin de journaliser les métadonnées du code détecté.
- Les quatre traces sont supprimées; les erreurs caméra continuent à passer par `logSafeError`, qui masque les détails en production. Aucun permissionnement ni comportement utilisateur n’a changé.
- Régression Mobile **35/35**, onboarding **5/5**, TypeScript et Prettier passent. La caméra réelle et l’absence de bruit console sur appareil doivent encore être confirmées. L’APK doit être rebâti pour intégrer ce changement.

### Rebuild APK de test 1.0.59 après SEC-MOBILE — 20 octobre 2026

- Metro bundle **2 230 modules** et Gradle termine `BUILD SUCCESSFUL` (1 124 tâches; 18 exécutées, 1 106 à jour), sans incrément de version.
- `mobile/dist/QPM-1.0.59.apk` : **105 812 092 octets**, SHA-256 `59eb6f3983ab0d08e1bc2931d766b2d18303738066e873b05e79bb2f6cf6d02e`. `apksigner` confirme la signature v2; `aapt` confirme `com.atlas.cmms`, version `1.0.59`, `versionCode` 42 et `minSdk` 24. La fiche `mobile/INSTALLER-APK.md` est actualisée.
- Le bundle inclut les suppressions de logs de parcours courants. Aucun appareil n’est connecté; installation, caméra, NFC et rendu restent à vérifier sur téléphone.

### Revalidation croisée Web/Mobile — 20 octobre 2026

- Web : la suite complète `node --test --test-reporter=dot scripts/*.test.cjs` et le typecheck TypeScript se terminent avec le code **0**.
- Mobile : `npm run test:mobile-regression` passe **35/35**; `npm run test:onboarding` passe **5/5**; `./node_modules/.bin/tsc --noEmit --pretty false` termine avec le code **0**.
- Aucun code applicatif ni API n’a été modifié pendant cette passe. Chromium authentifié, migration de préférences onboarding sur API réelle, Work Orders avec le serveur et essais Android/iOS (navigation, caméra, NFC, onboarding) restent des validations externes ouvertes; aucun résultat visuel ou matériel n’est revendiqué.

### UX — confirmation de clôture Mobile attend le résumé de durée — 20 octobre 2026

- Dans l’écran de révision de clôture, la confirmation finale ne peut plus être soumise pendant le chargement de la durée d’exécution; elle redevient disponible une fois la durée reçue ou signalée comme indisponible. Aucun changement de workflow métier ou API.
- `work-order-completion-load.test.cjs` passe; suite Mobile **35/35**, onboarding **5/5**, TypeScript Mobile et Prettier passent. `npx expo export --platform android` bundle **2 230 modules** avec succès; c’est une validation Metro/JS, pas un APK natif ni une recette sur téléphone.
- La durée contre l’API réelle et le rendu tactile du dialogue restent à vérifier sur appareil authentifié.

### UX — résumé de clôture et toast ciblé Web/Mobile — 20 octobre 2026

- Le résumé pré-enregistrement utilise une hiérarchie commune sur les deux interfaces : bon/équipement, durée réellement mesurée, détail et total de main-d’œuvre, feedback et signature. Le Web utilise des surfaces MUI du thème; Mobile réutilise les tokens QPM `surfaceVariant`, `primaryContainer`, rayons et espacements. Chargement, durée indisponible et chronomètre encore actif restent explicitement présentés; aucune durée n’est fabriquée.
- Le toast de succès existant nomme le numéro du WO clôturé, en français et en anglais. Il n’est envoyé qu’après succès de la mutation; les erreurs ne sont pas transformées en confirmation. API, règles de clôture et permissions restent identiques.
- SAP Fiori, Material Design et IBM Carbon inspirent les principes de confirmation explicite, intitulé actionnable et toast non bloquant; aucun composant ou package externe n’a été ajouté. Les tests ciblés Web/Mobile passent; la suite Mobile passe **35/35**, l’onboarding **5/5**, la suite de scripts Web, les deux typechecks TypeScript, Prettier et le build CRA optimisé passent. ESLint Web passe sur les composants touchés. La validation authentifiée visuelle et les appels au serveur de recette restent à effectuer.

### UX — icône chronomètre pour démarrer la prise de temps — 20 octobre 2026

- Le FAB Mobile de prise de temps utilise maintenant `timer-outline` au démarrage et conserve l’icône d’arrêt lorsque le chronomètre tourne. Le détail Web utilisait déjà `TimerOutlinedIcon`; ce changement aligne le bouton de terrain sur la métaphore temporelle sans toucher au comportement, au libellé, aux couleurs ou aux autorisations.
- L’icône est fournie par le jeu MaterialCommunityIcons déjà présent et `react-native-paper` accepte les noms de cette famille dans son `icon` prop; aucune dépendance n’est ajoutée. Le bouton conserve aussi son libellé accessible dynamique. Le test `appearance.test.cjs` et la suite Mobile (**35/35**), les tests onboarding (**5/5**), le typecheck Mobile et Prettier passent. Le rendu physique de l’icône reste à contrôler sur Android/iOS; aucun APK n’a été rebâti.
- Revue documentaire confirmée le 20 octobre : la librairie installée contient `timer-outline`, mais pas `stopwatch-outline`; on conserve donc l’icône validée au lieu d’introduire un nom absent du pack. La page [Material Design Icons — timer](https://pictogrammers.com/library/mdi/icon/timer/) confirme la sémantique du pictogramme, et la documentation [React Native Paper FAB](https://callstack.github.io/react-native-paper/docs/components/FAB/) confirme l’usage de son prop `icon` et du libellé accessible. Le test ciblé `node --test scripts/appearance.test.cjs` réussit (**1/1**). La recette visuelle sur téléphone reste à faire.

### Revue statique QR / caméra / NFC Mobile — 20 octobre 2026

- Le flux existant demande la permission caméra avant le montage de `CameraView`, suspend le flux en arrière-plan, affiche un état de démarrage, traite `onMountError` avec réessai et n’accepte qu’un premier résultat QR/code-barres. Le scan QR résout ensuite l’identifiant via l’API d’actif; une panne réseau ou un refus d’accès n’est pas interprété comme un identifiant inconnu. Aucun défaut source reproductible n’a été trouvé dans cette revue; aucune modification de scanner n’est justifiée par les éléments disponibles.
- `npx expo config --type public --json` confirme les plateformes Expo Android/iOS/Web, le plugin caméra et les permissions Android caméra/NFC. Les tests de régression vérifient aussi les déclarations natives iOS Core NFC (usage, entitlement TAG et liaison au target) et Android (permission NFC, matériel optionnel). NFC reste disponible dans le code sur Android/iOS et indisponible seulement sur Web.
- Le fichier de régression Mobile passe en exécution Node; le parcours exact reste non vérifié sur appareil. Chromium/Snap et le simulateur iOS ne sont pas disponibles dans ce runner. À faire sur téléphones réels : permission caméra refusée/accordée, aperçu QR en intérieur/extérieur, QR inconnu, réseau interrompu, pause/reprise, NFC Android/iPhone, tag non pris en charge et association/révocation serveur. Les UID bruts ne sont pas une preuve d’autorisation; la résolution serveur doit rester authentifiée et limitée par les droits/site.

### Rebranding — documentation opérationnelle — 20 octobre 2026

- Les guides d’exploitation Backup/Restore, mise à niveau, ports, LDAP, reset, SQL, abonnements et TLS affichent désormais QUOREICH QPM/QPM comme nom du produit.
- Les noms de commandes, scripts (`atlas-backup.*`), conteneurs, volumes, réseau, base (`atlas`), exemples LDAP (`dc=atlas,dc=com`) et identifiants Traefik/Cloudflare restent inchangés pour ne pas casser les déploiements existants. Les contacts légaux et domaines historiques n’ont pas été modifiés.
- Changement documentaire seulement; aucun code, dépendance, API, configuration de production ou donnée n’a changé. Vérification du diff et recherche des mentions de marque ciblées effectuées; build non pertinent pour cette passe.

### Revalidation QA Web/Mobile et Chromium — 20 octobre 2026

- Web : `node --test --test-reporter=dot scripts/*.test.cjs` et `npx tsc --noEmit --pretty false` terminent avec le code **0**.
- Mobile : `npm run test:mobile-regression` réussit **35/35**; les tests Jest d’onboarding réussissent **5/5**; `./node_modules/.bin/tsc --noEmit --pretty false` termine avec le code **0**.
- Recette navigateur toujours bloquée par l’environnement : `/snap/bin/chromium --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --dump-dom about:blank` refuse de démarrer, car `snap-confine` exige `snapd.apparmor` actif et refuse l’exécution hors confinement. Aucune capture ni recette visuelle authentifiée n’est revendiquée.
- Vérification seule, sans changement de source; aucun APK, rebuild Web, déploiement ou test réel appareil dans cette passe.

### DOC-WEB-01 — centre d’aide intégré, première version — 20 octobre 2026

- Ajout de `/app/help`, accessible depuis le pied du sidebar authentifié. Les guides FR/EN couvrent Work Orders et leur confirmation (durée écoulée vs temps de main-d’œuvre), Requests, équipements, inventaire, planning, profil et paramètres. Les entrées liées aux modules métier sont filtrées par le droit de consultation déjà exposé par l’application; aucune API ou permission n’a été modifiée.
- Contrôles Web : suite complète `node --test --test-reporter=dot scripts/*.test.cjs` réussie; typecheck `tsc --noEmit --pretty false` réussi; Prettier et `git diff --check` réussis; build de production CRA réussi avec `NODE_OPTIONS=--max-old-space-size=2560 CI=true GENERATE_SOURCEMAP=false npm run build`. Le heap borné a évité l’arrêt mémoire constaté sur les premières tentatives.
- Contrôles Mobile de non-régression : `npm run test:mobile-regression` **35/35**, Jest onboarding **5/5** (la suite les a exécutés puis un lancement explicite a confirmé le même résultat), typecheck TypeScript réussi. Aucun fichier Mobile ni comportement métier Mobile n’a changé.
- Restent à faire : relecture par un utilisateur terrain, vérification visuelle responsive/clavier/lecteur d’écran et ajout de captures légères. La recette Chromium authentifiée n’est toujours pas disponible dans cet environnement.

### INT-WEB — transport webhook borné — 20 octobre 2026

- Le client webhook applique des délais de connexion/lecture, désactive les redirections, ne charge pas le corps de réponse du destinataire et ne journalise plus l’URL pouvant contenir un secret. Compilation de l’API et tests de transport ciblés réussis dans `/tmp` (**3/3**), y compris l’identité du JSON sortant UTF-8; le `api/target` local contient un artefact immuable. Contrats et logique métier inchangés.
- Le DNS pinning, la signature du timestamp/ID, l’anti-rejeu, la file durable de livraison/retry et les scopes de clés restent ouverts.

### MOB-REQ — tolérance aux configurations de formulaire absentes ou masquées — 20 octobre 2026

- Les règles de champs des formulaires Request et Work Order ne sont appliquées que si le champ est encore visible et si sa configuration existe. Cela évite un crash lors de la construction du formulaire avec des réglages anciens/incomplets ou un champ retiré par la configuration UI. Les payloads, validations présentes, API et permissions ne changent pas.
- Les tests ciblés couvrent règle présente, règle absente, champ masqué et correspondance du champ `images` avec le champ de formulaire `image`. La suite Mobile mise à jour passe **36/36**, l’onboarding **5/5**, le typecheck et Prettier passent. Recette sur appareil avec profils de configuration réels à faire.

### MOB-WO — tolérance aux règles d’entreprise absentes sur le détail OT — 20 octobre 2026

- Le formulaire OT gérait déjà les règles manquantes, mais `WODetailsScreen` dereférençait directement `workOrderConfiguration.workOrderFieldConfigurations` dans le chargement des dépendances et les contrôles de clôture. Les paramètres absents ou incomplets pouvaient donc interrompre l’affichage du détail avant l’exécution des règles métier.
- Le détail OT consomme désormais une liste vide lorsque la configuration de règles est absente ou invalide. Les règles présentes, les permissions, les champs obligatoires connus, les appels API et le contrat de clôture restent inchangés.
- Le test ciblé couvre configuration absente, null, liste absente, liste null et règles présentes; le test de formulaire Request est également lancé. Suite mobile complète : **36/36**; onboarding Jest : **5/5**; typecheck Mobile, tests Web complets et typecheck Web terminent avec le code **0**. Les profils d’entreprise réels et l’application sur appareil restent à tester.
- Le build Web optimisé termine avec `Compiled successfully`; Prettier et `git diff --check` passent. Aucun APK, commit ou déploiement n’a été effectué.

### WEB-ANALYTICS — détail paginé depuis le graphique OT par statut — 20 octobre 2026

- Le dialogue vide derrière le graphique de statut OT affiche désormais les Work Orders correspondants pour `OPEN`, `IN_PROGRESS` et `ON_HOLD`, avec période et entreprise du rapport, pagination serveur, relance d’erreur et navigation vers le détail. Le drill-down est refusé côté interface sans permission Work Orders; l’endpoint applique les scopes utilisateur/société prévus pour les rôles autorisés.
- La revue a relevé un point de contrat API : la chaîne globale exige une authentification sur les routes non publiques et `whoami` la résout; `getSearchCriteria` limite à la société et documente une consultation OT volontairement ouverte dans cette portée, avec des scopes plus fins pour les rôles qui ont la permission WO et REQUESTER. Confirmer cette règle métier avec la matrice des rôles et les tests d’accès avant de modifier le backend. Aucune exposition anonyme n’a été démontrée par cette revue. Le garde-fou UI limite ce nouveau drill-down selon la permission Web.
- Le filtre de période reprend la date de création utilisée par l’agrégat de statut, sans retirer des OT archivés de la liste si le rapport les a inclus.

### MOB-QA — fiabilisation du test Jest générique — 20 octobre 2026

- Le test de composant d’exemple Expo rend maintenant `MonoText` dans le `PaperProvider` avec le thème QPM et utilise `act` pour monter/démonter le renderer. Il testait le contexte de thème sans le fournir, et laissait une mise à jour React asynchrone après le test.
- Vérification : `npm test -- --runInBand` passe (**3 suites, 9 tests, 1 snapshot**); la suite mobile ciblée passe (**36/36**, avec onboarding **5/5**) et TypeScript Mobile passe. Un avertissement Expo `EXPO_OS` demeure sans échec; aucune source applicative ni dépendance n’a été modifiée.
- Vérification : test critères **1/1**, suite Web complète, typecheck, Prettier et build optimisé réussis. Les autres graphiques d’analyse restent non activés tant que leurs filtres métier spéciaux ne sont pas interprétés explicitement. Recette Chromium authentifiée indisponible dans cet environnement.

### Revalidation Web/Mobile — 21 octobre 2026

- Mobile : `npm run test:mobile-regression` passe **36/36**; Jest passe **3 suites, 9 tests et 1 snapshot**; `tsc --noEmit --pretty false` termine avec le code **0**. La suite vérifie notamment les réglages d’apparence, l’état de sélection des formulaires, les demandes, les Work Orders, la navigation et l’onboarding.
- Web : `node --test --test-reporter=dot scripts/*.test.cjs` et `npx tsc --noEmit --pretty false` terminent avec le code **0**. Aucun échec de régression détecté dans l’état de travail actuel.
- Bundle Mobile Web : `npx expo export --platform web` réussit (**1 895 modules**). Build CRA de production relancé, mais le processus Node s’est arrêté sans journal final ni code de sortie exploitable; le build de cette passe reste **non vérifié**.
- L’audit de cette passe n’a pas reproduit de défaut dans la persistance du thème ou la sélection d’équipement du formulaire Request; l’écran d’accueil natif attend la préférence d’apparence avant de masquer le splash. Le rendu navigateur authentifié, les tests de caméra/NFC et les scénarios API avec profils réels restent des recettes externes et ne sont pas déclarés vérifiés.
- Aucun changement applicatif, de contrat API, de permission ou de données durant cette revalidation. Aucun build APK/IPA, déploiement, commit ou push dans cette passe.

### MOB-WO-04 — revalidation des filtres Date/Timestamp — 21 octobre 2026

- Dans une copie temporaire de l’API, `mvn -Dtest=SearchDateValueConverterTest,WrapperSpecificationTest test` réussit **43/43**. Cette exécution confirme les conversions ISO Date/Timestamp et les opérateurs de filtres couverts par le moteur générique.
- Le run n’a pas utilisé la base de recette ni la requête mobile authentifiée. Il ne prouve donc pas que le payload historique de l’incident est corrigé; conserver MOB-WO-04 ouvert jusqu’à obtention de la trace serveur et validation des listes, filtres et détails avec l’API réelle. L’artefact `api/target` du checkout n’a pas été modifié.

### DOC-WEB-01 — accessibilité du Centre d’aide — 21 octobre 2026

- Le titre visible est maintenant exposé comme titre principal (`h1`) sans changer sa variante visuelle. Les étapes des guides utilisent une vraie liste ordonnée pour les lecteurs d’écran; un statut `aria-live="polite"` annonce le nombre de guides disponibles après recherche, en français et en anglais.
- Validation : tests ciblés Help Center (accessibilité, routes, recherche) **3/3**; suite de scripts Web complète, TypeScript Web, ESLint ciblé, Prettier et `git diff --check` terminent avec le code **0**. La tentative de build CRA n’a pas donné de résultat exploitable dans le runner et a été interrompue; ne pas la compter comme validée. L’accessibilité sémantique est vérifiée dans le code, mais la navigation réelle au clavier/lecteur d’écran et le rendu visuel responsive attendent la recette Chromium authentifiée.
### MOB-DASH — filtre « OT aujourd’hui » aligné sur le fuseau entreprise — 21 octobre 2026

- Le backend calcule le compteur du jour avec le fuseau défini dans les préférences générales de l’entreprise. Les filtres de drilldown Home/Stats utilisaient encore les bornes UTC, ce qui pouvait afficher un nombre différent de la liste ouverte pour les entreprises hors UTC.
- Les bornes du filtre sont maintenant le début du jour local et le début du jour local suivant, en conservant l’intervalle semi-ouvert attendu par l’API. Les journées de changement d’heure sont correctement de 23 ou 25 heures. Fuseau manquant/invalide : fallback UTC, comme le backend.
- Une vérification supplémentaire a trouvé que les filtres utilisaient `gt` au début du jour alors que l’API compte l’intervalle semi-ouvert `[début, fin)`. Les deux drilldowns emploient maintenant `ge` puis `lt`; `SearchOperation` backend confirme ces opérateurs, et le test des écrans protège cette correspondance.
- Vérification : tests ciblés fuseau/DST/bornes réussis; suite `npm run test:mobile-regression` **36/36**, Jest onboarding **5/5**, `tsc --noEmit --pretty false`, Prettier et `git diff --check` réussis. Aucun contrat API, donnée ou permission modifié. Recette sur compte et appareil réels à faire.

### MOB-WO — reconnaissance des erreurs réseau natives — 21 octobre 2026

- Les erreurs de fetch React Native peuvent être formulées comme `Network request failed` ou porter les codes `ERR_NETWORK`, `ECONNREFUSED` et `ECONNRESET`. Le classificateur Work Orders et le gestionnaire global les dirigent maintenant vers un message réseau localisé; le texte brut n’est pas montré à l’utilisateur. Les erreurs HTTP 4xx/5xx conservent leurs catégories.
- Tests de non-régression dans `scripts/work-order-load-errors.test.cjs` et `scripts/mobile-regression.test.cjs`; suite Mobile **36/36**, onboarding **5/5**, TypeScript Mobile et Prettier passent. Aucun contrat API, flux métier ou droit n’a changé. Le message affiché lors d’une vraie panne réseau reste à valider sur appareil.

### WEB / UX-06 — progression accessible de l’assistant d’intégration — 21 octobre 2026

- L’étape active du guide d’intégration est annoncée par un statut accessible et localisé (FR/EN); le Stepper expose aussi l’étape en cours. Le parcours, ses liens, droits et interactions restent identiques.
- Test Hub ciblé : **3/3**; suite Web et typecheck terminés avec le code **0**, ESLint, Prettier et `git diff --check` réussis. Le lecteur d’écran n’est pas disponible dans l’environnement; validation assistive réelle à conserver dans la recette Web.

### WEB / UX-10 — retrait du drill-down imprécis des tendances Request — 21 octobre 2026

- Les points de durée moyenne de cycle pouvaient ouvrir une liste filtrée seulement par date, alors que la moyenne inclut uniquement les demandes associées à un WO terminé et que certains points agrègent une plage de plusieurs jours. Le graphique reste informatif sans prétendre ouvrir ces lignes comme cohortes exactes.
- Un drill-down précis attend un endpoint/filtre qui expose les limites de période et la population du calcul. Vérification : test analytics **6/6**, suite Web complète, typecheck, ESLint, Prettier et `git diff --check` réussis; aucun changement d’API, calcul ou permission.

### WEB / UX-14 — survol visible des sous-entrées du sidebar — 21 octobre 2026

- Le token de survol passe à un bleu pâle QPM un peu plus lisible, accompagné d’un repère bleu sur la sous-entrée survolée. Le contraste texte AA est conservé; routes, sélection active et comportement clavier ne changent pas.
- Tests ciblés sidebar **3/3** et thème/contraste **23/23** réussis. Contrôle visuel Chromium responsive authentifié toujours ouvert.

### WEB / Équipements — chemins hiérarchiques dans les exports — 21 octobre 2026

- Les exports CSV distinguent maintenant le chemin des équipements et le chemin du poste technique d’installation; l’export des postes techniques contient le chemin complet de l’arbre. Les UUID `exchangeId` restent les clés de rattachement lors de l’import, et les chemins sont des repères lisibles pour revue et rapprochement.
- Protection contre les cycles hérités au formatage du chemin. Compilation Java et `CsvFileGeneratorTest` **23/23** passés dans `/tmp` avec Mockito autorisé à s’attacher à la JVM; tests ciblés Web hiérarchie/sidebar passés. Aucun changement de schéma ou de contrat API; migration de clés encore non appliquée et transfert réel entre bases non testé.

### WEB / Imports — round-trip des colonnes de hiérarchie — 21 octobre 2026

- La conversion du fichier de prévisualisation en payload API n’envoie que les champs de l’entité déclarés dans le mapping. Les colonnes lisibles `Equipment_Hierarchy_Path` et `Functional_Location_Path` restent informatives; les clés `Exchange_ID`, `Parent_Exchange_ID` et `Location_Exchange_ID` sont préservées si elles sont sélectionnées.
- Le parseur du classeur valide la feuille et la ligne d’en-tête; fichier invalide, erreur ou interruption de lecture arrête l’état de chargement et affiche un message localisé. Cela évite un wizard bloqué sans message exploitable.
- `import-payload.test.cjs`, `import-workbook.test.cjs` et `hierarchy-import-preflight.test.cjs` passent; typecheck Web, ESLint ciblé, Prettier et `git diff --check` passent. La base de recette, la migration et l’import/export authentifiés entre deux environnements restent à vérifier.

### Revalidation des régressions Web/Mobile — 21 octobre 2026

- Suite des scripts Web `node --test --test-reporter=dot scripts/*.test.cjs` terminée avec le code **0** après les changements du wizard d’import.
- Suite Mobile `npm run test:mobile-regression` : **36/36**; tests onboarding : **5/5**. Les deux exécutions d’onboarding déclenchées par la commande combinée ont réussi.
- TypeScript Web et Mobile, ESLint ciblé, Prettier et `git diff --check` passent. Aucun test visuel authentifié, appel contre l’API de production, build APK, commit, push ou déploiement n’a été effectué.

### MOB-WO — stabilité de la configuration pendant le chargement — 21 octobre 2026

- Quand les préférences société ne contiennent pas encore `workOrderFieldConfigurations`, le helper retournait un nouveau tableau vide à chaque rendu. Dans le détail d’un WO, ce tableau participe aux dépendances de `getInfos`; son identité changeante pouvait donc relancer l’effet de chargement avant l’arrivée des préférences.
- Le fallback vide est maintenant un singleton immuable, stable entre rendus; la configuration réelle continue d’être utilisée sans transformation. Le test `visible-field-configuration.test.cjs` vérifie l’identité stable en plus de la configuration absente/null et des règles normales.
- Tests ciblés du chargement WO et configuration (**3/3 suites**), régression Mobile (**36/36**), onboarding (**5/5**), TypeScript Mobile, Prettier et `git diff --check` passent. Aucun endpoint, règle métier ou préférence serveur n’a changé.

### WEB/MOBILE — devise XOF / affichage FCFA — 21 octobre 2026

- Le catalogue de devises fournit déjà XOF, utilisé pour le CFA Franc BCEAO. Les formatteurs partagés des deux interfaces affichent désormais un montant configuré XOF sous la forme localisée `FCFA`, sans décimales; les montants vides restent vides et les valeurs malformées gardent le code `XOF` explicite.
- Le profil légal de l’entreprise possède déjà `registrationCountry` (Profil de l’entreprise → Informations légales). Les Paramètres généraux Web le réutilisent pour suggérer XOF quand le code pays est l’un des huit pays UEMOA; l’administrateur confirme explicitement la suggestion. Aucun montant n’est converti et la devise actuelle n’est jamais remplacée automatiquement. Aucune migration ni modification API n’est nécessaire.
- Le défaut global d’inscription reste inchangé tant que le pays légal n’est pas renseigné; langue et fuseau ne servent pas à déduire une devise comptable. Revalidation complète : tous les scripts Web `node --test --test-reporter=dot scripts/*.test.cjs`, typecheck Web, ESLint/Prettier ciblés et build CRA (`Compiled successfully`, heap limité à 1,5 Go) passent. Mobile : régression **36/36**, onboarding **5/5**, test du formateur FCFA, typecheck et Prettier passent. Le premier build Web à 2,5 Go s’est arrêté prématurément; la relance à 1,5 Go a réussi. La vérification avec une organisation UEMOA authentifiée et la recette visuelle sur appareil restent à réaliser.

### Revalidation Web/Mobile et limites de recette visuelle — 21 octobre 2026

- Après l’alignement du format monétaire Web/Mobile, la suite Web complète et les tests ciblés (formatteur, préférences société, métriques du dashboard) passent. TypeScript, ESLint/Prettier ciblés et `git diff --check` passent aussi. Mobile : régression **36/36**, onboarding **5/5**, test du formatteur et typecheck passent; les exports Hermes JavaScript iOS (**2 223 modules**) et Android (**2 232 modules**) réussissent. Ces exports ne génèrent ni IPA ni APK et ne valident pas les appareils.
- Le build de production Web s’arrête avant la fin avec le diagnostic « process exited too early », vraisemblablement faute de mémoire; compilation production non validée pour ce lot. La recette Chromium n’a pas démarré : le navigateur d’automatisation ne trouve pas son binaire Chrome stable, Chromium Snap refuse le lancement à cause d’AppArmor/snapd et l’accès au serveur local est refusé par l’environnement isolé. Cela ne prouve pas que le serveur de l’application soit indisponible.
- À faire : relancer le build Web en CI/runner disposant de mémoire, puis recette Chromium authentifiée avec comptes de test, sans enregistrer de secrets ni captures contenant des données personnelles. Aucun APK/IPA, appel production, commit, push ou déploiement n’a été fait.

### WEB / Achats — confirmation de l’effet de l’approbation sur le stock — 21 octobre 2026

- Audit des chemins existants : `PurchaseOrderController.respond(true)` crédite immédiatement l’inventaire avec les quantités entières du bon; le formulaire peut déclencher cette approbation à la création via « Approuver lors de la soumission ». Le modèle ne distingue pas quantité commandée, reçue et restante. Il ne s’agit donc pas d’une réception physique validée et aucune réception partielle n’est représentée.
- Le détail demande désormais une confirmation explicite avant l’appel d’approbation et avertit que toutes les lignes sont créditées immédiatement. Le commutateur de création porte la même explication. Contrat API, permissions et logique serveur restent inchangés; l’UI rend l’effet actuel plus visible, elle ne le corrige pas.
- Tests de régression ajoutés pour garantir la confirmation, le maintien du dialogue en cas d’échec API et les textes localisés. Suite frontend complète, TypeScript, lint ciblé, Prettier et `git diff --check` passent. Le build de production CRA a échoué avec « process exited too early » avant d’aboutir; il n’est pas validé.
- Contrôle des permissions : les actions étaient auparavant visibles selon `SETTINGS.view`, mais l’API exige `ROLE_CLIENT` et `PURCHASE_ORDERS.editOther`. Le détail et l’option de préapprobation utilisent maintenant le même prédicat que l’endpoint; cela évite un bouton qui échoue en 403 et la création partielle déclenchée par un droit non suffisant. Contrat serveur inchangé.
- **Ouvert P1 métier/intégrité** : concevoir séparément une réception effective et partielle, avec quantités reçues, idempotence, audit, droits, correction des données historiques et migration/API. Ne pas changer le comportement d’approbation vers une réception sans décision métier et migration revue.

#### Proposition métier — réception partielle distincte de l’approbation

- **Décision recommandée :** conserver l’approbation comme décision d’achat; elle ne doit pas augmenter le stock. La réception est une action distincte, enregistrée quand les pièces arrivent et sont contrôlées. Cette séparation reprend les principes décrits par SAP pour les réceptions partielles, l’historique d’achat et la réversion de mouvements; les statuts exacts varient selon le produit SAP et doivent être adaptés à QPM ([SAP — Receiving Overview](https://help.sap.com/docs/buying-invoicing/purchasing-guide-for-procurement-professionals/about-receiving), [SAP — Goods Receipts: Document Processing](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/9905622a5c1f49ba84e9076fc83a9c2c/b19ac7536e8e2a4be10000000a174cb4.html), [SAP — Cancellation of Goods Movements](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/7bdbc353b677b44ce10000000a174cb4.html)).
- **Cycle proposé :** `APPROVED/ORDERED` → première réception `PARTIALLY_RECEIVED` → réception complète `RECEIVED`; une fermeture courte explicite termine le reliquat sans prétendre l’avoir reçu. Garder l’approbation d’achat et la réception hors d’une même action ou transaction utilisateur.
- **Données minimales à spécifier avant migration :** document de réception et lignes liées au bon/ligne, quantité reçue par ligne et unité, date/acteur, référence de livraison ou bon fournisseur facultative, quantité acceptée/refusée si l’inspection est activée, statut et motif de clôture du reliquat. L’historique des réceptions est append-only; une erreur se corrige par une réception d’annulation liée à l’original, jamais par l’effacement silencieux d’un mouvement déjà comptabilisé.
- **Règles d’intégrité :** quantité positive strictement supérieure à zéro; réception cumulée ne dépassant pas la quantité commandée moins les annulations, sauf décision explicite de sur-réception; opération idempotente; mise à jour du stock et écriture de réception dans la même transaction; contrôle de concurrence sur le reliquat; contrôle des droits achat et du périmètre site/magasin; journal de l’utilisateur et de l’horodatage. La quantité disponible ne change qu’au moment où la réception est validée.
- **Critères d’acceptation P1 :** approbation seule ne change pas le stock; deux livraisons partielles créent deux traces et actualisent le reliquat; double soumission ne double pas le stock; livraison finale ferme la ligne; clôture courte garde le reliquat non reçu visible; annulation référence et contre-passe le mouvement original une seule fois; utilisateur sans droit et utilisateur d’un autre site/société sont refusés; l’écran affiche commandé, reçu, annulé, restant et unité sans confondre réception et approbation.
- **Plan d’exécution :** d’abord confirmer si QPM gère réception au niveau bon ou magasin, les unités fractionnaires, la tolérance de sur-réception, l’inspection/stock bloqué, et les droits de clôture courte/annulation. Ensuite concevoir migration additive et contrat API; migrer les anciennes commandes approuvées vers un état historique « stock crédité par approbation », sans fabriquer de documents de réception. Le flux actuel reste en place jusqu’à validation de ces règles.
- **Écart Mobile partiellement résolu :** `mobile/screens/purchaseOrders/PurchaseOrdersScreen.tsx` fournit maintenant une consultation paginée et en lecture seule depuis Plus, conditionnée par le droit `PURCHASE_ORDERS.view` et le plan `PURCHASE_ORDER`. Elle affiche les quantités commandées. La future file « à recevoir », les quantités reçues/reliquat et la confirmation d’une réception ne peuvent être ajoutées avant le contrat métier/API distinct; ne pas exposer l’approbation comme réception physique.
- **État du code à réutiliser :** `PurchaseOrderController.respond` est le point d’approbation et crédite aujourd’hui chaque `Part.quantity` à partir des `PartQuantity` liées au bon; `PurchaseOrder.status` ne représente que `PENDING/APPROVED/REJECTED`. `PartQuantity.quantity` est la quantité commandée ou affectée et ne porte aucun cumul reçu. Les actions approbation sont protégées par `PURCHASE_ORDERS.editOther`; la lecture/écriture par ID dépend aussi des gardes `CompanyAudit.@PostLoad` et `TenantAspect` (ce dernier vérifie les entités référencées dans les corps POST/PATCH), avec accès inter-société prévu pour le super-compte. Ajouter des tests HTTP d’isolation avant de remanier ces contrôles : l’absence de `findByIdAndCompanyId` visible dans le contrôleur n’établit pas, seule, une faille.
- **Risque technique à traiter avec le nouveau service transactionnel :** l’approbation met à jour les pièces en boucle puis le statut du bon. Une réception dédiée doit garantir atomicité stock + document et éviter doublons lors d’un retry; le dispatch webhook doit être publié après commit pour ne pas annoncer un mouvement annulé. Ne pas simplement déplacer l’incrément de stock dans un autre écran Mobile.
- **Garde-fou implémenté — approbations concurrentes :** l’action actuelle « approuver » ouvre maintenant une transaction et verrouille le bon (`PESSIMISTIC_WRITE`) avant le contrôle de statut et les mises à jour des quantités. Un second clic/retry concurrent attend la fin du premier et ne peut plus appliquer une seconde fois le même approvisionnement; les événements de variation de stock partent seulement après commit. Aucun contrat API ni schéma ne change. Compilation Java complète et tests ciblés **10/10** réussis dans une copie temporaire; le test protège les annotations transaction/verrouillage, mais un test concurrent réel contre PostgreSQL reste requis.

### Mobile / consultation des bons de commande — 21 octobre 2026

- Ajout d’une entrée « Bons de commande » dans Plus, affichée seulement aux comptes dotés de `PURCHASE_ORDERS.view`; la route est également protégée côté navigation et l’écran revalide le droit. Le backend garde le filtrage société/créateur sur la recherche et l’autorisation de lecture sur le détail.
- La liste utilise le endpoint existant `POST /purchase-orders/search`, avec pagination, actualisation, états chargement/vide/erreur et reprise après échec. Les cartes affichent statut, fournisseur, date prévue et jusqu’à trois lignes avec **quantité commandée**. Aucun bouton d’approbation, création, édition, suppression ou réception n’est ajouté.
- L’écran indique explicitement que les réceptions et mouvements de stock ne sont pas suivis dans cette vue. Il n’invente ni quantité reçue ni statut `RECEIVED`. La réception partielle demeure un chantier Web/API/Mobile séparé, dépendant de la définition des droits, des unités, de l’inspection, du reliquat et de la migration décrits ci-dessus.
- Vérifications : test dédié de permissions/lecture seule, typecheck TypeScript Mobile et Prettier passent. Tests visuels Android/iOS et requête avec utilisateur réel restent à effectuer; aucun APK, commit, push ou déploiement n’a été réalisé.

### Revalidation Web/Mobile — 21 octobre 2026

- Web : `node --test --test-reporter=dot scripts/*.test.cjs` et le typecheck TypeScript terminent avec le code **0**.
- Mobile : `npm run test:mobile-regression` passe **37/37**; les tests Jest d’onboarding passent **5/5**; le typecheck TypeScript termine avec le code **0**.
- Cette passe n’a modifié aucun code applicatif. Elle ne remplace pas les recettes Chromium authentifiées, API avec rôles réels, appareils Android/iOS ou l’application des migrations requises; aucun build, déploiement, commit ou push n’a été effectué.

### Nouvelle passe Mobile achats + validation production Web — 21 octobre 2026

- Mobile : les bons de commande apparaissent dans Plus seulement si le rôle possède `PURCHASE_ORDERS.view` et si le plan expose `PURCHASE_ORDER`; l’écran revalide les deux conditions. La consultation est paginée et strictement en lecture seule, et affiche les quantités commandées. Tests dédiés, suite Mobile **38/38**, onboarding **5/5**, TypeScript et Prettier passent.
- Web : suite `node --test --test-reporter=dot scripts/*.test.cjs` réussie. Le build optimisé CRA passe avec heap Node plafonné à 2 Go et sourcemaps désactivées pour ce runner. Aucun test navigateur authentifié n’a été possible.
- Aucune API ni migration n’a été ajoutée pour la réception partielle; le flux demande encore une spécification métier et une migration séparée. Aucun APK/IPA, commit, push ou déploiement n’a été réalisé.

### SEC-WEB — contrôle HTTP des lectures de clés API — 21 octobre 2026

- Les contrôles d’écriture et de tenant étaient déjà couverts par `ApiKeyServiceTenantIsolationTest`; la lacune restante était l’absence de vérification aux routes. Le nouveau test MVC vérifie qu’un utilisateur Client sans `SETTINGS.view` reçoit 403 sur la recherche et le détail et qu’aucun accès au service n’est effectué.
- Tests MVC + service : **7/7** réussis dans une copie temporaire Maven; aucune route, permission, donnée ou migration n’a été changée. Reste à valider les mutations sous une session HTTP complète et les rôles/abonnements réels en environnement de recette.

### Mobile — isolation des réponses tardives des bons de commande — 21 octobre 2026

- Le slice `mobile/slices/purchaseOrder.ts` associe désormais ses lectures et mutations à une génération de session. `revertAll` incrémente cette génération; une réponse reçue après déconnexion ou changement de compte ne peut plus réinjecter un bon de commande dans l’état Redux de la nouvelle session. Les réponses de la session courante et les indicateurs de chargement restent fonctionnels.
- La vérification a aussi révélé que le thunk de pagination appelait `slice.actions.getMorePurchaseOrders`, action absente du slice. Le reducer d’ajout de page est maintenant défini et son test confirme le cumul de pages sans casser la liste.
- Cette protection concerne l’état local de l’application : elle ne prétend pas annuler une opération déjà acceptée par le serveur. Aucun contrat API, droit, règle métier ou schéma n’a été modifié. Tests de course session/réponse et de lecture normale : **2/2 scripts** réussis; suite Mobile **39/39**, onboarding **5/5**, disponibilité des équipes **5/5**, typecheck TypeScript et contrôle Prettier réussis. Aucun APK, commit, push ou déploiement n’a été réalisé.

### Mobile — isolation des résultats tardifs Assets et Work Orders — 21 octobre 2026

- L’audit a trouvé des réponses tardives qui pouvaient repeupler les caches d’actifs et de bons de travail après `revertAll` lors d’une bascule de société. La génération de session protège maintenant les détails, les sélecteurs et listes associées d’équipement, les données de calendrier et les résultats des mutations Asset/Work Order. Les listes paginées gardent aussi leur protection existante par ID de requête et vérifient la génération de session.
- Tests différés vérifient qu’une réponse de la société précédente ne repeuple ni le sélecteur d’actifs, ni le détail d’actif, ni le détail Work Order; les tests de chargement partagé continuent de passer. Régression Mobile **41/41**, onboarding **5/5**, disponibilité des équipes **5/5**, TypeScript et Prettier réussis. Aucun contrat API, permission ou schéma n’a changé; aucun APK, commit, push ou déploiement n’a été effectué. Recette sur appareil avec bascule de comptes reste à faire.
# WEB / MOBILE — isolation des réponses Request au changement de session — 21 octobre 2026

- Les listes, détails et compteurs de demandes d’intervention pouvaient être réécrits par une réponse API démarrée sous le compte précédent. Les reducers Web et Mobile portent maintenant une génération de session; les lectures et mutations de la génération précédente sont écartées après `revertAll`. Les listes paginées Mobile gardent aussi leur garde de requête la plus récente.
- Couverture de régression : résolution tardive d’un détail et d’un compteur Web, résolution tardive d’un détail et d’une liste Mobile. Les tests Request CRUD, erreurs de chargement et approbation/rejet restent verts. Aucun endpoint, droit, statut métier ou donnée serveur n’a changé.
- Vérification : suite complète Web, TypeScript Web/Mobile, ESLint ciblé, Prettier et `git diff --check` réussissent; régression Mobile complète ainsi que tests onboarding (**5/5**) et disponibilité des équipes (**5/5**) réussissent. Une recette authentifiée avec deux comptes/sociétés reste nécessaire pour valider le changement de session en conditions réelles. Aucun build, APK, commit, push ni déploiement n’a été lancé.

### MOBILE — isolation des réponses tardives Pièces / Inventaire — 21 octobre 2026

- L’inventaire Mobile pouvait repeupler les détails ou la mini-liste de pièces après un changement de compte. La génération de session protège maintenant les listes paginées, détails, sélecteurs mini, chargement, création, édition, suppression et ajustement de stock dans le cache local.
- Le restock API reste inchangé; si le compte change pendant l’appel, la réponse ne modifie pas l’inventaire affiché dans la nouvelle session. La mutation déjà envoyée au serveur n’est pas annulée par cette protection UI.
- Deux tests différés couvrent les réponses de détail et de sélecteur après `revertAll`. Régression Mobile complète (**43 scripts**), onboarding (**5/5**), disponibilités (**5/5**), TypeScript et Prettier passent. Aucun endpoint, droit, schéma ou contrat n’a changé. La vérification sur appareil avec deux comptes reste ouverte.

## Document Management — backlog d’intégration préparé par audit — 21 octobre 2026

Référence d’audit et de besoins : [`QPM_MASTER_PROMPT_DOCUMENT_REPORT_MANAGEMENT.md`](QPM_MASTER_PROMPT_DOCUMENT_REPORT_MANAGEMENT.md). Ce prompt décrit une cible; il ne prouve pas que ces fonctions existent déjà. La base actuelle doit être étendue progressivement.

### État vérifié à réutiliser

- **Backend :** `GeneratedDocumentService`, `GeneratedDocumentController`, `GeneratedDocument` et `GeneratedDocumentRepository` gèrent l’émission, l’historique et le téléchargement d’un PDF d’ordre de travail. Routes existantes : `POST /work-orders/{id}/report/issue`, `GET /work-orders/{id}/documents`, `GET /documents/{id}/download`. Les métadonnées incluent société, site, source, émetteur, date, empreinte SHA-256, instantané de contexte et version fixe `work-order-report-v1`.
- **Rendu :** `WorkOrderService.generatePdfStream/generatePdfBytes` utilise le contexte métier courant, Thymeleaf et iText HTML2PDF avec `work-order-report.html`. Les informations légales et la mise en page paysage A4 sont déjà gérées; ne pas reconstruire le flux WO.
- **Web :** `ReportConfigModal.tsx` couvre l’aperçu PDF, l’émission/archivage, l’historique et le téléchargement avec le client API existant.
- **Mobile :** `mobile/slices/workOrder.ts` utilise encore `GET /work-orders/report/{id}`. L’émission officielle, l’historique et le téléchargement n’ont pas de parcours unifié avec Web.
- **Non présent dans le dépôt vérifié :** registre dynamique des types/providers/champs, concepteur de modèles, versions publiées immuables, templates configurables WR/PR/PO et jobs de rendu asynchrones.
- **P0 fonctionnel confirmé :** `GeneratedDocumentService.issueWorkOrderReport` exigeait `canBeViewedBy` et `canBeEditedBy`. `WorkOrder.canBeEditedBy` retourne faux pour `COMPLETE`; le rapport officiel ne pouvait donc pas être émis après clôture. Le correctif DOC-01 ci-dessous permet l’émission sans rouvrir l’édition et garde les contrôles société et accès objet.
- **P1 sécurité / limite du modèle :** l’audit des modèles `User`, `Role`, `Company` et `Site` ne trouve pas de relation d’affectation utilisateur-site ni d’autorité site-scoped. Les gardes existantes sont société + permissions/relations objet, pas une isolation individuelle par site. `siteId` dans un document est une métadonnée, pas une preuve d’autorisation. Ne pas annoncer ni tester comme existant un cloisonnement par site; toute exigence d’accès restreint par site demande d’abord une décision produit/sécurité et un audit transversal des endpoints.
- **Tests à renforcer :** `GeneratedDocumentServiceTest` couvrait principalement l’émission réussie et ses métadonnées. Ajouter les refus par rôle/société, l’émission WO clôturée, le téléchargement après révocation d’accès à la source et les erreurs de rendu/stockage. Un test d’isolation individuelle par site attend une règle utilisateur-site explicite, absente du modèle audité.
- **Licence :** le dépôt déclare AGPL et utilise iText (`kernel`, `html2pdf`, `font-asian`). Faire valider la compatibilité entre licence iText, distribution et modèle d’exploitation de QPM; la présence de ces dépendances ne suffit pas à conclure à une non-conformité.

### Backlog priorisé et critères d’intégration

| Priorité / ID | Lot | Critères d’acceptation et surface probable |
| --- | --- | --- |
| **P0 — DOC-01** | Émission sûre après clôture WO | Distinguer consultation, édition métier et émission. L’émission fonctionne sur WO `COMPLETE` pour les acteurs autorisés par la règle actuelle (WO visible et droit editOther, créateur ou assigné); un lecteur seul ne gagne aucun droit d’écriture. Vérifier objet, société, liste/téléchargement, WO absent, source inaccessible et échec du stockage. Pas de migration attendue. |
| **P1 — DOC-02 (intégration faite, QA appareil ouverte)** | Contrat commun Web/Mobile | Le cycle « aperçu non officiel → émission archivée → historique → téléchargement authentifié » et DTO actuels sont documentés; Web et Mobile consomment les routes existantes. À valider sur appareils : ouverture/partage PDF, session expirée, réseau indisponible et accès refusé; garder le endpoint signé déprécié tant que des versions compatibles peuvent l’appeler. |
| **P1 — DOC-03 (provider WO v1 consommé par DOC-05)** | Providers et catalogue de champs sûrs | `GET /work-orders/{id}/report/fields` expose des descripteurs allowlistés; `POST /work-orders/{id}/report/preview-data` résout uniquement les bindings WO non financiers explicitement supportés et recontrôle société + `canBeViewedBy`. Le renderer DOC-05 consomme le provider v1; le sélecteur Web expose sa liste supportée actuelle. Restent le branchement direct du catalogue de champs et l’intégration des tâches/commentaires/historique via sources vérifiées. Request est couvert par DOC-07; PurchaseOrder demeure suspendu à une politique de coûts. Aucun SQL, script, URL distante ou expression arbitraire du client. |
| **P1 — DOC-04 (implémenté localement, validé sur PostgreSQL jetable)** | Schéma JSON de template versionné, minimal | Décision et contrat approuvés le 22/10/2026. Entités `document_type`, `document_template`, `document_template_version`, configurations JSONB, validation via providers allowlistés, publication/archivage, tenant scope et permission SETTINGS existante. Migration additive; replay complet sur PostgreSQL 16 jetable et démarrage Spring Boot avec `ddl-auto=validate` réussis. `ReportConfig` reste disponible. Non appliqué en production. |
| **P1 — DOC-05 (implémenté localement, non déployé)** | Premier template WO configurable | Réutilise Thymeleaf/iText avec champs allowlistés, branding légal, Classic/Compact, pagination et A4/Letter portrait/paysage. Aperçu PDF sans archivage puis émission officielle depuis une version publiée, liée à l’archive exacte. Sélecteur Web branché au détail WO; le flux `work-order-report-v1` reste disponible. |
| **P2 — DOC-06 (bibliothèque Web implémentée localement)** | Bibliothèque de modèles Web | `/app/settings/documents` liste/recherche les templates, crée/modifie/duplique un brouillon, consulte l’historique, choisit les champs/page, prévisualise le brouillon ou la version publiée via un WO autorisé, publie par défaut ou archive avec confirmation. À faire avant livraison : recette authentifiée navigateur et vérification sur données de recette. |
| **P2 — DOC-07 (Request PDF intégré localement, recette navigateur restante)** | Demandes / Achats | Le template `REQUEST` et le cycle Request sont intégrés : modèle distinct dans la bibliothèque, aperçu PDF, émission archivée, historique et téléchargement avec recontrôle des droits; aucune mutation approbation/WO. Replay des 849 changesets sur PostgreSQL 18 temporaire, Hibernate `ddl-auto=validate` et démarrage Spring Boot réussis. Reste la recette Web authentifiée. Le provider `PurchaseOrder` attend une décision sur les droits des coûts; total calculé backend. Pas de PDF PR sans vrai modèle PR. |
| **P2 — DOC-08 (intégration faite, QA appareil ouverte)** | Documents officiels sur Mobile | Aperçu authentifié, émission confirmée, historique et téléchargement authentifié intégrés au détail WO; pas de designer sur téléphone. Valider permissions et ouverture/partage sur Android/iOS réels. Configuration mobile basée sur les options par défaut serveur; vérifier si la sélection de sections est réellement nécessaire. |
| **P2 — DOC-09** | Preuve d’extensibilité Equipment Handover | Créer un type de certificat via le provider Asset, champs existants et données personnalisées déclaratives, puis produire le PDF sans code spécifique au type. Si QPM ne stocke pas condition/remise/signatures, ne pas inventer ces valeurs; décider séparément si un vrai workflow métier est requis. |
| **P2 conditionnel — DOC-10** | Worker et jobs durables | Garder le rendu synchrone actuel jusqu’à mesure de saturation, latence ou mémoire. Si l’isolation est justifiée, borner ressources, concurrence, pages/taille et durée; désactiver réseau par défaut; ajouter idempotence, retries bornés, états, logs corrélés et stockage privé. Préférer d’abord la file PostgreSQL ou un mécanisme présent; pas de Kafka/Kubernetes/microservice par défaut. |
| **P3 optionnel — DOC-11** | Jasper/Crystal | Vérifier installation/version SAP BO, API/runtime compatibles, licence, OS et besoin d’entreprise avant tout adaptateur. Le moteur PDF natif reste utilisable sans ces outils; aucune exécution `.rpt` ne sera annoncée sans preuve de runtime compatible. |
| **P1 transversal — DOC-12** | Sécurité, rétention et exploitation | Valider licence, durée de conservation/suppression, stockage privé, contrôle d’accès à chaque téléchargement, empreintes, audit sans contenu sensible et limites de rendu. Tester société/rôle/objet, bindings inconnus, ressource malveillante, panne moteur et régressions métier. Décider séparément si un cloisonnement individuel par site est requis; ce contrôle n’est pas représenté dans le modèle utilisateur actuel. |

### Séquence recommandée

1. DOC-01 et tests d’autorisation, car l’émission post-clôture bloque l’archivage métier.
2. DOC-02 et DOC-12 pour fixer cycle, contrat, permissions, conservation et licence.
3. DOC-03 puis DOC-04 pour ajouter le provider et le format versionné sans casser le rapport existant.
4. DOC-05 comme premier incrément de modèle configurable sur WO, puis DOC-06 (administration Web); DOC-08 est intégré au niveau client et attend la recette d’appareil.
5. Terminer la recette DOC-07 Request, puis DOC-09 pour prouver l’extensibilité sur Asset; ne reprendre PurchaseOrder qu’après décision explicite sur les coûts.
6. DOC-10/11 uniquement sur preuve de charge ou exigence d’intégration confirmée.

**Garde-fous :** ne pas remplacer `GeneratedDocument` d’un coup, ne pas publier des URLs permanentes publiques, ne pas rendre une génération PDF dépendante d’une mutation du dossier métier, et ne pas migrer la base avant validation du contrat JSON, des autorités et du rollback. L’audit initial n’a modifié ni code ni données; les correctifs ultérieurs sont consignés dans la progression ci-dessous.

### Progression après audit — DOC-01 et DOC-02 — 21 octobre 2026

- **DOC-01 terminé :** `WorkOrder.canIssueReportBy` reprend la société, la visibilité et la relation/droit d’édition existants, mais n’applique pas l’interdiction d’édition du statut `COMPLETE`. `GeneratedDocumentService` utilise cette autorisation à l’émission. Les WO clôturés ne deviennent donc pas éditables; un utilisateur lecture seule reste refusé avant rendu/stockage; un autre tenant est rejeté avant rendu. Test `mvn -o -Dtest=GeneratedDocumentServiceTest test` : **5 tests, 0 échec**, couvrant émission normale, WO clôturé, lecteur refusé, tenant étranger refusé et téléchargement après perte d’accès au WO. Les règles de liste/téléchargement n’ont pas été élargies.
- **Limite site consignée :** l’application n’a pas d’affectation utilisateur-site identifiable dans les modèles audités. Les règles de génération conservent les contrôles existants par société et objet; DOC-12 exige une décision distincte si des utilisateurs doivent être cloisonnés par site.
- **DOC-02 — cycle Mobile intégré :** le client utilise maintenant les endpoints authentifiés existants pour l’aperçu sans archive, l’émission avec confirmation, l’historique et le téléchargement. Le verrou d’action empêche les doubles soumissions; les états de chargement/vide/erreur sont visibles. Les réponses d’historique lancées sous l’ancien compte sont écartées après un changement utilisateur/société. Les PDF sont vérifiés comme `application/pdf`, convertis en conservant les octets binaires au-delà des blocs de 32 Kio, écrits dans le répertoire privé puis ouverts; le parcours ne demande plus la permission générale de stockage Android. L’ancien lien signé reste disponible côté serveur pour les APK déjà distribués. Le client Mobile utilise la configuration de rapport par défaut du serveur; les choix de sections restent proposés sur le Web seulement.
- **Vérification locale DOC-02 :** suite Mobile (**43 scripts**, dont contrôle des routes et des états), test de conversion Base64 sur données binaires couvrant la frontière de bloc, TypeScript Mobile et Prettier réussissent; les tests backend `GeneratedDocumentServiceTest` restent **5/5**. Les tests de code ne remplacent pas la recette d’ouverture/partage PDF sur appareils Android/iOS; celle-ci reste à faire. Aucun APK, changement de contrat API, permission, migration, commit, push ou déploiement n’a été effectué.
- **Prochain incrément :** recette authentifiée sur téléphone des quatre actions, y compris compte autorisé/non autorisé, puis décider si Mobile doit permettre la sélection de sections ou garder le rapport standard. Retirer le endpoint legacy uniquement après preuve qu’aucune version supportée ne l’appelle.

### Progression DOC-03 — catalogue WO initial — 21 octobre 2026

- Route additive `GET /work-orders/{id}/report/fields` ajoutée. Elle renvoie une allowlist de clés typées/groupées et des métadonnées de sections, sans valeurs métier ni exécution de chemins fournis par le client. L’accès est revalidé par société et `canBeViewedBy`; un utilisateur sans visibilité sur un WO d’un autre créateur reçoit un refus.
- Le catalogue initial porte sur les sections présentes dans le rapport WO actuel, notamment identité WO, équipement/localisation, société, exécution, historique, pièces et coûts. Les descripteurs de coûts sont signalés `sensitive`. Cette étiquette ne constitue pas une permission : l’audit n’a trouvé aucune permission dédiée aux coûts. L’interface de configuration ne doit donc pas rendre ces champs sélectionnables avant décision de politique et contrôle serveur correspondant.
- Pas de migration, changement du PDF existant, ni modification des API d’aperçu/émission. Le provider de valeurs est séparé de ce premier catalogue et WR/PR/PO restent hors de l’allowlist.
- Validation : `cd api && mvn -o -Dtest=GeneratedDocumentServiceTest test` réussit (**7 tests, 0 échec**), couvrant l’émission existante, ses restrictions, l’accès au catalogue, l’absence de bindings arbitraires et le refus d’accès à un WO non visible. La première exécution avait révélé une fixture trop permissive (`viewOther` activé); elle a été corrigée conformément à la sémantique réelle du rôle.
- Défaut PDF corrigé en parallèle : la décision de transformer le rapport RTL comparait la chaîne de direction avec `==`. Elle utilise maintenant une comparaison de valeur (`"rtl".equals(...)`), sans changer les données du rapport. La compilation et `GeneratedDocumentServiceTest` réussissent après ce changement (**7/7**); aucun test de rendu PDF visuel RTL n’a été exécuté.

### Audit des providers Request / Purchase Order — 21 octobre 2026

- `Request` hérite des champs de maintenance et peut référencer le WO créé à l’approbation; aucune génération PDF existante n’a été trouvée. Le document Request doit rester une lecture et ne doit jamais appeler l’action d’approbation.
- `PurchaseOrder` est le module d’achat existant; pas d’entité Purchase Request distincte repérée. Son détail contient des lignes `PartQuantity` et `PartMiniDTO.cost`, et le total de liste est calculé côté frontend. Un futur document PO devra recalculer le total côté backend et ne jamais appeler `respond`/réception.
- Droits relevés : `REQUESTS.view` et `PURCHASE_ORDERS.view`, limités par `viewOther`/créateur/assigné selon le modèle. Aucun droit de coût séparé ni autorisation utilisateur-site n’a été trouvé. Cet audit ne crée aucun endpoint, migration ou provider; les constats et chemins sont dans `DOCUMENT-MANAGEMENT-INTEGRATION-CONTRACT.md`.
- Le test de catalogue couvre maintenant aussi le cloisonnement société : une société étrangère reçoit `404`; suite `GeneratedDocumentServiceTest` **8/8** réussie après recompilation backend.

### WEB / DOC-02 — robustesse de l’historique et des téléchargements — 21 octobre 2026

- Le chargement d’archives est maintenant lié à l’ouverture du dialogue et au WO courant : fermeture, démontage ou changement de WO invalide la réponse précédente. Les états chargement, vide et erreur sont distincts; une erreur de liste propose une relance localisée.
- Le téléchargement authentifié vérifie maintenant le type MIME `application/pdf` et refuse aussi un fichier vide avant de créer le téléchargement. L’URL objet est libérée après que le navigateur ait eu le temps de démarrer le transfert. Les contrôles d’accès et endpoints backend restent inchangés.
- Vérification : test `issued-documents-modal.test.cjs`, suite de scripts Web complète, ESLint ciblé et TypeScript Web réussis; Prettier ciblé réussi. Le build CRA de production a été lancé, mais le processus n’a fourni aucun résultat exploitable avant son arrêt; le build n’est donc pas revendiqué. La recette Web authentifiée et le téléchargement depuis un stockage de recette restent à effectuer.

### WEB — lisibilité au survol de la navigation imbriquée — 21 octobre 2026

- Le token de survol du sidebar est plus visible sur sa surface claire. Les icônes et le repère des sous-entrées utilisent l’accent QPM, tandis que les libellés restent lisibles et que l’état sélectionné garde son style distinct. Aucun endpoint, permission, route ou workflow n’a changé.
- Vérification : tests ciblés de navigation/layout/contraste, suite Web complète, TypeScript, ESLint, Prettier et `git diff --check` réussis. Rendu authentifié Chromium et recette VPS restent à faire.

### MOB-ONBOARD-06 — revalidation de la persistance et des accès — 21 octobre 2026

- Les tests existants du contrôleur et du service `UserSettings` confirment que l’utilisateur ne peut modifier que ses propres préférences, que les versions/états non pris en charge sont refusés et que les mises à jour générales préservent l’état d’onboarding : **7 tests backend réussis**.
- Vérification client : régression Mobile **43/43**, tests onboarding **5/5**, disponibilité des équipes **5/5** et typecheck TypeScript réussis. Aucun code applicatif, migration ou donnée n’a été changé pendant cette revalidation.
- Restent à faire avant livraison : confirmer l’application de la migration dans un environnement de recette, tester skip/fin/replay et bascule de compte sur appareils Android/iOS, puis vérifier l’expérience d’un compte réel avec différentes permissions. Ces résultats locaux ne valent pas recette de production.

### WEB/MOBILE — reprise visible des états d’erreur et de recherche — 21 octobre 2026

- **Web Work Orders :** l’échec du chargement de la checklist était absorbé, laissant la section absente sans distinguer l’erreur d’une liste vide. L’écran détail expose maintenant un message localisé et une action de reprise; succès et échec ne montrent pas les détails internes de la réponse serveur. Aucun endpoint, permission ou état métier ne change.
- **Mobile Équipements :** la liste affiche désormais uniquement les résultats associés à la recherche et aux filtres chargés. Pendant une nouvelle recherche, les anciennes lignes ne sont plus visibles et la pagination est bloquée; une erreur de renouvellement conserve les lignes des mêmes critères avec un message de reprise. Les gardes Redux existantes continuent de rejeter les réponses périmées.
- Validation intégrée : suite de scripts Web complète et TypeScript Web réussis; tests Web ciblés **2/2**, ESLint et Prettier ciblés réussis. Mobile : régression **43/43**, onboarding **5/5**, disponibilités **5/5**, TypeScript et Prettier réussis. `git diff --check` passe. La recette authentifiée navigateur, le test réseau/appareil Mobile et les builds distribuables restent distincts et non réalisés dans ce lot.

### WEB/MOBILE — erreurs de planification et pagination périmée — 21 octobre 2026

- **Web Charge de travail :** le dialogue de saisie de durée se fermait avant la réponse de planification; une erreur API faisait perdre les heures saisies et la cible du glisser-déposer. Il reste ouvert avec les valeurs saisies après échec, se ferme seulement après succès et bloque double envoi/fermeture pendant la requête. Le reducer n’applique aucune mutation optimiste en cas d’échec. Routes, permissions et règles de planification restent inchangées.
- **Mobile Ordres de travail :** pendant le délai de recherche, une erreur de pagination de l’ancienne requête pouvait afficher un bouton Réessayer inactif. Le message n’apparaît plus tant que les résultats ne correspondent pas aux critères courants; filtres, pagination et API ne changent pas.
- Vérification : Web tests ciblés **6/6**, TypeScript, ESLint, Prettier et `git diff --check` réussis; la recette authentifiée avec le droit de planification reste à faire. Mobile suite `node --test --test-reporter=dot scripts/*.test.cjs`, TypeScript et Prettier réussis (code retour 0); vérification visuelle sur appareil non effectuée. Aucun APK, déploiement ou changement backend dans ce lot.

### WEB — libellé de l’état vide des compteurs — 21 octobre 2026

- L’écran Compteurs demandait la traduction de la clé vide pour l’action de l’état sans résultat. Le texte de création existait déjà en français et en anglais, mais n’était jamais affiché.
- L’écran utilise maintenant `noRows.meter.action`, sans changer les droits, filtres ou opérations CRUD. Le test `meters-empty-state.test.cjs` vérifie le branchement et la présence des libellés localisés.
- Vérifications ciblées et typecheck Web exécutés; l’essai visuel authentifié reste à faire.

### WEB — reprise après échec des ordres liés à une pièce — 21 octobre 2026

- Dans le détail d’une pièce, l’échec de la requête des ordres de travail associés arrêtait le spinner puis affichait le même état que « aucun ordre lié ». L’erreur rejetée n’était pas traitée et aucune reprise explicite n’était proposée.
- L’onglet distingue maintenant l’erreur de l’état vide et propose Réessayer. Le retry recharge les ordres liés et réaffiche la liste en cas de succès; route, permissions et données restent inchangées. Le message est localisé en français et anglais.
- Le test `part-work-order-load.test.cjs` vérifie l’échec suivi d’une reprise réussie. Tests ciblés, TypeScript, ESLint, Prettier et `git diff --check` passent; recette authentifiée visuelle reste à faire.

### MOBILE — soumission protégée des relevés compteur — 21 octobre 2026

- Des appuis rapides sur « Ajouter un relevé » pouvaient envoyer plusieurs créations avant le rendu qui désactive le bouton. Le verrou asynchrone partagé assure une seule soumission en vol et se libère après erreur pour permettre un nouvel essai; toast, endpoint et validation restent inchangés.
- Test ciblé **2/2**, suite Mobile **45/45**, TypeScript, Prettier, onboarding **5/5**, helpers de disponibilité **5/5** et `git diff --check` réussis. Essai physique de double-tap sur appareil non effectué; aucun APK n’a été généré.

### WEB — réessai du chargement des sites société — 21 octobre 2026

- Dans Paramètres de l’entreprise → Sites, un échec du chargement des sites ou des emplacements racine affichait l’alerte d’erreur en même temps que l’état « aucun site ». Aucun retry n’était disponible sans recharger la page.
- Le chargement combiné est maintenant géré en un seul callback : il distingue erreur et liste réellement vide, conserve les données précédentes en cas de nouvel échec et propose Réessayer. Endpoints, droits et règles métier restent inchangés.
- `company-sites-load.test.cjs` couvre l’échec initial de `sites`, puis un retry réussi vers l’état vide. Test ciblé (**1/1**), TypeScript, ESLint, Prettier et `git diff --check` réussis; la branche d’échec de `locations/mini` n’a pas de test distinct et la recette authentifiée visuelle reste à faire.

### MOBILE — verrou de soumission du changement de mot de passe — 21 octobre 2026

- Des taps rapprochés avant le rendu Formik pouvaient envoyer plusieurs appels à `auth/updatepwd`. Le handler utilise maintenant le verrou asynchrone partagé : une seule requête reste en vol et un échec permet un nouvel essai. L’endpoint, les messages et la logique d’authentification sont conservés.
- Test ciblé **2/2**, suite Mobile **46/46**, TypeScript, Prettier, onboarding **5/5**, disponibilités **5/5** et `git diff --check` réussis. Double-tap et erreur/réessai sur appareil non vérifiés; aucun APK n’a été généré.

### WEB — confirmation fiable de copie des clés API — 21 octobre 2026

- Les actions de copie des secrets affichés après création ou rotation annonçaient le succès sans attendre `navigator.clipboard.writeText`; un refus de permission ou une API indisponible donnait donc une confirmation trompeuse. Les deux actions attendent maintenant la copie et affichent une erreur localisée si elle échoue.
- `api-key-clipboard.test.cjs` vérifie l’écriture réussie, le rejet de permission et l’absence du presse-papiers. Endpoints, permissions et durée de vie des secrets restent inchangés.
- Test ciblé **1/1**, typecheck Web, ESLint ciblé, Prettier et `git diff --check` réussis; test navigateur du refus de permission à faire.

### WEB — retour d’erreur pour le rejet d’une demande — 21 octobre 2026

- Si `cancelRequest` échouait, le dialogue de rejet restait ouvert sans message; le formulaire générique terminait seulement son indicateur de soumission. Le modal affiche maintenant l’erreur API localisée et reste disponible pour un nouvel essai. Il ne ferme le dialogue qu’après succès.
- `request-cancellation-errors.test.cjs` reproduit l’échec puis un nouvel essai réussi. Endpoint, permissions et transitions de statut côté serveur restent inchangés.
- Test ciblé **1/1**, typecheck Web, ESLint ciblé, Prettier et `git diff --check` réussis; recette authentifiée du rejet sur navigateur reste à faire.

### MOBILE — reprise des erreurs de hiérarchie des localisations — 21 octobre 2026

- Une erreur du chargement enfant était absorbée et ressemblait à une hiérarchie réellement vide. Les erreurs sont maintenant suivies par localisation, affichées séparément de l’état vide, et relançables pour le premier chargement comme pour la pagination.
- Test ciblé **3/3**, suite Mobile **48/48**, TypeScript, Prettier, onboarding **5/5**, helpers de disponibilité **5/5** et `git diff --check` réussis. Test réseau réel et appareil non vérifiés; aucun APK n’a été généré.

### MOBILE — fraîcheur des recherches Personnes et Équipes — 21 octobre 2026

- Personnes et Équipes masquent les données de la recherche précédente pendant le debounce et ne paginent pas avant que la réponse corresponde aux critères courants. Les erreurs de la recherche active restent relançables; paramètres API et accès sont inchangés.
- Régression ciblée, suite Mobile **47/47**, TypeScript, Prettier, onboarding **5/5**, disponibilités **5/5** et `git diff --check` réussis. Essai tactile sur appareil non réalisé; aucun APK n’a été généré.

### WEB — erreur de chargement des tâches de maintenance préventive — 21 octobre 2026

- Le chargement des tâches d’une maintenance préventive absorbait les erreurs API, ce qui faisait apparaître une liste vide comme si elle n’avait aucune tâche. Le store distingue maintenant erreur, chargement et succès; le détail affiche une erreur localisée et un bouton Réessayer.
- Le test `pm-task-load-error.test.cjs` vérifie une première erreur puis un retry réussi qui efface l’état d’erreur. Aucun endpoint, droit ou comportement métier n’a changé.

### WEB — message localisé d’échec de l’export des équipements — 21 octobre 2026

- L’export CSV des équipements utilisait `t('Export failed')` comme fallback, mais cette clé n’existait pas dans les catalogues; une erreur sans message serveur exploitable montrait donc le libellé anglais brut, y compris dans l’interface française. Le workflow utilise maintenant une clé d’erreur localisée en français et anglais.
- `asset-export-error-message.test.cjs` vérifie le branchement et les deux traductions. Export et permissions restent inchangés.

### WEB — conservation du brouillon lors d’un échec de commentaire WO — 21 octobre 2026

- Le formulaire de commentaire lançait la création sans attendre le résultat API, puis effaçait immédiatement le texte et les pièces jointes. En cas d’échec réseau, le commentaire n’était pas enregistré et le brouillon était perdu; aucune erreur visible ne permettait de réessayer.
- La soumission attend maintenant la création avant d’effacer le brouillon; le succès affiche une confirmation et l’échec conserve le contenu et présente le message API. `work-order-comment-submit.test.cjs` vérifie l’ordre de soumission, la conservation après erreur et le feedback utilisateur. Aucun endpoint, permission ou workflow métier n’a changé.
- Validation : test ciblé, TypeScript, ESLint ciblé, Prettier et `git diff --check` à exécuter avant livraison; test navigateur authentifié à faire.

### WEB — état récupérable au chargement des fichiers — 21 octobre 2026

- Le chargement de la liste des fichiers échouait sans état d’erreur visible : le tableau pouvait rester vide et donner l’impression qu’aucun document n’existait. Le store conserve maintenant un état d’échec, l’interface affiche un message traduit avec une action Réessayer, et une nouvelle tentative réussie efface cet état. Le journal technique reste filtré par `logSafeError`.
- `file-load-error.test.cjs` vérifie un premier échec réseau puis un retry réussi; test ciblé **1/1**, TypeScript Web, ESLint ciblé, Prettier et `git diff --check` réussis. Aucun endpoint, droit ou règle de gestion n’a changé; recette navigateur authentifiée à compléter.

### WEB — reprise du chargement du catalogue des forfaits — 21 octobre 2026

- Si le chargement du catalogue réservé au super-administrateur échouait, l’écran restait bloqué sur un message d’erreur sans action de récupération; l’utilisateur devait recharger toute la page.
- Le message propose maintenant « Réessayer »; la nouvelle tentative relance l’état de chargement et remplace l’erreur par les données en cas de succès. Aucun endpoint, rôle ni effet sur les abonnements n’a changé.
- `subscription-catalog-retry.test.cjs` vérifie que l’état d’erreur expose bien l’action, que celle-ci réinitialise l’état et relance l’effet de chargement. Test ciblé **1/1**, TypeScript, ESLint du composant et Prettier réussis; la recette authentifiée en rôle super-administrateur reste à faire.

### Progression DOC-03 — résolution WO allowlistée — 22 octobre 2026

- Ajout de `WorkOrderReportDataProvider` et de `POST /work-orders/{id}/report/preview-data`. Le client envoie seulement une liste de clés; le backend renvoie uniquement les valeurs demandées parmi une allowlist fixe et vérifie d’abord société + visibilité WO. Les dates sont sérialisées en ISO-8601 UTC et les enums par leur nom stable. Les valeurs d’assignés sont rendues comme noms, sans emails, identifiants utilisateur ni objets entiers.
- Le provider inclut actuellement les champs WO de base, dates/durée estimée, catégorie, équipe, exécutant/assignés, équipement/numéro de série, localisation, site et profil légal déjà résolu. Il refuse coûts, signature, champs personnalisés, tâches, commentaires, historique, fichiers, relations et clés inconnues. Aucun calcul financier ou effet sur le dossier n’a été ajouté; le PDF existant reste inchangé.
- Le contrat d’intégration a été mis à jour. Le provider WO est consommé par DOC-05 et le Web permet de choisir les templates publiés au moment du rapport. À la date de cette progression, Request ne fournissait encore que catalogue et aperçu de données; DOC-07 v2 ci-dessous ajoute le cycle PDF. L’intégration PurchaseOrder reste suspendue à une politique d’accès aux coûts.
- Validation : `cd api && mvn -o -q -Dtest=GeneratedDocumentControllerTest,WorkOrderReportDataProviderTest,GeneratedDocumentServiceTest test` réussit (**16 tests, 0 échec**). Les tests couvrent le binding HTTP, sélection vide, valeurs demandées seulement, champs sensibles/inconnus, accès objet et tenant; `git diff --check` est propre. Le DOC-03 reste partiel : provider WO limité livré; consommation client, sources riches et providers WR/PO restent à intégrer/valider.
- Régression backend large : `cd api && mvn -o -q -Dtest='**/*Test,!**/*IntegrationTest' test` : **1 822 tests, 0 échec/erreur**. `mvn -o -q test` a exécuté 1 941 tests avec 0 échec d’assertion, mais **9 erreurs d’infrastructure** dans les classes Testcontainers, car aucun daemon Docker n’est accessible depuis l’environnement courant. Ces tests d’intégration restent à relancer dans Docker/CI.

### DOC-04 — décision approuvée et première implémentation locale — 22 octobre 2026

- La proposition détaillée est consignée dans [`DOCUMENT-TEMPLATE-SCHEMA-DECISION.md`](DOCUMENT-TEMPLATE-SCHEMA-DECISION.md) : registre extensible, template brouillon, versions JSONB publiées immuables, tenant, défaut, permission réutilisée, compatibilité `ReportConfig` et rollback additif.
- Le propriétaire a approuvé la proposition puis demandé de continuer. L’API DOC-04 et la migration additive sont implémentées localement : modèles, repositories, routes de liste/création/édition/publication/archivage/aperçu, validation JSON stricte, garde d’immutabilité SQL et scope tenant. La publication d’une nouvelle version conserve aussi le statut « template par défaut » si l’administrateur ne demande pas de le changer. Permission réutilisée : propriétaire ou `SETTINGS.view` + `SETTINGS.editOther`. La base de production n’a pas été touchée.
- Validation : compilation Java 17 réussie; **22 tests ciblés, 0 échec**; XML Liquibase bien formé; migration rejouée depuis zéro sur PostgreSQL 16 jetable, puis Hibernate `ddl-auto=validate` et démarrage complet Spring Boot réussis. Cette base était temporaire; la production n’a pas été touchée. Aucun déploiement n’est fait.

### DOC-05 — émission WO depuis un template publié — 22 octobre 2026

- Ajout d’un chemin d’émission PDF configurable et d’un aperçu PDF non archivé; ils coexistent avec l’ancien endpoint `ReportConfig`. Les routes ne reçoivent pas de HTML ni de bindings du client : elles chargent la version publiée du template du tenant, revalident le schéma et résolvent les champs sélectionnés via le provider serveur. Seule l’émission archive acteur, source, hash, snapshot de configuration/valeurs et identifiant de version exact. L’aperçu ne crée aucune archive. Les permissions d’aperçu et d’émission réutilisent respectivement visibilité et droit d’émission du WO.
- Le renderer utilise Thymeleaf échappé et le convertisseur PDF déjà installé; il applique format/orientation/marges, identité légale de l’entreprise, logo et accent; le document inclut les champs retenus et répétition d’entête de table. Le numéro de page a été ajouté au pied de page répété.
- L’interface Web de rapport propose maintenant les templates publiés du Work Order courant via un DTO minimal autorisé par visibilité; le défaut est présélectionné. Prévisualiser utilise le PDF privé sans archive; émettre utilise la nouvelle route d’archive. Sans template publié ou si la liste échoue, le formulaire historique demeure utilisable et les erreurs n’empêchent pas l’aperçu existant. Le sélecteur remplace les champs `ReportConfig` quand un template est choisi.
- Tests ciblés renderer/service/contrôleur/template : compilation Java et **24 tests, 0 échec/erreur**. La suite Web TypeScript (`tsc --noEmit`) et ESLint des fichiers modifiés passent. Le test PDF vérifie la valeur `<script>` comme texte échappé et le numéro de page. Le build CRA complet reste à confirmer (limite mémoire de l’environnement); la recette navigateur authentifiée reste à faire. La suite large inclut neuf erreurs d’infrastructure Testcontainers faute d’accès à Docker.

### DOC-06 — bibliothèque Web, premier incrément — 22 octobre 2026

- Ajout de l’onglet Paramètres → Modèles de documents et de la route `/app/settings/documents`. L’écran charge les types/templates via l’API, crée un template WO, modifie le brouillon ou crée sa prochaine version, choisit les champs autorisés et les paramètres A4/Letter, portrait/paysage, densité, marge, pagination et répétition d’en-tête. Il permet publier, publier comme défaut et archiver après confirmation; les archives émises ne sont pas supprimées.
- Le droit de lecture reste celui des Paramètres et les actions d’écriture sont contrôlées côté serveur par la permission existante `SETTINGS`; l’enveloppe UI conserve le mode lecture seule. Aucun contrat métier WO, endpoint de rapport existant ou donnée de production n’est modifié. Le DTO de template expose en plus la configuration publiée pour permettre d’ouvrir un template sans brouillon et d’enregistrer une nouvelle version.
- Validation : TypeScript, ESLint ciblé et syntaxe JS du build override passent; tests backend DOC-03/04/05/06 **26/26**; build CRA production réussi avec `QPM_LOW_MEMORY_BUILD=1 GENERATE_SOURCEMAP=false CI=true npm run build`. La minification séquentielle n’est activée que par cette variable de build. Le changelog XML reste valide et `git diff --check` passe. La recette navigateur authentifiée avec un compte Settings et un WO autorisé reste à faire.
- L’aperçu de la bibliothèque sélectionne le brouillon courant s’il existe, sinon la version publiée; le backend exige la permission SETTINGS en lecture, vérifie société et accès objet au WO, rend uniquement les bindings allowlistés et retourne `private, no-store`. Aucun document n’est archivé pendant cet aperçu. L’historique est tenant-scopé et n’expose pas les identifiants d’utilisateurs éditeurs.

### Progression DOC-07 — provider Request v1 (historique, remplacé par v2) — 22 octobre 2026

- Le backend expose le catalogue `GET /requests/{id}/report/fields` et l’aperçu `POST /requests/{id}/report/preview-data`. Le provider Request utilise des bindings explicites non financiers, l’utilisateur authentifié, le tenant courant et `Request.canBeViewedBy`. Il ne touche ni au flux d’approbation, ni au WO créé depuis la demande.
- Les données sensibles ou hors périmètre métier restent exclues de la première liste : audio, fichiers, champs personnalisés, motif d’annulation, coûts, identifiants internes et WO lié. Les valeurs nulles sont tolérées et ne font pas échouer le rapport.
- Tests ciblés : `cd api && mvn -o -q -Dtest=GeneratedDocumentControllerTest,GeneratedDocumentServiceTest,RequestReportDataProviderTest test` — **28 tests, 0 échec/erreur**. Vérification `git diff --check` propre.
- Cette première étape est remplacée par DOC-07 v2 ci-dessous. Le volet PurchaseOrder reste séparé jusqu’à décision explicite sur l’exposition des coûts; aucun modèle PR distinct n’a été trouvé.

### DOC-07 — cycle PDF Request — 22 octobre 2026

- **Fonctionnalité ajoutée localement :** type de document système `REQUEST`; création et édition de ses templates dans la bibliothèque Web; aperçu PDF privé, émission archivée à partir d’une version publiée, historique et téléchargement depuis le détail d’une demande. Le rendu réutilise le moteur et les validations DOC-04/05 plutôt que d’ajouter un moteur parallèle.
- **Sécurité et métier :** tenant dérivé du principal, allowlist Request non financière, accès source revalidé sur aperçu/historique/téléchargement, droit d’édition existant requis pour émettre. L’aperçu et l’émission n’approuvent pas la demande, ne la rejettent pas et ne créent pas de WO. Les archives gardent hash SHA-256, instantané et version exacte du template.
- **Contrôles :** 38 tests ciblés réussis (service 24, contrôleur GeneratedDocument 9, contrôleur DocumentTemplate 1, provider 2, renderer 2); les tests incluent les refus d’accès courant aux templates/aperçus Request. TypeScript Web, ESLint ciblé, build CRA production, XML Liquibase et `git diff --check` réussissent. Le changelog complet a été rejoué sur PostgreSQL 18 temporaire neuf : 849 changesets appliqués, Hibernate `ddl-auto=validate` et démarrage Spring Boot réussis. Aucun déploiement ni mutation de données de production.
- **État au 22 octobre 2026 :** développement local et validation technique de DOC-07 terminés. Les scénarios serveur d’émission, refus de permission, revalidation d’accès au téléchargement et non-mutation du workflow sont couverts par les tests ciblés. Le replay Liquibase complet, Hibernate `ddl-auto=validate`, le démarrage Spring Boot, TypeScript, ESLint et le build CRA réussissent.
- **Acceptation avant déploiement :** recette Web authentifiée du template publié, aperçu sans archivage, émission, historique, téléchargement, refus d’accès, utilisateur sans droit d’édition, absence de template publié et traductions FR/EN. Checklist détaillée dans `docs/DOCUMENT-MANAGEMENT-INTEGRATION-CONTRACT.md`. L’environnement courant ne permet pas cette recette : les ports locaux sont bloqués et Chromium Snap refuse de démarrer (`snap-confine` refuse l’exécution confinée). Aucun défaut UI n’a donc été constaté ni écarté par navigateur; cette vérification reste explicitement à faire dans un navigateur de recette accessible.
- **Écart volontaire :** Purchase Order/PR n’est pas inclus. La politique de visibilité des coûts et la différence entre Purchase Order et une vraie Purchase Request doivent être décidées avant tout provider d’achat.

### Web Report Management — finition de l’éditeur de modèles — 22 octobre 2026

- L’éditeur de modèles affichait les clés techniques des champs (`workOrder.dueDate`, `company.legalName`, etc.). Il affiche maintenant des libellés localisés français/anglais pour tous les champs configurables WO et Request. Un test vérifie que chaque clé proposée dispose bien des deux traductions.
- La marge de page est bornée côté serveur à 5–30 mm; le formulaire Web applique maintenant la même règle, montre immédiatement l’erreur et refuse l’enregistrement d’une valeur décimale ou hors plage.
- Validation : ESLint ciblé, `tsc --noEmit`, tests report existant, test de couverture des traductions et test du dialogue d’émission passent; **49 tests backend DOC-03/04/05/07** repassés dans cette session (0 échec/erreur); `git diff --check` passe. Le build CRA standard a été arrêté prématurément par la limite mémoire du runner; relancé avec `QPM_LOW_MEMORY_BUILD=1 GENERATE_SOURCEMAP=false CI=true NODE_OPTIONS=--max-old-space-size=1536 npm run build`, il termine avec `Compiled successfully`.
- L’acceptation fonctionnelle authentifiée Web DOC-07 reste le seul contrôle produit à faire avant clôture de ce périmètre : voir la checklist ci-dessus. Le navigateur Chromium local reste indisponible dans cet environnement; aucun contrôle visuel n’est revendiqué. Mobile, déploiement et base de production ne sont pas concernés par cette passe.

### Web Report Management — entrée de navigation et permission de rôle dédiée — 22 octobre 2026

- Le propriétaire a confirmé qu’il ne trouvait ni le point d’entrée ni une permission dédiée dans la matrice des rôles. L’audit a confirmé le défaut : l’entrée existait seulement comme sous-onglet Paramètres → Modèles de documents et le contrôle réutilisait `SETTINGS`.
- Ajout de `DOCUMENT_TEMPLATES` à la fin des enums API/Web, affichage « Gestion des rapports » dans la matrice des rôles, et lien dédié dans le menu latéral. La page reste accessible aux rôles historiques via `SETTINGS`; un rôle auquel on accorde seulement `DOCUMENT_TEMPLATES.view` arrive sur la bibliothèque sans obtenir les autres écrans Paramètres. `create` autorise la création/copie; `editOther` autorise modification, publication et archivage. L’API réutilise ces mêmes contrôles et conserve le scope tenant.
- Les administrateurs standards conservent la permission; les autres rôles par défaut ne la reçoivent pas implicitement. Aucun ordinal de permission stocké n’est déplacé et aucune migration de schéma n’est ajoutée. L’accès historique `SETTINGS.view` + édition reste rétrocompatible.
- Validation : test Web de route/menu/permission, test de présence des traductions, TypeScript, ESLint ciblé, **52 tests backend de templates et rapports** et `git diff --check` passent. Le build de production CRA réussit avec le profil mémoire réduit. La recette navigateur authentifiée après mise à jour du conteneur reste à faire; aucun déploiement n’est effectué dans cette passe.

### Report Management V2 — priorité PDF-first et écarts Job Card — 22 octobre 2026

Référence : [`QPM_MASTER_PROMPT_FINAL_PDF_FIRST_V2.md`](QPM_MASTER_PROMPT_FINAL_PDF_FIRST_V2.md). Cette analyse met à jour la priorité de livraison : rendre d’abord le PDF d’ordre de travail professionnel et opérationnel; le designer visuel reste une étape ultérieure.

- **Déjà présent côté Web :** route et point d’entrée « Gestion des rapports », bibliothèque de templates WO/Request, brouillons et versions publiées, permissions dédiées/rétrocompatibles, aperçu PDF, publication/archivage, émission et historique. Les lots DOC-03 à DOC-07 ont des validations techniques locales consignées plus haut. Cela constitue le socle; ce n’est pas la preuve que le rendu Job Card répond déjà aux besoins terrain.
- **État après l’incrément du 22 octobre :** le provider WO expose maintenant opérations/tâches, entrées de temps réelles et pièces consommées depuis les relations existantes, avec contrôle tenant et sans coût horaire/prix de pièce. Le PDF les rend en tableaux dédiés avec en-têtes répétés; les styles Classic, Compact et Modern sont disponibles et les trois champs sont sélectionnables dans l’éditeur Web. Il reste à vérifier sur PDF réels la sécurité/permis, constats, signatures (sources métier à confirmer), ainsi que portrait/paysage et les longs documents.
- **DOC-PDF-01 — P0, nouveau :** produire un Job Card sémantique avant tout designer WYSIWYG. Réutiliser le provider, le renderer et le flux PDF existants; ajouter les sources de données vérifiées et des sections sélectionnables pour identité WO, localisation/site, échéancier, équipe, opérations, temps prévu/réel, main-d’œuvre, matériaux, sécurité/consignes et signatures lorsque les données existent. Ne jamais fabriquer de durée, personne, quantité ou signature; distinguer prévu et réel; masquer les champs facultatifs vides par défaut. Garder l’aperçu sans archive et l’émission liée à une version publiée, sans changer les transitions métier.
- **DOC-PDF-02 — P0, validation de sortie :** générer des PDF réels de WO court, long, partiellement renseigné et multi-page; vérifier visuellement A4 paysage et portrait, répétition des en-têtes, sauts de page, marges, pagination, logo, champs légaux et cohérence avec les données source. Les tests de service ou de rendu HTML ne remplacent pas l’ouverture et l’inspection d’un PDF produit. Ne clore DOC-PDF-01 qu’après cette preuve.
- **DOC-PDF-03 — P1, éditeur visuel Web avec glisser-déposer :** une première tranche locale présente un canevas de structure de page (en-tête légal, titre, blocs champ/tableau), permet de réordonner par glisser-déposer les éléments sélectionnés et de personnaliser le libellé de chaque champ ou titre de tableau. Les surcharges `fieldLabels` sont facultatives et compatibles avec les anciens modèles; le serveur n’accepte que des champs allowlistés visibles et limite le texte à 100 caractères. L’ordre est porté par `visibleFields`; le renderer traite le PDF comme une séquence et respecte cet ordre sans migration. Le canevas est une prévisualisation structurelle, pas un WYSIWYG final. Compléter par vrai aperçu lié au WO autorisé, palette de blocs, insertion/duplication/suppression, sections/colonnes, autres propriétés visuelles, modification de contenus, champs allowlistés typés, conditions déclaratives, sauts de page, annuler/rétablir et validation avant publication. Garder un mode simple. N’ajouter aucun HTML, JavaScript, SQL ou URL distante; versions publiées immuables et validation serveur stricte. Réutiliser DOC-04/05 et React/MUI; tester l’accessibilité clavier et l’isolation tenant.
- **DOC-PDF-04 — P1, UX bibliothèque :** simplifier les cartes et actions actuellement documentées comme serrées, et remplacer le formulaire/modal long par des sections ou un parcours lisible (Général, Page, Champs, Identité, Éditeur, Aperçu, Publication). Ajouter les états de recherche/filtre/tri et les états chargement, vide et erreur au besoin, en conservant le design system QPM. L’éditeur visuel doit s’ouvrir sur un brouillon ou créer un brouillon à partir d’une version publiée sans altérer l’historique.
- **DOC-PDF-05 — P1, couverture fonctionnelle :** la cible dynamique sans changement de code, les types tenant-personnalisés, la création de type depuis l’UI, Equipment Handover, Inspection, PO/PR et documents personnalisés ne sont pas démontrés par l’implémentation actuelle. Le contrôleur expose la consultation des types, mais pas d’API de création/édition des définitions de type. Conserver Request (demande de maintenance) distincte de Purchase Request; cadrer la politique d’exposition des coûts PO avant de l’étendre. L’extensibilité doit être livrée par incréments et validée par un exemple métier sans code dédié.
- **DOC-PDF-06 — P2, architecture et exploitation :** le rendu iText/Thymeleaf s’exécute actuellement dans le backend Spring Boot; il n’y a pas de worker PDF isolé ni de file durable vérifiée. Ne pas ajouter de microservice/queue avant mesures de latence, mémoire et concurrence. Documenter les limites et créer un lot d’isolation seulement si des mesures ou une exigence de sécurité/exploitation le justifient.
- **À distinguer des fonctions indispensables au premier livrable :** le réordonnancement des champs est disponible; le designer complet en canevas reste à livrer. Registry de types entièrement autogéré, custom datasets, jobs asynchrones, JasperReports et SAP Crystal sont des incréments ultérieurs ou conditionnels. La génération PDF native doit rester fonctionnelle sans adaptateur externe; aucune compatibilité Crystal n’est annoncée sans environnement SAP et vérification de licence.
- **Gate de livraison Web :** la recette authentifiée navigateur, l’inspection des PDF réels, les rôles lecture/édition, le cas sans template publié, l’aperçu non archivé, l’émission et le téléchargement restent à effectuer. Le dernier état documenté indique que Chromium n’était pas exploitable dans l’environnement et que le déploiement restait à faire. Ne pas annoncer la fonctionnalité comme terminée ou live avant recette et contrôle de santé du déploiement.

### Progression Report Management — Job Card et ordre des champs — 22 octobre 2026

- DOC-PDF-01 a commencé avec les seules sources de données déjà présentes : tâches/opérations, temps réel et pièces consommées. Le provider vérifie l’appartenance à la société pour les enregistrements liés; les prix et coûts horaires ne sont pas inclus. Les tâches, main-d’œuvre et matériels sont rendus en tableaux structurés, distincts du résumé de l’ordre de travail. Les données de sécurité, constats et signatures ne sont pas présentées comme disponibles.
- L’éditeur de brouillon dispose d’un canevas structurel et d’un glisser-déposer réutilisant `react-beautiful-dnd` déjà installé dans le Web. Il réordonne les champs/tableaux et permet d’éditer leurs libellés; le renderer applique les surcharges après validation serveur stricte, sans exécuter de balisage. L’ordre reste stocké dans `visibleFields`; aucune nouvelle API ni migration n’est nécessaire. L’aperçu structurel ne remplace pas l’aperçu PDF de données réelles et n’est pas encore le WYSIWYG complet demandé dans DOC-PDF-03.
- La palette de template ajoute `MODERN` et autorise jusqu’à 32 champs, cohérent avec la validation serveur. Les traductions FR/EN des nouveaux champs et du contrôle de réordonnancement sont ajoutées.
- Validation technique : 36 tests ciblés backend (provider WO 4, renderer 3, service de génération 24, validateur 5) passent; le renderer vérifie la composition et l’ordre des blocs, un PDF de 100 opérations, la répétition des en-têtes, la pagination « Page X of/sur Y » et le rendu texte d’un libellé contenant des chevrons HTML. Le validateur vérifie que les libellés ne ciblent que des champs visibles et rejette les valeurs vides, non textuelles ou trop longues. `tsc --noEmit` Web, ESLint ciblé, build de production CRA avec profil mémoire réduit et `git diff --check` passent. L’inspection visuelle d’un PDF multi-pages et la recette navigateur authentifiée n’ont pas été exécutées ici; le lot DOC-PDF-02 reste ouvert.

### Report Management — réordonnancement accessible — 22 octobre 2026

- Le canevas permet maintenant de déplacer chaque bloc vers le haut ou le bas via des commandes explicites, en plus du glisser-déposer. Les boutons sont localisés FR/EN, ont des noms accessibles et sont désactivés aux extrémités de la liste. Les deux interactions mettent à jour le même ordre `visibleFields`; API, versions publiées et schéma restent inchangés.
- Vérifications après cette modification : TypeScript Web, ESLint ciblé, build CRA de production (`Compiled successfully`) et `git diff --check` passent. Les 36 tests backend de l’incrément PDF précédent restent valides; le backend n’a pas changé dans cette tranche. La recette Chromium authentifiée et l’inspection visuelle de PDF réels restent nécessaires avant livraison.

### Report Management — parcours d’édition organisé — 22 octobre 2026

- Le formulaire de modèle auparavant affiché dans un long panneau unique est organisé en trois sections navigables : Général (nom, code, type, description), Page (format, orientation, densité et options d’impression), Champs et ordre (sélection, canevas, libellés et réordonnancement). La sélection reste dans un seul brouillon et l’enregistrement/persistance conserve le flux existant.
- Les onglets sont localisés EN/FR et utilisables au clavier. TypeScript Web, ESLint ciblé, `test:document-templates` (libellés de champs et d’actions contrôlés en FR/EN), build CRA de production (`Compiled successfully`), contrôle Prettier et `git diff --check` passent. La recette visuelle authentifiée reste ouverte.

### Report Management — correction PDF Job Card prioritaire — 22 octobre 2026

- À la suite du retour utilisateur, le configurateur à trois sections et le canevas de réordonnancement ne sont pas considérés comme un Document Designer professionnel. La priorité revient à la sortie PDF réelle; aucune phase WYSIWYG n’est déclarée complète.
- Le renderer réutilisé produit maintenant une fiche WO sémantique avec identité société/légale, identification WO, équipement/localisation, travail, planification, opérations, main-d’œuvre réelle, pièces consommées et zones de signature. Les styles Classic/Modern/Compact, formats A4 portrait/paysage, en-têtes de tableau répétables, pagination et valeurs facultatives sont gérés. Les notes d’exécution et signatures n’apparaissent que depuis les champs existants; les données de sécurité et l’approbation superviseur n’ont pas de source vérifiée et ne sont pas inventées.
- Le provider n’accepte une signature qu’en PNG/JPEG base64 valide et borné; le snapshot archivé stocke uniquement son état d’inclusion, pas la charge image dupliquée. Les routes, permissions, transitions WO et données métier restent inchangées.
- Validation technique : `mvn -o -q -Dqpm.report.visual.dir=/tmp/qpm-document-review -Dtest=WorkOrderReportDataProviderTest,ConfigurableWorkOrderReportRendererTest,GeneratedDocumentServiceTest,ReportTemplateConfigurationValidatorTest test` passe (**37 tests, 0 échec**). Les tests inspectent le texte extrait, l’ordre des blocs, l’inclusion des signatures, les valeurs manquantes, les tableaux longs, les en-têtes répétés et la pagination.
- Porte visuelle DOC-PDF-02 toujours ouverte : les PDF représentatifs ont été produits dans `/tmp/qpm-document-review/`, mais le Chromium Snap headless de cet environnement affiche un écran vide lors de la capture du lecteur PDF. La compilation et l’extraction de texte ne remplacent pas l’inspection visuelle demandée. Le nouveau WYSIWYG dédié (route, palette, canvas avec sections/colonnes, propriétés, bindings déclaratifs, annulation/rétablissement et version éditable) reste à construire après la validation visuelle des PDF; le configurateur actuel demeure un outil de brouillon limité.

### Report Management — état courant après poursuite du designer — 22 octobre 2026

- **DOC-PDF-01 — implémentation fonctionnelle avancée, non clôturée :** le provider WO et le Job Card sémantique utilisent les sources existantes et conservent les champs facultatifs absents sans leur substituer de données inventées. L’émission reste liée à la version publiée; l’aperçu réel utilise le point d’accès autorisé existant. Aucun changement d’API publique, de transition WO ou de migration DB n’a été ajouté dans cet incrément.
- **DOC-PDF-03 — première tranche de designer dédiée implémentée localement :** nouvelle route sous Paramètres → Gestion des rapports, bibliothèque de composants/champs allowlistés, structure en sections de 1 à 3 colonnes, champs et tableaux déplaçables, sélection clavier, propriétés de libellé/titre, taille, graisse, alignement et accent, page/style, annuler/rétablir, sauvegarde de brouillon, aperçu PDF produit par le backend et publication confirmée. Les versions publiées continuent à être éditées au moyen du flux de brouillon/version existant. Les anciens modèles V1 sont convertis côté éditeur en schéma déclaratif V2; l’API valide strictement clés, types, identifiants, bindings, styles et limites. Aucun HTML libre n’est accepté.
- **Limites encore ouvertes :** l’éditeur ne prend actuellement en charge que les templates Work Order; Request reste sur l’éditeur précédent. Le canvas est une maquette de composition, tandis que le bouton Aperçu affiche le PDF réel produit depuis le même JSON V2 après sauvegarde. Le redimensionnement libre, le paramétrage du contenu légal/en-tête, les styles de tableaux/signatures, règles conditionnelles, sauts de page explicites et validation de publication plus détaillée restent à faire. Les sections peuvent désormais être réordonnées par commandes clavier accessibles. La couleur d’accent est personnalisable par modèle, mais reste soumise au contrôle serveur d’un contraste minimal de 4,5:1 sur blanc. Le bloc signature technicien/superviseur peut être placé dans le layout, mais seul le paraphe du technicien est une donnée réelle; la case superviseur reste une ligne de signature vide. Ces écarts empêchent de qualifier le designer de complet.
- **Validation technique du lot courant :** 42 tests backend ciblés (provider 5, renderer 4, service 24, validateur 9) passent; ils couvrent V1/V2, l’ordre des sections/champs et signatures, la validation de contraste, ainsi que le PDF long. Test frontend de modèles/libellés 1/1, `tsc --noEmit`, ESLint ciblé et Prettier passent. Le build CRA de production passe avec `QPM_LOW_MEMORY_BUILD=1 GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=2048 npm run build` (`Compiled successfully`).
- **DOC-PDF-02 — porte visuelle toujours bloquante (contrôle du 22 octobre 2026) :** les PDF paysage et multi-page existent dans `/tmp/qpm-document-review/` (58 608 et 65 605 octets). Aucun exécutable Poppler/MuPDF/Ghostscript, module PyMuPDF/PDFium, ni bibliothèque PDFBox locale n’est disponible. Une nouvelle tentative de capture avec Chromium Snap headless est refusée par `snap-confine` (profil AppArmor requis) avant même de produire l’image. Les tests de contenu et pagination ne remplacent pas l’inspection visuelle demandée. Il faut ouvrir les deux fichiers dans un lecteur PDF/rasteriseur fonctionnel et contrôler au minimum l’en-tête, les tableaux, les signatures, les retours à la ligne et les ruptures de page avant livraison ou déploiement. Aucun déploiement n’est effectué.
- **Correction du retour d’essai utilisateur — 22 octobre 2026 :** l’action « Design » construisait `/settings/documents/:id/designer`, alors que le routeur authentifié est monté sous `/app`; cela envoyait l’utilisateur vers la page 404 qui affiche « Search terms here… / Go to homepage ». Les liens Design et retour vers Gestion des rapports utilisent maintenant `/app/settings/...`, avec un test de régression. Le designer sépare maintenant « Éditeur de mise en page » et « PDF généré »; toute modification renvoie au canevas, tandis que le PDF précédent est signalé comme périmé. Le canevas montre distinctement les libellés, valeurs d’exemple, lignes de tableaux et pied de page, avec retour à la ligne et hauteur non tronquée. Les exemples sont explicitement signalés comme fictifs. Les champs et pied de page présentés ici restent une visualisation d’édition; le PDF rendu par le backend demeure la référence de sortie. La personnalisation du pied de page, la fidélité pixel à pixel du canevas et l’inspection visuelle du PDF restent des limites à valider.
- **Vérification de cette correction :** test `npm run test:document-templates` (incluant le chemin du designer) réussi; ESLint ciblé, Prettier, `tsc --noEmit`, build CRA (`Compiled successfully`) et `git diff --check` réussis. La génération PDF backend reste couverte par les 42 tests ciblés réussis. Pas de déploiement.

### Report Management — démarrage vierge, duplication et accès PDF — 22 octobre 2026

- Le bouton de création ouvre maintenant deux parcours visibles : démarrer un Job Card WO sur canevas vierge, ou rechercher un modèle WO existant puis en créer une copie éditable. La duplication crée un nouveau template et laisse la source ainsi que ses versions publiées intactes. L’éditeur standard reste disponible pour les types de document qui ne sont pas encore pris en charge par le designer visuel.
- L’API accepte désormais un brouillon V2 avec une section vide pour permettre une vraie création de zéro. Cette souplesse ne s’applique qu’à la sauvegarde de brouillon : la validation stricte continue de refuser aperçu et publication tant qu’aucun composant autorisé n’est ajouté.
- La palette de champs/tableaux est recherchable et localisée. Les blocs peuvent être ajoutés depuis la palette, retirés directement sur le canevas, déplacés entre les sections et édités. Le canevas différencie visuellement les libellés, valeurs d’exemple, lignes de tableaux et pied de page; les textes longs sont forcés à revenir à la ligne dans leurs cartes. L’édition remet explicitement l’écran sur le canevas.
- Le message Chromium « This content is blocked » venait du PDF chargé dans une iframe. L’éditeur n’intègre plus le lecteur PDF : après génération, le fichier s’ouvre dans un nouvel onglet à partir du clic utilisateur et reste disponible avec un lien d’ouverture/téléchargement si le navigateur bloque le popup. Le PDF est une sortie consultable; les modifications se font sur le canevas.
- Recherche SAP Crystal Reports : le parcours « Blank Report » ou assistant, la liste des champs disponibles avec « Find Field », ajout/retrait/réordonnancement, et structure en zones de rapport ont servi de référence. QPM adapte ces motifs à ses bindings déclaratifs et à ses données WO protégées par l’API; aucune sélection libre de tables ou SQL n’est exposée. Sources SAP : [création de rapport vierge ou via assistant et zones d’impression](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/47745fda6e041014910aba7db0e91070.html), [recherche/ajout/retrait/réordonnancement des champs](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/477d27f56e041014910aba7db0e91070.html), [arbre Report Explorer et suppression d’objets](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/4761b2236e041014910aba7db0e91070.html).
- Vérifications de cette tranche : test Web de modèles/libellés 1/1, `tsc --noEmit`, ESLint ciblé, Prettier et `git diff --check` réussis; `mvn -q -Dtest=ReportTemplateConfigurationValidatorTest test` réussi. Le build Web de production avec mémoire réduite termine sur `Compiled successfully`. Le parcours navigateur authentifié et la visualisation réelle dans Chromium restent à tester; aucune publication/déploiement n’est fait.

### Report Management — protection des brouillons dans le designer — 22 octobre 2026

- Le designer distingue désormais explicitement les états « Enregistré » et « Modifications non enregistrées » dans sa barre supérieure. Le bouton Retour affiche une confirmation si le canevas a changé : enregistrer et quitter, supprimer les changements, ou rester dans l’éditeur.
- Le navigateur avertit aussi avant un rechargement ou une fermeture de page avec des changements non sauvegardés. Le blocage de navigation couvre les liens internes et les retours/avances du navigateur. Enregistrer, générer l’aperçu PDF et publier mettent à jour la référence de sauvegarde; si le canevas change pendant une requête d’enregistrement, il reste signalé comme modifié.
- Les commandes d’édition sont suspendues pendant les requêtes d’enregistrement/publication et l’état courant est revalidé avant de quitter ou publier. Cela évite d’ignorer un changement intervenu pendant une requête réseau.
- Contrôles exécutés : `npm run test:document-templates` réussit, y compris un test avec `history` qui confirme qu’une navigation est bloquée puis reprise uniquement après retry; `tsc --noEmit`, ESLint ciblé, Prettier et `git diff --check` réussis; build CRA de production terminé par `Compiled successfully`. Le dialogue et les transitions n’ont pas encore été exercés dans une session navigateur authentifiée. Aucun déploiement.

### Report Management — pagination flexible par section — 22 octobre 2026

- Suite à l’étude de Crystal Reports et Report Builder, chaque section V2 peut maintenant demander un début de page explicite. Le réglage est exposé dans les propriétés de section, marqué sur le canevas, persisté dans le schéma déclaratif, validé comme booléen par le serveur et appliqué au PDF par le renderer partagé. Les anciens templates restent compatibles lorsque la propriété est absente.
- Cette tranche apporte un contrôle de pagination utile sans exposer de code, HTML ou logique arbitraire. Elle ne constitue pas le designer complet : le dimensionnement libre, les en-têtes/pieds personnalisables et l’inspection visuelle du PDF restent ouverts dans DOC-PDF-02/03.
- Vérification : `ConfigurableWorkOrderReportRendererTest` (**6 tests**) et `ReportTemplateConfigurationValidatorTest` (**10 tests**) passent; test Web des templates passe; `tsc --noEmit`, ESLint ciblé, Prettier et `git diff --check` passent. Le test PDF confirme qu’une section avec saut configuré commence sur la page suivante. L’inspection visuelle Chromium reste bloquée par l’absence d’un lecteur/rasteriseur utilisable dans l’environnement; pas de déploiement.
- Un motif de suppression conditionnelle inspiré des fonctions de suppression de Crystal est ajouté au niveau du champ : « Masquer ce champ si sa valeur est vide ». Il est désactivé par défaut pour préserver les formulaires papier; seules les valeurs textuelles réellement vides des champs/signatures peuvent être supprimées. Le backend n’accepte cette propriété que comme booléen sur un composant non-table et filtre avant de regrouper les sections; aucune expression dynamique libre n’est évaluée. Une section vide après suppression n’est donc pas rendue.
- Vérification complémentaire après cette option : `ConfigurableWorkOrderReportRendererTest` (**7 tests**) et `ReportTemplateConfigurationValidatorTest` (**10 tests**) passent; le test rendu prouve qu’un champ marqué disparaît alors qu’un autre champ vide non marqué reste imprimé. Le test Web, TypeScript, ESLint ciblé, Prettier et `git diff --check` passent. Revue visuelle Chromium toujours requise.
- La composition des sections à plusieurs colonnes est maintenant plus souple : un champ individuel peut occuper toute la largeur de sa section, sans transformer les autres champs. Le réglage est visible sur le canevas, persisté et validé dans le schéma, puis répercuté dans le PDF. Il est réservé aux blocs `FIELD`; tableaux et signatures conservent leur largeur dédiée, et les champs descriptifs déjà pleine largeur gardent leur comportement historique.
- Vérification après cette amélioration : tests renderer (**7**) et validator (**10**) passent; le test PDF confirme la conservation d’une longue valeur dans un composant pleine largeur. Tests Web, TypeScript, ESLint ciblé, Prettier et `git diff --check` passent. Revue visuelle toujours requise.

### DOC-PDF-02 — contrôles géométriques automatisés, revue visuelle toujours ouverte — 22 octobre 2026

- Les tests du renderer contrôlent désormais les dimensions A4 exactes (tolérance 1 pt) en paysage et portrait, sur toutes les pages du Job Card portrait multi-page. Le test vérifie aussi le contenu sémantique, l’ordre des blocs, les en-têtes de tableau répétés et les numéros de page.
- Un scénario court et incomplet est ajouté : il vérifie qu’un WO sans code, équipement, localisation ni date reste imprimable sur une page et n’affiche jamais `null` ou `undefined`.
- `mvn -o -q -Dqpm.report.visual.dir=/tmp/qpm-document-review -Dtest=ConfigurableWorkOrderReportRendererTest test` : **5 tests, 0 échec, 0 erreur**. Les PDF paysage, portrait long et portrait partiellement renseigné ont été régénérés.
- La capture visuelle n’a pas pu être faite : le navigateur MCP est configuré pour `/opt/google/chrome/chrome`, absent dans cet environnement; Chromium Snap local n’est pas exploitable sous le confinement actuel. Les dimensions et tests de texte ne certifient pas la composition visuelle, donc DOC-PDF-02 reste non clos avant ouverture des PDF dans un lecteur/rasteriseur.
- Recherche complémentaire sur la flexibilité des outils de rapports : Crystal Reports fournit des sections insérables/supprimables/fusionnables/réordonnables et des champs/formules/paramètres accessibles depuis l’explorateur; les rapports paginés Microsoft documentent les panneaux de propriétés, regroupements, en-têtes répétés et sauts de page. À reprendre dans QPM comme sections/blocs réutilisables, bindings autorisés, propriétés contextualisées et règles de pagination déclaratives. Laisser SQL, HTML et expressions libres hors du designer afin de protéger les données tenant et l’exécution serveur. Sources : [Crystal Reports — Section Expert](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS%2C_DEVELOPER_VERSION_FOR_MICROSOFT_VISUAL_STUDIO/0d6684e153174710b8b2eb114bb7f843/45bd846f6e041014910aba7db0e91070.html), [Crystal Reports — Field Explorer](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/476208696e041014910aba7db0e91070.html), [Microsoft — conception des rapports paginés](https://learn.microsoft.com/en-us/sql/reporting-services/report-builder/report-design-view-report-builder?view=sql-server-ver17), [Microsoft — répétition des en-têtes sur plusieurs pages](https://learn.microsoft.com/en-us/sql/reporting-services/report-design/display-row-and-column-headers-on-multiple-pages-report-builder-and-ssrs?view=sql-server-ver17), [Microsoft — sauts de page](https://learn.microsoft.com/en-us/sql/reporting-services/report-design/controlling-page-breaks-headings-columns-and-rows-report-builder-and-ssrs?view=sql-server-ver17).
- Le test de pagination longue échouait sur une assertion trop stricte qui attendait les cellules d’une ligne concaténées dans un ordre fixe. L’extraction iText place la valeur de la dernière ligne selon l’ordre de lecture PDF, mais le contenu des 100 lignes est présent. L’assertion vérifie désormais l’identifiant de dernière opération et son libellé séparément; `ConfigurableWorkOrderReportRendererTest` passe avec 5 tests. Le test inclut aussi une note multi-ligne longue dont le début et la fin doivent être conservés.

### Report Management — largeurs de colonnes configurables — 23 octobre 2026

- Le designer expose maintenant une largeur en pourcentage pour chaque colonne des tableaux Opérations, Main-d’œuvre et Matériels. La modification d’une valeur redistribue l’espace restant, conserve un total de 100 % et garde chaque colonne entre 10 % et 70 %. L’aperçu de mise en page affiche les mêmes proportions et les en-têtes alignés sur les colonnes réelles des données.
- Le schéma V2 valide strictement la propriété `columnWidths` (type TABLE uniquement, nombre attendu de valeurs, entiers bornés, somme 100). Le backend applique ces proportions dans le `<colgroup>` du PDF. Les modèles existants sans propriété restent compatibles et utilisent des largeurs égales; les modèles V1 sont convertis dans le designer avec des proportions adaptées à leur type de tableau. Pas de changement d’API, de base de données ou de contrat métier.
- Vérifications : tests ciblés Java renderer/validator **19/19 réussis**; test frontend document templates **1/1**, `tsc --noEmit`, ESLint ciblé, Prettier et `git diff --check` réussis. Le test géométrique du PDF ne mesure pas encore les coordonnées imprimées des colonnes; une inspection visuelle réelle reste dans le gate DOC-PDF-02. Aucun navigateur authentifié ni déploiement n’a été exécuté.

### Report Management — benchmarking des modèles de designer et colonnes métier — 23 octobre 2026

- L’étude comparative officielle des mécanismes de layout, composants, datasets et pagination est consignée dans [`REPORT-DESIGNER-REFERENCE-RESEARCH.md`](REPORT-DESIGNER-REFERENCE-RESEARCH.md). Décision : reprendre l’arborescence de sections et les propriétés d’objet/section de Crystal, les régions de données et règles de pagination de SSRS, les tables à dataset typé de Jasper, et le parcours no-code de Frappe pour sélectionner/ordonner/dimensionner les colonnes. QPM conserve ses providers et son schéma JSON allowlisté; aucune requête, formule libre, HTML ou nouveau moteur n’est introduit.
- Implémentation locale : les trois tableaux Work Order permettent maintenant de choisir les colonnes à imprimer, de les réordonner avec les commandes haut/bas et de régler leurs largeurs. Les éléments actifs s’affichent dans leur ordre d’impression; l’aperçu structurel suit les mêmes IDs. Toute modification de visibilité redistribue les largeurs, un déplacement conserve la largeur de la colonne.
- Sécurité/compatibilité : `tableColumns` contient des identifiants de colonnes métier, jamais des noms de champs client arbitraires. Le serveur contrôle la liste par provider/table, refuse doublons, inconnus et listes vides, puis applique le même ordre aux en-têtes et cellules. Les anciens templates sans cette propriété gardent toutes leurs colonnes; les versions publiées restent immuables. Aucun changement de base, d’API publique ou de logique métier.
- Validation : tests backend Renderer **8**, Validator **11** et GeneratedDocumentService **24**, soit **43 tests ciblés sans échec**; TypeScript, ESLint ciblé, test document-template et Prettier passent. Le contrôle navigateur authentifié et l’inspection visuelle du PDF réel restent à faire; aucun déploiement n’a été effectué.

### Report Management — alignement des composants dans leur zone — 24 octobre 2026

- En cohérence avec les zones de rapport Crystal/SSRS, l’inspecteur propose maintenant « Aligner le composant dans sa zone ». Les en-têtes sont alignés en haut, les pieds en bas; les positions relatives des éléments du composant sont conservées. Les composants trop hauts pour les marges de la page sont refusés avec un message localisé.
- La version frontend est compilée et servie par le conteneur local (`HTTP 200`). Le contrat JSON, les providers métier et le rendu backend ne changent pas. La recette visuelle authentifiée reste à faire.

### Report Management — conservation des sections sans tableau — 24 octobre 2026

- Le REA Crystal/SSRS recommande une règle explicite de conservation avant pagination. L’éditeur V2 permet maintenant de demander qu’une section sans tableau reste sur une page lorsque cela est possible; le renderer applique `break-inside: avoid` et le saut de page avant existant reste prioritaire.
- L’option se désactive automatiquement si un tableau est ajouté ou déplacé dans la section. Le validateur serveur rejette aussi une configuration qui tenterait de conserver un tableau entier, afin de préserver la pagination ligne par ligne et les en-têtes répétés. Aucun binding, provider, droit ou ordre de données ne change.
- ESLint/TypeScript frontend, compilation Java avec tests désactivés et `git diff --check` passent. Les images API/frontend ont été reconstruites et les deux conteneurs locaux redémarrés; le frontend répond HTTP 200 et sert `main.6af301cb.js`. Aucun test automatisé ni contrôle visuel du PDF n’a été exécuté dans cette tranche; la pagination réelle doit encore être inspectée.

### Report Management — hauteur des zones d’impression PDFME — 24 octobre 2026

- Le REA recommande des bandes explicites pour Page Header/Footer et Report Header/Footer. L’Outline expose maintenant une hauteur en millimètres par zone; les valeurs sont sauvegardées dans les métadonnées QPM du brouillon. Le placement des nouveaux composants respecte la bande sélectionnée, et le corps réserve les bandes d’en-tête et de pied.
- Le client et l’API vérifient les limites de hauteur, un minimum de 30 mm pour le corps et l’absence de composants hors bande. Le renderer enlève cette métadonnée avant de transmettre le template à pdfme; les anciens modèles sans réglage restent compatibles avec les valeurs par défaut.
- Images API/frontend/pdfme-renderer reconstruites et conteneurs locaux redémarrés. TypeScript, ESLint ciblé, compilation Java, syntaxe Node et `git diff --check` passent; le frontend sert le nouveau bundle `main.399be92c.js` en HTTP 200, le renderer répond `/health` en HTTP 200 et l’API a terminé son démarrage (endpoint protégé en HTTP 401 sans authentification). À vérifier encore : édition/sauvegarde dans le navigateur et aperçu visuel du PDF. Les zones restent des bandes géométriques; les conteneurs autonomes et règles avancées de pagination restent au backlog.

### Report Management — visibilité des zones d’impression vides — 24 octobre 2026

- Le REA Crystal recommande de supprimer les sections vides. L’Outline expose maintenant « Masquer cette zone si tous ses champs liés sont vides » pour les zones qui contiennent des bindings métier. La règle s’applique à toute la zone et à chaque PDF produit; les éléments statiques suivent la visibilité de la zone.
- La configuration reste dans la liste blanche QPM : le validateur vérifie que le réglage n’est utilisé que dans sa zone et qu’il est cohérent sur ses objets; le renderer masque la zone uniquement si tous les bindings non statiques sont vides. Les providers, les permissions et les données transmises ne changent pas.
- TypeScript, ESLint ciblé, compilation Java, syntaxe Node et `git diff --check` passent. Les images API/frontend/pdfme-renderer ont été reconstruites; le frontend sert `main.851105ba.js` en HTTP 200, le renderer `/health` répond en HTTP 200 et l’API a démarré (HTTP 401 attendu sans authentification). L’aperçu dans navigateur et la vérification visuelle du PDF restent requis; les conteneurs autonomes et les règles avancées de pagination restent au backlog.
- L’Outline permet aussi de vider une zone entière en une action avec confirmation; ses propriétés de hauteur restent en place, afin de pouvoir remplir de nouveau la même zone ensuite. TypeScript, ESLint ciblé et `git diff --check` passent; le frontend local sert le bundle mis à jour `main.00c57b50.js` en HTTP 200. Le PDF généré et le parcours visuel restent à inspecter.

### Report Management — durée réelle enregistrée du Job Card — 24 octobre 2026

- Pour rendre immédiatement comparable le prévisionnel et le réalisé (DOC-PDF-01), le provider Work Order expose maintenant `workOrder.actualDuration`, calculé à partir des seules entrées de temps réellement liées au WO et autorisées pour la société. La valeur est exprimée en heures, à deux décimales; aucun temps saisi ne produit de valeur vide, et l’absence de licence Time Tracking est diagnostiquée comme indisponible plutôt que comme zéro.
- Le champ est sélectionnable dans les deux éditeurs et apparaît dans le composant résumé du designer PDFME, en regard de la durée estimée. Les valeurs et libellés restent soumis à l’allowlist existante; aucun coût horaire ni donnée d’un autre tenant n’est exposé.
- Validation de l’incrément : `mvn -o -q -DskipTests compile`, `tsc --noEmit`, ESLint ciblé, build CRA de production (`Compiled successfully`) et `git diff --check` passent. Les tests automatisés de calcul des durées n’ont pas été exécutés; DOC-PDF-01 et la recette PDF restent ouverts.

### Report Management — duplication sûre des blocs de texte — 24 octobre 2026

- Le panneau de propriétés du designer permet maintenant de dupliquer un bloc texte statique dans la même page. Le clone conserve sa mise en forme et son contenu, reçoit des noms de champs uniques, se place après le contenu existant et est sélectionné pour édition immédiate.
- La duplication est refusée si l’espace avant le pied de page est insuffisant. Elle n’est pas proposée pour les composants liés à des données métier ou les zones répétées : leurs noms sont des bindings partagés et une copie naïve créerait des collisions PDFME ou des données ambiguës.
- Vérification : `tsc --noEmit`, ESLint ciblé, build CRA de production (`Compiled successfully`) et `git diff --check` passent. La fonctionnalité ne couvre pas encore la duplication générale de composants (DOC-PDF-03).
- L’image Docker frontend a été reconstruite et le conteneur `frontend` local redémarré. HTTP `200` et capture Chromium confirment que l’écran de connexion s’affiche; le designer reste derrière authentification et n’a donc pas encore été inspecté visuellement dans une session utilisateur (gate DOC-PDF-02).
- Couverture ciblée ajoutée et exécutée pour le provider : sommes sur saisies du même tenant, exclusion d’une saisie d’une autre entreprise, absence de données et licence Time Tracking manquante. `mvn -o -q -Dtest=WorkOrderReportDataProviderTest test` passe.
- Accélération DOC-PDF-01 : ajout de la durée réelle au registre de champs serveur et aux champs préchargés du nouveau modèle Job Card; le renderer la range avec la main-d’œuvre. Le modèle PDFME présente le total réel sur sa page Main-d’œuvre, distinct des heures estimées affichées dans le résumé. Tests ciblés provider, renderer configurable et service de documents générés passent (`mvn -o -q -Dtest=WorkOrderReportDataProviderTest,ConfigurableWorkOrderReportRendererTest,GeneratedDocumentServiceTest test`); `tsc --noEmit` passe. Build CRA et builds Docker frontend/API réussis; les conteneurs ont été redémarrés et le frontend local répond en HTTP 200. La validation visuelle du designer et du PDF reste ouverte faute de session authentifiée.
- Accélération DOC-PDF-02 : les trois variantes de recette du renderer natif ont été générées et déposées dans [`docs/pdfme-evidence/`](pdfme-evidence/): Job Card paysage A4 (1 page), portrait clairsemé (1 page), portrait long avec 100 opérations (5 pages). `ConfigurableWorkOrderReportRendererTest` confirme dimensions A4, en-têtes répétés, pagination et présence de la dernière ligne; suite ciblée passée. L’inspection visuelle humaine reste ouverte : Chromium échoue au démarrage Snap/AppArmor et aucun rasteriseur PDF n’est installé dans l’environnement. Les PDF synthétiques sont prêts pour la revue dans un lecteur de bureau.

### Report Management — suppression complète des modèles non utilisés — 24 octobre 2026

- La bibliothèque permet maintenant de supprimer un modèle publié ou brouillon. Le serveur supprime toutes ses versions si aucune n’est référencée par un document émis; une version utilisée entraîne toujours un conflit afin de préserver l’historique des documents. Dans ce cas, l’interface indique d’archiver le modèle.
- Cette modification complète la protection d’historique existante, sans migration DB. Images API et frontend reconstruites; CRA (`main.4a1b1b0b.js`) compilé; conteneurs relancés. L’API a terminé son démarrage, la route protégée répond `401` sans jeton (attendu), et l’application frontend répond `200`. La recette authentifiée de suppression et l’inspection visuelle PDF restent à faire.

### Report Management — types d’entreprise fondés sur les sources autorisées — 24 octobre 2026

- Première tranche DOC-PDF-05 : un utilisateur autorisé peut créer un type d’entreprise nommé depuis l’écran de gestion, en choisissant la source Work Order ou Request. Le code est généré côté serveur et reste unique dans le tenant; le client ne peut pas fournir de provider arbitraire. Les listes, l’éditeur de modèle, l’aperçu et la sélection des rapports publiés utilisent le provider attaché au type, afin que les alias personnalisés suivent la source métier correspondante.
- Aucune migration n’est nécessaire. Compilation Java hors tests, TypeScript et `git diff --check` passent. Les images API/frontend ont été reconstruites et relancées; CRA sert `main.144be743.js` en HTTP 200 et Spring Boot a démarré. Reste à livrer l’édition/désactivation des définitions de type, de nouvelles sources métier (Inspection, Equipment Handover, PO/PR) et la validation visuelle authentifiée.

### Report Management — édition sûre des types d’entreprise — 24 octobre 2026

- Les types personnalisés Work Order/Request peuvent maintenant être renommés et leur description modifiée depuis une fenêtre « Gérer les types ». Le code technique reste stable, les templates associés conservent leur relation, et la source métier est verrouillée après création. Les types système ne sont pas modifiables; l’API vérifie l’entreprise et les permissions avant mise à jour.
- Aucun changement DB ou de provider n’est nécessaire. La désactivation des types et les nouveaux providers métier restent ouverts; désactiver un type exige de traiter explicitement les templates publiés et leur historique.
- Vérifications : compilation API hors tests, TypeScript, ESLint ciblé, Prettier et `git diff --check` passent. Le build CRA a passé avec une heap Node de 3 Go après un premier échec OOM à 2 Go. Les images Docker API/frontend ont ensuite été reconstruites; Spring Boot a démarré et le frontend sert `main.085b23a0.js` avec HTTP 200 sur le port interne 3000. Pas de test automatisé de cette nouvelle route ni de recette authentifiée exécutés.

### Report Management — désactivation réversible des types inutilisés — 25 octobre 2026

- Les types d’entreprise personnalisés inutilisés peuvent maintenant être désactivés puis réactivés depuis « Gérer les types ». Ils restent visibles dans la liste d’administration avec leur état, mais n’apparaissent plus dans les nouveaux modèles ni dans les choix de source. Le code reste conservé pour éviter sa réutilisation accidentelle.
- L’API refuse la désactivation dès qu’un template de la société référence le type, y compris un template archivé. Il faut d’abord supprimer les templates non utilisés ou les migrer; les types système ne sont pas modifiables. L’édition du nom et de la description est conservée.
- Aucune migration DB n’est nécessaire. Compilation API, TypeScript, ESLint ciblé, Prettier et `git diff --check` passent. Le build CRA passe (`main.c3b6c6e9.js`); les images API/frontend sont reconstruites et les deux conteneurs ont redémarré. Spring Boot a démarré en 46 s et Nginx sert le bundle en HTTP 200. Les tests automatisés de l’endpoint et la vérification utilisateur authentifiée restent à faire.
### Statistiques de capacité — tableau de bord et rubrique Statistiques — 25 octobre 2026

- Le tableau de bord et une page dédiée dans Statistiques comparent les heures de capacité d’équipe disponibles aux durées de travail planifiées, jour par jour sur la période (30 jours par défaut), avec une ligne du taux d’utilisation calculé à partir des minutes allouées / minutes disponibles. L’affichage ne déclenche pas l’API si l’utilisateur n’a pas Resource Planning ou les permissions requises. Les erreurs et périodes sans données sont signalées; le graphique précise qu’il reflète le planning courant, pas un historique figé.
- Le choix de représenter les deux mesures ensemble reprend le principe SAP de comparaison charge/capacité; les valeurs restent celles renvoyées par QPM selon les horaires et affectations existants. La mesure ne calcule pas un lissage de charge par opération ni une disponibilité historique. Références SAP : [Maintaining Individual Capacities](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/d74941cf210b44768dc074ce2f243890/0974b65334e6b54ce10000000a174cb4.html) et [Calculation of Available Capacity](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/e45db16ec86a4c14a64c11b888ad2a38.html).
- Le tableau de bord ajoute aussi un graphique des appels préventifs par statut et type de déclenchement; Statistiques dispose d’une vue dédiée de répartition des statuts. Un nouvel agrégat API utilise les dates d’échéance effectives (date replanifiée le cas échéant), est limité à l’entreprise active et à une période maximale d’un an, et exige le droit PM. Les appels compteur ne sont retournés que si la fonction Compteurs est activée. Référence SAP : consulter séparément les appels planifiés et les ordres générés dans le [suivi des appels de maintenance](https://help.sap.com/docs/SAP_S4HANA_CLOUD/2dfa044a255f49e89a3050daf3c61c11/f0e9632b0e654fbeae597bad6abb823c.html).
- Les pages Statistiques capacité et maintenance préventive offrent désormais un sélecteur commun de période (7, 30 ou 90 jours); changer la période recharge les données sans modifier la définition des indicateurs. Le texte accessible du graphique PM détaille aussi les volumes par statut. TypeScript complet, ESLint ciblé, Prettier et `git diff --check` passent. Le build frontend sera regroupé avec la prochaine tranche visuelle.
- Vérifications : `mvn -DskipTests compile`, TypeScript, ESLint ciblé, Prettier et `git diff --check` passent. Les images locales API et frontend ont été reconstruites; CRA a compilé le frontend final (`main.68760051.js`, 412,93 Ko après gzip). Un conteneur frontend temporaire utilisant la configuration Compose a servi le HTML et le bundle en HTTP 200, puis a été arrêté. La recette graphique dans Chrome n’a pas pu être faite car le binaire Chrome attendu par l’outil navigateur est absent de cet environnement. Les conteneurs actifs n’ont pas été redémarrés.
### MOB — affichage adaptatif des disponibilités de shift — 27 octobre 2026

- L’écran « Mes disponibilités » passe les lignes jour/horaires en pile verticale sous 380 px de largeur, afin que les jours et les durées localisés restent lisibles sur les téléphones étroits. Les écrans plus larges gardent leur présentation en ligne. Les valeurs d’heure de début sont affichées aussi pour les exceptions de date.
- Aucun changement des routes, du modèle ou du contrat API utilisé par Mobile.
- `git diff --check` passe. Le typecheck Mobile a été interrompu après être resté sans sortie; aucun test ni build Mobile n’a été exécuté. Vérification visuelle sur appareil à faire.

### MOB — activation cohérente des fonctions mobiles — 27 octobre 2026

- L’audit des capacités mobiles a trouvé des entrées PM et Statistiques affichées sur le seul droit de rôle, alors que les services API exigent aussi l’option de forfait; la liste et le détail PM vérifient désormais `PREVENTIVE_MAINTENANCE`, et la navigation/l’accueil/le détail statistique vérifient `ANALYTICS`. L’accueil masque les statistiques et n’envoie plus leur requête quand l’option Analytics ou le droit manque.
- L’entrée « Mes disponibilités » vérifie maintenant l’option et l’entitlement `RESOURCE_PLANNING`, et l’écran vérifie aussi en cas d’accès direct. L’enum mobile de forfait a été complétée pour correspondre à l’API. Aucun contrat ni mutation métier ne change.
- Inventaire documenté dans [`MOBILE-CAPABILITIES-AND-MODULARITY.md`](MOBILE-CAPABILITIES-AND-MODULARITY.md) : achats actuellement en lecture seule; intégrations ERP côté serveur; pas de roster publié ni de synchronisation générale hors ligne. Les réceptions d’achat restent bloquées jusqu’à séparation sûre approbation/réception et mouvements de stock idempotents.
- Vérification : TypeScript Mobile (`npx tsc --noEmit --pretty false`), Prettier ciblé, exports Expo Android (2 254 modules) et iOS (2 245 modules), et `git diff --check` passent. Aucun test automatisé, APK distribuable ni essai visuel sur appareil n’a été exécuté.

### MOB — aperçu obligatoire avant émission PDF — 27 octobre 2026

- L’app ouvrait déjà l’aperçu PDF dans le lecteur du téléphone et gérait l’émission confirmée, l’historique et les téléchargements. L’émission pouvait toutefois être lancée sans aperçu préalable.
- Le bouton d’émission est maintenant désactivé jusqu’à l’ouverture réussie de l’aperçu à chaque ouverture du dialogue. La confirmation et les contrôles d’autorisation API restent inchangés. Les libellés français/anglais expliquent la séquence.
- Le backlog MVP a été corrigé : l’implémentation mobile est faite; restent la recette du lecteur PDF et de l’émission sur appareils Android/iOS, les erreurs réseau et le contrôle des documents archivés. L’app consomme le rapport par défaut du serveur; la sélection de templates publiés/sections n’est pas encore disponible sur mobile.
- Vérification : `npx tsc --noEmit --pretty false`, Prettier ciblé et `git diff --check` passent. Aucun test ni build natif n’a été lancé; aucun appareil n’est connecté pour la recette visuelle.

### MOB — alignement licence de signature à la clôture — 27 octobre 2026

- Le mobile vérifiait l’option `SIGNATURE` du forfait pour autoriser la clôture avec signature obligatoire, mais le serveur exige aussi l’entitlement `SIGNATURE_CAPTURE` lorsqu’une signature est envoyée.
- La garde de clôture mobile exige maintenant forfait et entitlement. Si l’un manque, l’app affiche le message d’indisponibilité existant avant la mutation; l’API reste l’autorité.
- Aucun payload, permission, transition métier ni contrat API n’a changé. TypeScript mobile, Prettier ciblé et `git diff --check` passent; recette réelle avec licences absentes/présentes sur appareil encore requise.

### MOB — garde entitlement des notes vocales de demande — 27 octobre 2026

- Les services API refusent la création/modification d’une demande contenant `audioDescription` lorsque `VOICE_NOTES` n’est pas licencié. Les écrans Mobile laissaient pourtant le contrôle d’enregistrement actif.
- Les formulaires de création et d’édition de demande désactivent maintenant l’enregistreur sans cet entitlement et expliquent l’indisponibilité en français/anglais. Le composant Form reste inchangé par défaut pour les autres usages; aucune API ni donnée de demande n’est modifiée.
- Vérification TypeScript mobile, Prettier ciblé et `git diff --check` passent; les licences présentes/absentes et le refus serveur restent à recetter sur API/appareil.

### MOB — activation forfait du module compteurs — 27 octobre 2026

- Le Web n’expose les compteurs que si l’option `METER` du forfait est active. Le mobile affichait l’entrée sur le seul droit du rôle et chargeait aussi les compteurs d’Asset 360 sans ce contrôle.
- « Plus », la liste, les détails, la création/édition et les sélecteurs liés aux tâches vérifient maintenant l’option; Asset 360 n’envoie pas la requête compteur lorsque le module est désactivé. Les écrans accessibles directement affichent un état d’indisponibilité clair.
- L’API, les droits et les règles de déclenchement métier ne changent pas. TypeScript mobile, Prettier ciblé et `git diff --check` passent; essais avec forfaits incluant/excluant `METER` à faire sur appareil.

### MOB — option CHECKLIST dans les parcours de sélection — 27 octobre 2026

- Le forfait `CHECKLIST` permet la création et l’ajout de modèles Checklist; le Web désactive cette capacité sans l’option. L’application mobile affichait encore le choix et chargeait la liste par accès direct.
- Le choix Checklist est maintenant masqué dans le sélecteur et la liste directe affiche un état d’indisponibilité sans appeler l’API lorsque le forfait ne l’inclut pas. Les listes de tâches déjà associées aux ordres restent exécutables.
- Aucun contrat API, données déjà liées ou transition métier n’a changé. TypeScript mobile, Prettier ciblé et `git diff --check` passent; recette avec forfaits incluant/excluant le module à faire.
### MOBILE / PM — conserver la date d’origine d’un appel reporté — 27 octobre 2026

- La carte d’un appel affichait `rescheduledFor` à la place de `dueDate`, ce qui masquait l’échéance d’origine dans le registre terrain. Elle affiche maintenant l’occurrence initiale et, lorsqu’elle diffère, la nouvelle date après report. Pour les appels compteur, l’affichage du seuil reste inchangé.
- Aucun changement au contrat API, au statut, à la permission ou au processus de report. La valeur `originalDueDate` renvoyée par le serveur est prioritaire; les données historiques sans cette valeur retombent sur `dueDate`.
- TypeScript mobile et Prettier ciblé passent; `git diff --check` passe après nettoyage de la fin du document; recette sur appareil et vérification avec un appel reporté restent à faire.

### MOBILE / PM — nommer les cycles compteur déclencheurs — 27 octobre 2026

- L’API du registre d’appels PM renvoie déjà `triggeredCycleNames` en plus des codes; le modèle mobile ignorait les noms et exposait des identifiants internes au technicien. La carte affiche maintenant les noms et ne retombe sur les codes que pour une ancienne réponse sans noms.
- L’ensemble des compteurs ayant déclenché l’appel et la règle ANY/ALL du plan restent décidés côté serveur; aucun recalcul ou changement de données n’est ajouté au client.
- TypeScript mobile, Prettier ciblé et `git diff --check` passent; recette d’un appel multi-compteur à faire sur instance/appareil.
### API / SAP — unifier l’approbation PO manuelle et workflow — 27 octobre 2026

- Le parcours manuel `/respond?approved=true` créditait le stock, mais l’action `APPROVE` d’un workflow ne faisait que changer le statut. Un PO pouvait donc sembler approuvé sans produire l’effet inventaire attendu.
- Une transition partagée applique le verrou société/PO, le crédit des seules pièces stockées (avec verrouillage par ID), le changement de statut et les webhooks après commit. Les actions `APPROVE` et `REJECT` des workflows passent par ce service; les autres actions conservent leur sauvegarde actuelle.
- L’intégration ERP et les réceptions physiques restent inactives; l’approbation historique ne change pas de statut métier, mais les pièces `Part.nonStock` sont maintenant exclues du stock, comme dans les parcours OT et le réapprovisionnement manuel. Compilation API hors tests et `git diff --check` relancés pour cet alignement; aucun test automatisé lancé.
- L’approbation partagée refuse aussi toute quantité de ligne PO non finie ou non positive, y compris sur des données historiques, avant tout crédit d’inventaire.
### API / PROC-02 — résoudre les créations concurrentes de références externes — 27 octobre 2026

- Deux synchronisations pouvaient toutes deux ne pas trouver une référence `company + provider + type + externalId`, puis entrer en conflit sur la contrainte unique. L’insertion est maintenant isolée dans une transaction courte `REQUIRES_NEW`; après conflit, le service relit l’enregistrement gagnant et retourne le mapping si l’objet QPM est identique, ou `409` si la référence pointe vers un autre objet.
- La contrainte unique reste l’arbitre final et aucune référence ne peut être réaffectée. Le registre d’événements idempotents et les adaptateurs ERP ne changent pas.
- Compilation API `mvn -o -DskipTests compile` et `git diff --check` passent; aucun test automatisé lancé.
### MOB / SHIFT — total visible de capacité hebdomadaire — 27 octobre 2026

- La vue mobile personnelle présentait le détail par jour, mais pas le total de la configuration hebdomadaire par défaut. Elle affiche maintenant le total des minutes des jours activés, en EN/FR et avec un libellé distinct des exceptions datées.
- Le premier passage avait ajouté les libellés de traduction sans les rendre dans l’écran; le total est maintenant affiché sous le titre du calendrier hebdomadaire. Il additionne les jours activés uniquement et vaut zéro si le calendrier est désactivé.
- Si le calendrier est désactivé, le total est nul; les exceptions n’entrent pas dans le total hebdomadaire récurrent. Aucun contrat, calcul serveur ou roster n’est ajouté.
- Prettier ciblé et `git diff --check` passent. Le typecheck Mobile n’a pas rendu de résultat après plus d’une minute et a été interrompu; vérification visuelle sur petit écran reste à faire. Aucun test ni build lancé.
### API / PROC-02 — primitive de reprise pour événements abandonnés — 27 octobre 2026

- Après une panne, un reçu peut rester `PROCESSING`; les appels répétés le bloquaient sans voie pour le reprendre. `reclaimStaleProcessing` accepte maintenant un seuil de lease fourni par le futur worker, verrouille le reçu et ne redonne le droit de traiter qu’une fois si sa dernière tentative est antérieure au seuil. Il revérifie aussi le type et le digest idempotents, incrémente les tentatives et rafraîchit `lastAttemptAt`.
- La durée du lease reste une politique du consommateur et aucune route, tâche planifiée, rétention ou intégration ERP n’est activée dans ce lot.
- Compilation API `mvn -o -DskipTests compile` et `git diff --check` passent; aucun test automatisé lancé.
### API / PROC-02 — idempotence des claims d’événements concurrents — 27 octobre 2026

- Deux imports simultanés pouvaient ne pas trouver un reçu existant puis se heurter à la contrainte unique lors de la création. L’insertion passe maintenant par une transaction `REQUIRES_NEW`; après conflit, le claim relit le reçu gagnant et applique les mêmes contrôles de type/digest et d’état que la lecture initiale.
- Une clé identique avec un autre événement ou contenu retourne toujours un conflit; un reçu `PROCESSING`/`PROCESSED` ne réautorise pas le traitement, et seul le reçu échoué peut être réclamé. Aucun adaptateur, endpoint, mouvement de stock ou politique de lease/rétention n’est activé.
- `mvn -o -q -DskipTests compile` et `git diff --check` passent; aucun test automatisé lancé.

### API / PROC-02 — refuser les leases d’événement dans le futur — 27 octobre 2026

- La reprise d’un reçu `PROCESSING` accepte un seuil de lease fourni par le futur consommateur. Un seuil futur pouvait classer immédiatement comme abandonné un événement actuellement actif et autoriser un second traitement.
- `reclaimStaleProcessing` rejette désormais les seuils absents ou postérieurs à l’heure serveur et réutilise l’horodatage contrôlé pour enregistrer la tentative de reprise. La durée de lease reste choisie par le consommateur; aucune politique, route ou intégration n’est activée.
- `mvn -o -q -DskipTests compile`, XML Liquibase bien formé et `git diff --check` passent; aucun test automatisé lancé.

### MOB / PROC-05 — cadrer l’écran terrain de réception après PROC-03 — 27 octobre 2026

- Audit mobile confirmé : achats en lecture seule aujourd’hui; les capacités existantes de lecture caméra/code-barres et de fichiers/photos pourraient soutenir un parcours terrain QPM après définition de la réception.
- Cible conditionnelle documentée dans `PROCUREMENT-SAP-ARCHITECTURE.md` : consulter les lignes, enregistrer une quantité autorisée, scanner une référence article existante, joindre une photo et rafraîchir le reliquat/stock depuis l’API. L’écran exige une permission dédiée, une activation de module et une clé d’idempotence; aucun mode hors ligne n’est présumé.
- Cela ne débloque pas PROC-03 : unités, magasin/site, contrôle qualité, sur-réception, annulation et historique des commandes déjà créditées doivent d’abord être décidés. Aucun écran ni contrat de réception n’est activé dans ce lot de cadrage.
- En complément, le store mobile isole maintenant les chargements concurrents de la première page par identifiant de requête : une réponse d’actualisation plus ancienne ou sa fin de chargement ne peut plus écraser la réponse plus récente. Une pagination commencée avant une actualisation est également ignorée lorsqu’elle revient tardivement. L’API et le mode lecture seule restent inchangés.
- Typecheck Mobile et Prettier à consigner après exécution; aucun test automatisé lancé.

### API / PROC-02 — fournir un lot borné d’événements à reprendre — 27 octobre 2026

- La récupération d’un reçu interrompu exigeait déjà une clé connue; un futur worker n’avait pas de lecture interne pour découvrir les candidats par tenant/provider. Le service expose maintenant une recherche bornée (1–100) des reçus `PROCESSING` dont la dernière tentative précède le seuil fourni.
- Cette lecture retourne seulement des candidats, sans verrouiller le lot ni autoriser leur traitement. Le worker doit appeler `reclaimStaleProcessing` pour chaque reçu; cette opération verrouille et revérifie statut, digest, date et concurrence. Aucun ordonnanceur, endpoint public, choix de lease ou connecteur n’est ajouté.
- Compilation API `mvn -o -q -DskipTests compile` et `git diff --check` passent; aucun test automatisé lancé.

### PROC-01 / PROC-05 — ligne de conduite SAP + mobile CMMS — 27 octobre 2026

- Comparaison documentaire de SAP S/4HANA, SAP Ariba Mobile, IBM Maximo Mobile, Limble et UpKeep ajoutée à `PROCUREMENT-SAP-ARCHITECTURE.md`, avec les références et la date de recherche. Les invariants retenus sont la réception par référence de PO/ligne, l’historique traçable, les mises à jour de stock selon configuration, les permissions de réception et l’activation explicite du mobile.
- Comparaison des surfaces QPM Web/Mobile ajoutée : grille et panneau Web avec CRUD/approbation de brouillon; Mobile liste/fiches en consultation; aucune réception dans le domaine courant. La création et le panneau Web restent à contrôler sur téléphone/tablette au prochain passage visuel.
- Ligne de conduite : préserver les PO historiques; décider les invariants métier de PROC-03; séparer permissions et transitions d’approbation/réception; développer les mêmes APIs QPM Web/mobile; seulement ensuite brancher les adaptateurs serveur; définir les demandes distinctes de PROC-06 après avoir fixé source et consolidation.
- Mobile actuel confirmé en lecture seule. La prochaine cible mobile est une file de réception magasinier, ligne par ligne, avec confirmation API. Scanner/photo sont des capacités réutilisables, mais le mode hors ligne, les demandes d’achat depuis OT et l’écriture stock restent derrière les contrats/permissions qui leur manquent.
- TypeScript Mobile (`npx tsc --noEmit --pretty false`), TypeScript Web (`npx tsc --noEmit --pretty false`), compilation API `mvn -o -q -DskipTests compile`, Prettier ciblé et `git diff --check` passent. Aucun test automatisé lancé; pas de build ni de recette sur appareil.

### MOB / PROC-05 — ouvrir la fiche complète d’un PO en consultation — 27 octobre 2026

- La liste mobile affichait au plus trois lignes d’un PO et ne permettait pas d’ouvrir son détail. Chaque carte ouvre maintenant une fiche qui appelle `GET /purchase-orders/{id}` et présente toutes les lignes, unités et informations logistiques renvoyées par le DTO; les groupes de métadonnées vides sont masqués. Le détail affiche le nombre de lignes et un coût estimatif aligné sur le calcul de la grille Web à partir des coûts unitaires courants des pièces.
- L’API vérifie déjà l’entreprise et l’autorisation de consultation pour ce PO; aucun droit d’écriture, approbation ou réception n’est ajouté. L’écran est vertical et défilant, ses lignes peuvent passer à la ligne sur petit écran, et les textes EN/FR couvrent le titre et le type de commande logistique.
- Les champs absents du DTO (méthode de livraison et détails additionnels génériques) ont été écartés plutôt que de suggérer des données persistées qui ne le sont pas; la date d’information existante a été ajoutée au modèle Mobile. Prettier ciblé, `npx tsc --noEmit --pretty false` dans `mobile/` et `git diff --check` passent. Aucun test automatisé ni build demandé; affichage sur appareil non vérifié.

### PROC / API — homogénéiser l’activation du module côté serveur — 27 octobre 2026

- Un contrôle API central vérifie maintenant `PURCHASE_ORDER` pour créer, éditer, approuver/refuser ou supprimer un PO, ses lignes et ses catégories dédiées. Les lectures historiques restent accessibles avec les permissions de lecture et le périmètre société, même sans entitlement.
- L’approbation automatique des workflows `PURCHASE_ORDER_CREATED` s’exécute dans le POST déjà protégé par le contrôle du module; aucun nouvel endpoint de workflow n’est exposé. Les nouveaux droits distincts d’approbation/réception restent à définir avec compatibilité des rôles persistés.
- `mvn -o -q -DskipTests compile` et `git diff --check` passent; aucun test automatisé lancé.

### PROC — verrouiller la configuration des catégories si le module est inactif — 27 octobre 2026

- L’audit des routes `/purchase-order-categories` a révélé que `CATEGORIES` autorisait encore les écritures d’achat quand `PURCHASE_ORDER` était désactivé. Création, modification et suppression passent maintenant par la même vérification d’entitlement serveur que les PO et lignes; les lectures restent disponibles pour consulter les anciens bons.
- La route Web `/categories/purchase-order` vérifie maintenant le même feature flag avant de monter la liste; elle affiche l’état de module indisponible sans requête de catégories quand l’option est absente.
- Aucun changement de permissions génériques ni de visibilité historique. `mvn -o -q -DskipTests compile` passe; TypeScript Web et `git diff --check` passent; aucun test automatisé lancé.

### PROC — protéger les workflows qui ciblent les PO — 27 octobre 2026

- L’API de workflow est générique; elle acceptait encore des triggers, conditions ou actions Purchase Order quand `PURCHASE_ORDER` était désactivé, y compris l’action `PART_UPDATED → CREATE_PURCHASE_ORDER`. `POST` et `PATCH /workflows` exigent maintenant l’entitlement lorsqu’un des éléments vise les PO.
- `WorkflowService.runPart` laissait `CREATE_PURCHASE_ORDER` en `TODO`; cette règle pouvait être enregistrée sans produire de bon. L’API refuse maintenant cette action avec 501, l’éditeur ne propose plus `PART_UPDATED` (sa seule action est ce TODO), et les workflows historiques sont conservés pour consultation/suppression avec un message EN/FR explicite.
- Les workflows sans lien Procurement restent gérables; les workflows PO historiques restent lisibles et supprimables afin de permettre le nettoyage après désactivation. Aucune permission générique ne change. Compilation API `mvn -o -q -DskipTests compile` passe; aucun test automatisé lancé.
- L’audit CRUD a également trouvé que le détail, l’édition et la suppression chargeaient un workflow par ID global. Les parcours Client vérifient maintenant `id + company`; création, édition (qui remplace actuellement l’enregistrement) et suppression sont transactionnelles pour éviter les écritures partielles entre suppression et sauvegarde.
- L’éditeur Web masque les triggers PO lorsque le module est absent et supprime aussi `PART_UPDATED` du choix, car son unique action actuelle est non implémentée; les workflows existants restent consultables/supprimables avec un motif explicite. Le formulaire passe en deux colonnes larges sur bureau et une colonne sur téléphone/tablette, avec champs fluides et titres longs repliés. Prettier, TypeScript Web (`npx tsc --noEmit --pretty false`), compilation API (`mvn -o -q -DskipTests compile`) et `git diff --check` passent. Validation visuelle non réalisée : le navigateur de contrôle ne démarre pas sans serveur X dans cet environnement.

### PROC — valider les quantités de ligne de PO — 27 octobre 2026

- Les endpoints de ligne PO acceptent maintenant seulement une quantité finie strictement supérieure à zéro. Si la pièce n’a pas d’unité déclarée, les décimales sont rejetées au lieu d’être tronquées silencieusement sur la mise à jour d’une ligne.
- Le contrôle est limité aux mutations de lignes d’achat pour le seuil positif; les quantités liées aux OT conservent leur contrat historique. Les unités décimales autorisées restent à définir explicitement pour les pièces qui en déclarent une.
- `mvn -o -q -DskipTests compile` passe; aucun test automatisé lancé.

### PROC-05 — ne pas agréger des quantités d’unités différentes — 27 octobre 2026

- Le résumé mobile affiche maintenant les quantités regroupées par unité, comme la grille Web, au lieu de sommer des unités incompatibles. La fiche conserve également chaque quantité avec sa pièce.
- La grille Web groupe maintenant les quantités par unité, avec une valeur compacte et complète au survol. Le DTO API fournit l’unité; le modèle Mobile l’expose et la fiche/liste l’affichent auprès de chaque quantité. À garder aligné dans les futurs imports et connecteurs, en normalisant les codes/unités avant agrégation.
- Le coût estimatif Web et Mobile est masqué si aucune ligne tarifée n’existe ou si un coût unitaire manque; lorsqu’il est calculable, il est signalé comme estimation issue des coûts courants. Un prix figé sur la ligne de commande reste nécessaire pour engagement et rapprochement.
- Prettier ciblé, TypeScript Web et Mobile, compilation API Java et `git diff --check` passent. Aucun test automatisé lancé; la recette responsive Web/Mobile sur appareil reste à faire.

### MOB / PROC-05 — afficher le résumé de commande sur mobile — 27 octobre 2026

- La fiche mobile reprend les quantités regroupées par unité et le coût estimatif `coût unitaire actuel × quantité`. La devise est formatée avec les préférences de l’entreprise; les libellés EN/FR précisent qu’il s’agit d’une estimation, pas d’un prix fournisseur contractuel ni d’une valeur comptable.
- Les indicateurs s’adaptent et passent à la ligne sur petit écran; aucune action de réception ou de modification du stock n’est introduite. Le coût côté serveur n’est pas un instantané de prix de commande : une prochaine amélioration du modèle devra figer prix/devise au niveau de la ligne avant d’utiliser ce total pour engagement budgétaire ou rapprochement fournisseur.
- Prettier ciblé et `npx tsc --noEmit --pretty false` dans `mobile/` passent; aucune recette visuelle sur appareil n’a été faite.

### PROC-03 — proposer le contrat API de réception avant implémentation — 27 octobre 2026

- Contrat candidat consigné dans `PROCUREMENT-SAP-ARCHITECTURE.md`: créer un reçu idempotent par PO, exposer l’historique, écrire reçu/lignes/mouvement dans une transaction et corriger par contre-mouvement lié. Les workflows suivent le mode/version du PO et ne créent pas de réception implicite.
- À confirmer avant DTO/migration : unité/précision, site/magasin, inspection, sur-réception, clôture du reliquat et annulation quand le stock a été consommé. Cela empêche d’implémenter un formulaire Web/mobile dont les règles ne correspondent pas au modèle d’inventaire actuel.

### API / PROC-02 — indexer et clôturer avec la génération de claim — 27 octobre 2026

- La découverte des reçus abandonnés filtre et trie sur `last_attempt_at`; l’index précédent portait sur `received_at`. Une migration additive ajoute l’index de reprise correspondant à entreprise/provider/état/date de tentative.
- Chaque claim expose `attemptCount` comme génération. `markProcessed` et `markFailed` exigent maintenant cette génération et refusent une tentative périmée après une reprise, au lieu de laisser un ancien worker clôturer le reçu du nouveau.
- Cette génération ne peut pas tuer un ancien processus ni annuler un effet externe déjà parti : le futur consommateur devra rendre les mutations métier idempotentes et protéger ensemble contrôle de génération et écriture QPM. Compilation API et `git diff --check` à consigner après exécution; aucun test automatisé lancé.

### API / SHIFT — prévenir le dépassement concurrent de capacité — 27 octobre 2026

- `scheduleWorkOrder` vérifiait les OT affectés sans verrouiller le technicien; deux demandes concurrentes pouvaient donc lire les mêmes minutes libres et dépasser ensemble la capacité journalière.
- La requête de technicien est maintenant verrouillée pessimiste, dans le tenant, avant la lecture des affectations du jour. La mise à jour de ses disponibilités prend le même verrou, ce qui empêche une édition concurrente de modifier l’horaire au milieu du contrôle de capacité. Les appels concernés sont sérialisés jusqu’au commit; les contrats et les règles horaires restent inchangés.
- `mvn -o -q -DskipTests compile` et `git diff --check` passent; aucun test automatisé lancé.

### API / WORKLOAD — regrouper le chargement des OT d’équipe — 27 octobre 2026

- L’aperçu de charge chargeait chaque utilisateur puis lançait une requête d’OT par personne. La lecture charge maintenant les utilisateurs du tenant en une requête et récupère les OT de la période pour les utilisateurs primaires, assignés ou membres des équipes en une requête distincte.
- Le regroupement conserve l’entreprise, la période locale, la date d’affectation et la logique existante des trois types d’affectation; aucun total ou contrat API ne change. Les IDs utilisateur dupliqués sont dédoublonnés pour éviter de compter deux fois la même capacité.
- `mvn -o -q -DskipTests compile` et `git diff --check` passent; aucun test automatisé lancé.

### WEB / WORKLOAD — resynchroniser les données après refus de planification — 27 octobre 2026

- Lorsqu’une planification ou désaffectation échouait, le snack-bar affichait l’erreur mais la grille gardait son instantané. Après un conflit de capacité causé par une autre affectation, l’utilisateur pouvait donc voir un planning devenu périmé.
- Les parcours d’échec rechargent maintenant l’aperçu et la file des OT non planifiés avant d’afficher l’erreur. Les mutations optimistes ne sont pas appliquées en cas d’échec; les données restent celles confirmées par l’API.
- TypeScript Web (`npx tsc --noEmit --pretty false`), Prettier ciblé et `git diff --check` passent; aucun test automatisé lancé.

### WEB / OT — verrouiller les mises à jour concurrentes d’une tâche — 27 octobre 2026

- La liste désactive les contrôles après le début d’une sauvegarde, mais le changement d’état React peut arriver après un second événement rapproché. Un verrou immédiat par ID de tâche empêche maintenant une deuxième mutation pendant l’appel API; le rollback optimiste de la première valeur ne peut plus écraser une seconde valeur concurrente.
- Le verrou se libère en succès comme en erreur, pour permettre une nouvelle tentative. Le payload, les workflows `TASK_UPDATED` et les permissions restent inchangés.
- TypeScript Web (`npx tsc --noEmit --pretty false`), Prettier ciblé et `git diff --check` passent; aucun test automatisé lancé.

### WEB / SHIFT — limiter la durée planifiée à des minutes entières — 27 octobre 2026

- La boîte de planification des OT sans durée séparait heures et minutes, mais acceptait des valeurs fractionnaires. Elle normalise maintenant les deux entrées en entiers, borne les minutes de 0 à 59 et définit le pas numérique à une minute; le total envoyé à l’API garde sa précision à la minute.
- Les champs restent empilés sur petit écran et côte à côte à partir du breakpoint `sm`. Aucune règle de capacité ni contrat API ne change.
- TypeScript Web (`npx tsc --noEmit --pretty false`), Prettier ciblé et `git diff --check` passent; aucun test automatisé lancé.
### PROC-03 / PR — relier réception, stock et suivi du demandeur — 28 octobre 2026

- Les réceptions des nouveaux PO versionnés créent désormais une `PartTransaction` de stock liée de façon unique à la ligne de reçu. Reçu, stock et transaction restent dans une transaction; les anciens mouvements ne sont pas réinterprétés. L’export des transactions inclut les IDs PO/reçu et la référence, chargés par jointures pour ne pas générer une requête par mouvement.
- Un demandeur peut consulter le suivi de sa propre réquisition même sans permission de visibilité globale. L’API, la page Web et le menu permettent ce parcours aux rôles qui peuvent créer des demandes. La liste reste restreinte au créateur sauf si le rôle possède à la fois lecture des demandes et portée « autres utilisateurs »; la frontière société reste appliquée.
- Prochaine tranche métier selon SAP : décider la compensation/annulation d’une réception. Le stock QPM est actuellement agrégé par pièce, sans allocation des consommations OT à un reçu; un solde suffisant empêche un stock négatif, mais ne prouve pas que le reçu source n’a pas été consommé puis remplacé. Il faut choisir si cette règle convient ou si un suivi par lot/source est requis. Puis définir la clôture du reliquat. Magasin/site, précision d’unités et inspection/quarantaine restent à cadrer. La recette tactile mobile réelle et la file « à recevoir » restent aussi ouvertes.
- Cadrage SAP ajouté le même jour : l’annulation doit référencer le mouvement d’origine et respecter sa situation de stock; la clôture du reliquat est un état/action distinct qui conserve l’historique de réception. QPM n’exposera pas d’annulation fondée uniquement sur le solde agrégé. Prochaine fonction sans dépendance de traçabilité : clôture auditée du reliquat; l’annulation attendra un lien source/lot ou une réservation permettant de prouver que les quantités sont encore disponibles.
- Première file « à réceptionner » implémentée côté API, Web et mobile : requête base paginée par entreprise/statut/flux et existence d’un reliquat de ligne, portée « autres utilisateurs » appliquée côté serveur, pagination bornée, bascule responsive Web, reliquat agrégé par unité et pagination/refresh mobile. `npx tsc --noEmit` Web/Mobile, `git diff --check`, build Docker API (`BUILD SUCCESS`, `-DskipTests`) et build Web de production (`Compiled successfully`) passent. Le service n’a pas été redémarré; il faut encore vérifier l’endpoint sur base réelle et faire une recette Web/mobile après déploiement. Filtres échéance/fournisseur, tri opérationnel, responsable/prochaine action et réduction du chargement des lignes restent au backlog.
- `git diff --check`, parsing XML Liquibase, TypeScript Web/Mobile et compilation Java ciblée des entités, services, contrôleurs, repositories et export passent. Les images `atlas-cmms-frontend:local` et `atlas-cmms-backend:local` sont bâties; le build API Maven dans Docker a fini `BUILD SUCCESS`. Le Maven lancé sur l’hôte reste limité par le cache `~/.m2` en lecture seule et l’absence locale de `micrometer-registry-prometheus:1.15.12`. Les builds ont utilisé `-DskipTests`; aucun test n’a été exécuté. Les services n’ont pas été redémarrés.
