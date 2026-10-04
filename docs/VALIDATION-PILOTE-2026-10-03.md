# Validation du pilote convoyeur — 3 octobre 2026

Les suites ciblées et le parcours métier ont été exécutés sur une installation de test isolée. Les problèmes constatés pendant les essais ont été corrigés, puis les contrôles concernés relancés.

## Résultats

| Contrôle | Résultat |
| --- | --- |
| API : services et contrôleurs métier, licences, transactions PostgreSQL, client réel de l’autorité et contrôle de tenant | 971 tests réussis, 0 échec, 0 erreur, 0 ignoré |
| Autorité de licences, dont 7 tests d’intégration PostgreSQL | 10 tests réussis, 0 ignoré |
| Thunks mobiles des demandes | 4 tests réussis |
| Console de licences | 2 tests réussis |
| Synthèse préventive de l’équipement | 5 tests réussis |
| Parcours métier dans Chromium et vérifications associées par HTTP | 10 contrôles réussis |
| Seuils de compteur `MORE_THAN` et `LESS_THAN` par HTTP réel | 2 scénarios réussis |
| Compilation de production frontend et packaging API | Réussis |
| `/health-check` de l’API isolée | HTTP 200 |
| `git diff --check` | Réussi |

Les cinq suites de tests totalisent **992 tests réussis**. Les contrôles métier et les scénarios de seuil sont présentés séparément : ils combinent plusieurs assertions et opérations. La sélection API ne représente pas toute la suite du dépôt.

## Parcours exercé

- Connexion du responsable dans le frontend compilé et licence signée valide en `PREPRODUCTION`, sans mode preview et sans lecture seule.
- Ouverture du convoyeur et de sa demande ; approbation dans le navigateur, choix de l’état de l’équipement et création de l’ordre lié. Le demandeur, l’approbateur et l’emplacement sont conservés.
- Affectation au technicien et préparation des tâches par les API de l’installation isolée. Passage en cours, saisie du diagnostic et validation de la tâche depuis l’interface du technicien.
- Enregistrement de 1 800 secondes de travail et consommation d’une pièce par HTTP réel ; contrôle du stock passé de 10 à 9 et affichage de la pièce dans l’ordre.
- Clôture par le responsable dans le navigateur avec retour obligatoire ; contrôle de la date de clôture, du diagnostic, des tâches et du lien demande–ordre après relecture serveur.
- Création d’une demande par le rôle demandeur. L’approbation est absente de son interface et une tentative directe est refusée HTTP 403.
- Tentative d’association d’une pièce d’une autre organisation : HTTP 403 ; la pièce autorisée reste seule associée et son stock reste à 9.
- Synthèse du convoyeur : zéro affiché comme `0 h`, distinction du compteur sans relevé, pièce liée, pagination des demandes, échéances dans l’ordre chronologique et plan désactivé absent.
- Écran de 390 × 844 : absence de débordement horizontal de la page, titre du bandeau sur une ligne et ordre terminé visible dans l’historique. Le nom complet reste affiché dans la fiche.

Les états initiaux sont préparés par API. Le plan désactivé est une donnée de fixture inscrite directement dans la base isolée ; son action de désactivation dans une interface n’a pas été testée. Les scripts sont réexécutables sur ce jeu de données et sautent certaines mutations déjà effectuées.

## Compteurs

Pour chaque condition, un compteur et un convoyeur séparés ont été créés. La valeur du seuil est 100. Le côté non déclencheur et l’égalité ne génèrent pas d’ordre ; la valeur strictement déclenchante génère un ordre. Modifier le relevé en restant de ce côté en génère un deuxième.

Un nouveau relevé le même jour est refusé HTTP 406, sans génération d’ordre. La date du premier relevé de test est ensuite reculée de deux jours dans la seule base du pilote pour simuler une journée autorisée : le nouveau relevé génère un troisième ordre.

Ces essais confirment le comportement documenté : `recurrent=false` et `waitBefore=30` n’empêchent actuellement pas la répétition. Aucune règle de répétition ni de sécurité industrielle n’a été modifiée.

## Corrections issues des essais

1. La synthèse préventive triait sur `nextWorkOrderDate`, une propriété calculée du DTO absente de l’entité JPA : cela provoquait HTTP 500. Elle utilise désormais le tri persistant par identifiant, lit les pages des plans actifs puis sélectionne les quatre premières échéances calculées. Le bloc préventif présent deux fois est ramené à un seul.
2. La colonne « Emplacement » des demandes lisait le nom de l’équipement. Elle lit maintenant le nom de l’emplacement.
3. Le contrôle de tenant inspectait par réflexion les objets `Long` d’une liste d’identifiants ; Java 17 refusait cet accès et bloquait la consommation des pièces. Les valeurs simples et nulles sont maintenant ignorées par cette inspection. La validation des objets liés à une organisation reste exercée par les tests unitaires et le refus HTTP réel d’une pièce étrangère.
4. Un nom long débordait verticalement du bandeau mobile. Il reste désormais sur une ligne avec une ellipse ; les boutons restent visibles.

## Preuves conservées

- [Résultats des contrôles métier](validation-pilote/2026-10-03/results.json).
- [Résultats des seuils](validation-pilote/2026-10-03/meter-results.json).
- [Résumé des sorties de tests](validation-pilote/2026-10-03/preuves.txt).
- [Convoyeur sur ordinateur](validation-pilote/2026-10-03/convoyeur-desktop.png).
- [Intervention clôturée](validation-pilote/2026-10-03/intervention-cloturee.png).
- [Premier écran mobile](validation-pilote/2026-10-03/convoyeur-mobile-ecran.png).
- [Fiche mobile complète](validation-pilote/2026-10-03/convoyeur-mobile.png).

Les captures utilisent uniquement des données de test. Les mots de passe, jetons, clés privées et états de connexion ne sont pas copiés dans ces preuves.

## Réexécution

Les tests courts utilisent les dépendances du frontend et du mobile :

```sh
npm --prefix frontend run test:license-console
npm --prefix frontend run test:asset-maintenance
npm --prefix mobile run test:request-pilot
```

La validation des thunks mobiles de cette session utilise TypeScript et Redux déjà installés dans le frontend :

```sh
NODE_PATH="$PWD/frontend/node_modules" node --test mobile/scripts/request-pilot.test.cjs
```

Les scripts métier se trouvent dans [mine-pilot.e2e.cjs](../frontend/scripts/mine-pilot.e2e.cjs) et [mine-meter-pilot.cjs](../frontend/scripts/mine-meter-pilot.cjs). Ils nécessitent une API réelle, le frontend compilé, une licence de test signée et un fichier de fixture privé préparé pour l’installation isolée.

La fixture doit fournir `password`, `asset` (`id`, `name`), `request` (`id`), `workOrder` (`id`), `technician` (`id`), `part` (`id`) et les `tasks` avec leurs `taskBase.taskType`. Les comptes utilisés sont `responsable@pilot.test`, `technicien@pilot.test` et `demandeur@pilot.test`. Le convoyeur porte les compteurs et plans nommés dans le script. L’ordre et la demande liée doivent être préparés ; le script conserve les états déjà exécutés.

Pour les seuils, `appdb` doit être une base isolée nommée `qpm_pilot_<nombre>`, accessible avec le rôle local `qpm_test` sur le port 55439. Le script refuse un nom différent avant de modifier l’horodatage de sa fixture.

```sh
QPM_PILOT_FIXTURE=/chemin/prive/fixture.json \
QPM_PILOT_URL=http://127.0.0.1:3410 \
QPM_PLAYWRIGHT_MODULE=/chemin/vers/playwright \
node frontend/scripts/mine-pilot.e2e.cjs

QPM_PILOT_FIXTURE=/chemin/prive/fixture.json \
node frontend/scripts/mine-meter-pilot.cjs
```

Playwright et son navigateur doivent être installés. Dans cette session, Java 17, Maven 3.9.9, Node 22.14.0, Playwright 1.51.1 et Chromium 1161 sont temporaires sous `/tmp/qpm-validation`. Les bibliothèques Chromium et les polices ont été extraites dans `/tmp`, sans installation système. `LD_LIBRARY_PATH`, `FONTCONFIG_FILE` et `PLAYWRIGHT_BROWSERS_PATH` désignent ces dossiers temporaires.

Les commandes d’intégration PostgreSQL de licences sont documentées dans [QUOREICH-Licensing-Policy.md](../dev-docs/QUOREICH-Licensing-Policy.md). Les sorties locales complètes de cette session sont `/tmp/qpm-validation/api-pilot-final.log`, `authority-retest.log`, `frontend-pilot-build.log` et `pilot/e2e-final.log`.

## Limites

Le test mobile visuel concerne le web responsive ; aucun appareil ni émulateur Android/iOS n’a été utilisé. Les quatre tests mobiles portent sur les thunks des demandes. Les uploads, les signatures et les documents avec stockage externe ne sont pas validés : aucun MinIO n’est configuré dans ce pilote.

La compilation frontend conserve dix avertissements de sourcemaps absentes dans des dépendances. La connexion WebSocket et les notifications en temps réel ne font pas partie des contrôles : le proxy HTTP temporaire utilise les replis SockJS et des avertissements apparaissent à la déconnexion.

Les services temporaires sont arrêtés après validation. Les changements restent locaux ; aucun déploiement, changement du fournisseur de l’installation existante ni modification de ses données n’a été effectué.
