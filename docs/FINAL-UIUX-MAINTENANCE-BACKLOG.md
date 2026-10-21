# QPM — Backlog UI/UX final et modules de maintenance

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
| **P1 — DOC-03 (catalogue WO additif livré; provider de valeurs en attente)** | Providers et catalogue de champs sûrs | Route `GET /work-orders/{id}/report/fields` ajoutée : descripteurs allowlistés seulement, sans valeur du WO, et vérification société + `canBeViewedBy`. Le PDF courant n’est pas modifié et les clés ne sont pas des expressions exécutables. Avant de résoudre des valeurs configurables, trancher le droit aux coûts (aucune permission dédiée trouvée) puis ajouter un provider WO testable; cartographier WR/PR/PO aux services/entités réellement présents. Totaux calculés côté serveur. Aucun SQL, script, URL distante ou expression arbitraire venant du client. |
| **P1 — DOC-04** | Schéma JSON de template versionné, minimal | Spécifier et valider une mise en page déclarative avec bindings typés, options papier et sections. Version publiée immuable; chaque génération conserve la version exacte. Introduire de manière additive et garder `ReportConfig` lisible pendant la migration. Contrat et rollback validés avant toute migration. |
| **P1 — DOC-05** | Premier template WO configurable | Réutiliser Thymeleaf/iText pour Classic/Modern via le provider et template publiés. Inclure les données de main-d’œuvre/employés réelles quand elles existent et sont sélectionnées, les informations légales existantes, la pagination et A4/Letter portrait/paysage. Les rapports `work-order-report-v1` restent téléchargeables. |
| **P2 — DOC-06** | Bibliothèque de modèles Web | Ajouter recherche, brouillon, duplication, aperçu, validation, publication, archivage et historique, avec composants MUI, design tokens, autorisations et états accessibles. Commencer par des blocs/champs prédéfinis; n’ajouter un éditeur drag-and-drop complet qu’après validation de l’usage. |
| **P2 — DOC-07 (audit des sources fait)** | Demandes / Achats | Audit confirmé : `Request` est une demande de maintenance, pas une PR; `PurchaseOrder` est l’objet achats existant et ses lignes embarquent un coût. Ajouter providers distincts après DOC-03; total PO calculé par le backend. L’impression ne déclenche jamais approbation/réception. Pas de PDF PR tant qu’un vrai modèle PR n’existe pas. |
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
5. DOC-07 et DOC-09 pour élargir aux demandes/achats et prouver l’extensibilité.
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
