# QPM — Backlog UI/UX final et modules de maintenance

**Statut : base de navigation Mobile et onboarding versionné intégrés; backend `mvn test` complet réussi. La recette Work Orders contre API réelle, Chromium authentifié et validation appareil restent ouvertes. APK signé 1.0.59 reconstruit le 20 octobre.**
Ce document complète [`WEB-UI-REDESIGN-BACKLOG.md`](WEB-UI-REDESIGN-BACKLOG.md) et [`MVP-MOBILE-QPM.md`](MVP-MOBILE-QPM.md). Il conserve les routes, contrats et règles métier tant qu’un lot backend dédié n’a pas été cadré.

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
| WEB-SIDEBAR-01 | P1 | Le pied compact est corrigé pour réserver 160 px aux trois actions empilées et éviter leur débordement; restent labels, scroll indépendant, tablette et drawer mobile à vérifier visuellement. | Complète UX-02/UX-14 existants; aucun changement de route/droit. Test de layout dédié passe; recette navigateur réelle encore requise. |
| WEB-SIDEBAR-02 | P2 | Vérifier la surface claire, les sous-entrées en survol/sélection, les contrastes et les captures à plusieurs largeurs. | Décision visuelle avec contrôles responsive et WCAG AA; tenir compte de l’accent entreprise. |
| SHIFT-ROSTER-01 | P2 | Spécifier puis étendre le roster par site/centre : shifts et rotations configurables, équipes/personnes, repos, absences, remplacements, validation, relève et présence prévue/réelle. | Réutiliser shift config et People/Teams; migration/API probable. Import/export et détection de conflits après contrats validés. |
| SHUTDOWN-01 | P2 | Découverte, puis BP baseline/révisions immuables, planifié/réel, reports historisés, site/zone, multi-jours et import Excel avec prévisualisation. | Nouveau domaine backend, migrations, droits par site et audit. Liens OT/ressources en lecture d’abord. |
| PROCUREMENT-01 | P2 | Cartographier PurchaseOrder, PartQuantity, workflows et statuts; spécifier suivi des besoins, PR/PO, livraisons partielles, responsable et relances. | Réutiliser achats/inventaire; modèle/API seulement après audit des champs et liens existants. Transactionnalité et imports idempotents requis. |
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

Installer le build 1.0.59 sur un appareil Android et vérifier premier login/skip/complétion/replay de l’onboarding, navigation, scan QR/NFC et clôture WO. Aucun appareil n’est connecté à la session actuelle; ces contrôles natifs ne sont donc pas revendiqués. Le P0 MOB-WO-04 reste ouvert jusqu’à reproduction de la liste/filtres/détails WO contre l’API réelle et examen de la trace/payload d’origine. La recette Chromium Web authentifiée reste ouverte faute de navigateur exécutable. Avant d’implémenter Shift Roster, Shutdown BP ou Procurement Tracking, produire des spécifications métier distinctes.

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
- Tests ciblés d’état : 5/5; suite Mobile : **31/31**; TypeScript Mobile, Prettier ciblé et export Expo Web passent. L’unique échec de la première suite était un test d’apparence qui comptait les icônes de Settings avant l’ajout de l’action Replay; l’attendu a été ajusté et la suite complète repasse. Le build/test Maven n’est pas disponible dans cet environnement (`mvn` et `api/mvnw` absents); le XML Liquibase est valide. Test visuel natif et application de migration en base restent à faire.
- Le contenu de bienvenue et de scan respecte les droits du compte : le scan n’est présenté que si l’accès Equipements est accordé; les aperçus de modules sont filtrés avec les permissions et la configuration déployée. Aucun état ou fonctionnalité n’est simulé comme actif.
- Le même audit a trouvé que le PATCH générique `/user-settings/{id}` validait l’ID du chemin mais sauvegardait l’ID reçu dans le corps. Le contrôleur lie maintenant la sauvegarde à l’ID des préférences authentifiées; deux tests de régression couvrent la tentative de redirection et le refus d’une autre ligne utilisateur. Leur exécution reste à confirmer faute de Maven.
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
- Aucun changement de code applicatif dans cette vérification. Les prochains contrôles bloquants restent : trace/payload serveur complet pour MOB-WO-04, tests Maven/API de l’onboarding et de l’isolement, recette Chromium Web authentifiée, puis essais Android/iOS sur appareils réels. Shift Roster, Shutdown Calendar et Procurement restent en cadrage, sans modèle/API ajoutés.

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
