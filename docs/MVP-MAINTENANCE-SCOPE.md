# Périmètre verrouillé — MVP Maintenance QPM

> Ce document détaille le sous-périmètre Maintenance. Le périmètre faisant autorité pour l’ensemble du projet est [`MVP-PROJET-QPM.md`](MVP-PROJET-QPM.md).

## Objectif

Livrer un parcours de maintenance fiable de la préparation du travail à son exécution :
**Task List → plan PM → Work Order → exécution**. Les corrections doivent préserver les routes, les données existantes, les droits et l’application mobile.

## Inclus dans le MVP

1. **Task Lists**
   - Un seul espace de création et d’édition des groupes, compteurs, opérations et composants.
   - Numéros de groupe et compteurs générés automatiquement.
   - Création, modification, duplication, réordonnancement et suppression soumis aux règles d’usage existantes.
   - Import/export CSV cohérent, avec rejet des lignes invalides et absence de perte silencieuse.
   - Configuration des valeurs par défaut et catalogues dans Settings.
2. **Planification du travail**
   - Opérations reliées au bon compteur et composants reliés à la bonne opération.
   - Calcul du travail prévu à partir de la durée et du nombre de techniciens lorsque les unités sont reconnues; saisie manuelle conservée sinon.
   - Sélection d’une Task List active, valide et compatible avec l’équipement ou l’emplacement dans un PM ou un WO.
3. **PM vers WO**
   - Génération d’un WO à partir du plan PM et transfert des opérations/composants prévus comme instantané de planification.
   - Les composants prévus restent distincts des réservations et consommations de stock.
   - Le comportement des échéances, cycles et occurrences PM déjà présents est conservé.
4. **Fiabilité et accès**
   - Contrôles serveur d’entreprise, de site, de permission et d’appartenance des références.
   - États explicites de chargement, erreur, accès refusé et absence de données sur les parcours touchés.
   - Présentation utilisable sur petit écran; les contrats et routes mobile existants restent compatibles.

## Hors périmètre de ce MVP

- Refonte générale du sidebar ou du design system.
- Nouvelle pagination serveur de l’historique équipement; la pagination actuelle de l’interface est conservée.
- Nouveaux modules de fiabilité, analytics ou tableaux de bord.
- Intégration active ou écriture vers SAP; seules les données et frontières déjà en place sont préservées.
- Nouvelles fonctions Procurement, approbations d’achat ou changements de leurs workflows.
- Refonte de l’application mobile ou changement de ses endpoints.
- Extension des plans multi-compteurs/stratégies au-delà des fonctions déjà présentes.

## Critères de sortie

- Une Task List peut être créée, rouverte, modifiée et sélectionnée dans un PM/WO sans intervention en base.
- Les opérations gardent leur compteur, leur ordre, leurs unités, leur temps et leur nombre de techniciens.
- Les composants restent liés à leur opération avec quantité, unité, emplacement magasin et coût estimé disponibles.
- Un WO généré conserve l’instantané des opérations et matériaux planifiés; aucune consommation n’est créée implicitement.
- Les contrôles de droits refusent les références hors entreprise ou hors site.
- Un import invalide échoue clairement et sans création partielle; un import valide peut être exporté puis relu sans incohérence.
- Les parcours concernés restent utilisables en responsive et les routes/payloads mobiles existants sont inchangés.

## Vérification locale — 5 novembre 2026

- Le format CSV exporte désormais `operationOrder`; l’import trie les opérations à partir de cette valeur et conserve les composants sur leur opération.
- Les CSV historiques sans cette colonne restent acceptés et conservent leur ordre de lignes comme solution de compatibilité.
- En cas de rejet d’une ligne, l’interface FR/EN indique son numéro sans afficher le détail interne de l’exception serveur.
- `MaintenanceTaskListCsvTest` couvre l’ordre explicite, la compatibilité historique et l’export; ces tests unitaires passent. Les suites Task List/configuration/PM et de sécurité documentaire passent également dans le lot ciblé (**64 tests au total, 0 échec**, rapports Surefire).
- Reste à valider : import/export sur une instance avec droits réels, références de pièces valides, ainsi que persistance et sélection dans PM/WO. Aucun accès à une base ou à des services de recette n’a été disponible pendant cette vérification.

## Règle de changement

Tout nouveau besoin découvert est d’abord classé comme **bloquant MVP** ou **post-MVP**. Seuls les défauts qui empêchent un critère de sortie, compromettent les données ou contournent les droits entrent dans le chantier courant. Tout le reste est ajouté au backlog post-MVP sans démarrer son implémentation.
