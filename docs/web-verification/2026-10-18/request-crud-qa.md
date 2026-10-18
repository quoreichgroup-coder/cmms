# QPM Web — QA CRUD des demandes

Date : 2026-10-18

## Périmètre vérifié

Le formulaire Web des demandes et son slice Redux ont été suivis de bout en bout côté code : recherche paginée, ouverture par ligne ou URL directe, création, édition, approbation (conversion en OT), rejet avec motif et suppression confirmée. Les chemins API existants du contrôleur sont conservés : `POST /requests`, `PATCH /requests/{id}`, `PATCH /requests/{id}/approve`, `PATCH /requests/{id}/cancel?reason=…` et `DELETE /requests/{id}`.

Le formulaire applique Yup, rend les champs métier configurés, téléverse les pièces jointes avant l'envoi, et affiche les erreurs de liste/détail avec une action de reprise. Les permissions d'interface sont vérifiées avant l'affichage des actions. Le contrôleur Spring protège les mutations avec le rôle client; les restrictions d'accès objet sont déléguées au service et n'ont pas été testées en exécution dans cette session.

## Défauts corrigés

- Le motif de rejet était concaténé sans encodage dans la query string. Les caractères `&`, `+`, `#` et les caractères accentués pouvaient changer la valeur reçue. Le motif est maintenant encodé avant l'appel, sans changement de contrat API.
- Après rejet, le détail chargé directement par URL pouvait rester visuellement en attente. La mutation met désormais aussi à jour `singleRequest`.
- La suppression fermait la fiche avant la réponse serveur et affichait le succès même quand l'API répondait `success: false`. La fiche ne se ferme maintenant qu'après confirmation; le thunk retourne le booléen serveur.

## Tests exécutés

- Nouveau `scripts/request-crud.test.cjs` : create/edit, encodage du motif et cohérence du détail après rejet, delete confirmé/refusé et compteur en attente.
- Suite finale `node --test scripts/*.test.cjs` : 57 fichiers verts (dont couverture Requests, Work Orders, dashboard maintenance, PM, Assets, rapports, calendrier, accessibilité et navigation).
- Exécution directe de `node scripts/crud-delete-confirmation.test.cjs` : 10/10 scénarios verts, chacun couvrant refus et confirmation.
- `tsc --noEmit --pretty false` : réussi.
- ESLint ciblé sur `src/slices/request.ts` et `src/content/own/Requests/index.tsx` : réussi.
- `git diff --check` : réussi.
- `GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=2048 npm run build` : réussi. Le build signale des avertissements de mise en forme préexistants dans `CompanyLegalDetails.tsx`, `CompanySites.tsx`, `PMPlanConfigurationEditor.tsx` et `components/form/SelectTasks/index.tsx`.
- ESLint ciblé sur les écrans et slices modifiés lors de la passe de suppressions : réussi.

## Limites

Les tests CRUD utilisent une API simulée; ils ne prouvent pas la persistance réelle, les réponses réseau, les rôles ni l'isolation multi-tenant. Aucun backend authentifié n'était accessible. Chromium 155 est installé, mais le bac à sable interdit la création de sockets locaux (`PermissionError: Operation not permitted` sur le serveur statique et `curl localhost`); le test visuel interactif du formulaire dans Chromium reste donc à exécuter dans l'environnement local du projet.

## Autres formulaires

Les tests automatisés existants couvrent déjà plusieurs flux Work Orders (liste/détail/erreurs), Assets (permissions et données associées), maintenance préventive (configuration, prévisualisation, compteurs), intégrations et état des rapports. Cette passe n'a pas envoyé de mutations live sur ces modules; ces opérations nécessitent un compte et un serveur disponibles.

## QA étendue — OT et formulaires associés

L'inspection des formulaires Work Orders et Preventive Maintenance a trouvé deux autres cas cohérents avec les défauts de Requests :

- Les suppressions d'OT, d'équipement, de pièce, de plan préventif et de demande d'achat traitaient une réponse `{ success: false }` comme une réussite, car le thunk ne retournait pas le résultat. Les thunks renvoient maintenant le booléen API; les écrans n'affichent le succès et ne ferment les détails qu'après confirmation. En cas d'échec, le détail reste accessible.
- Les formulaires OT et PM n'envoyaient pas une liste de tâches vide lorsqu'on retirait toutes les tâches. Les endpoints `PATCH /tasks/work-order/{id}` et `PATCH /tasks/preventive-maintenance/{id}` l'acceptent et suppriment les tâches existantes; les deux formulaires transmettent maintenant explicitement la liste vide.

Tests supplémentaires : `work-order-delete.test.cjs`, `work-order-task-update.test.cjs`, `pm-task-update.test.cjs`. Les appels OT et tâches sont séquentiels et portent sur deux endpoints; ils ne sont pas atomiques côté backend. Une panne entre ces appels peut donc laisser une sauvegarde partielle. Une transaction backend dédiée serait nécessaire pour garantir l'atomicité, hors périmètre de cette correction frontend.

## QA étendue — suppressions des référentiels et paramètres

La même incohérence de confirmation existait pour les compteurs, équipes, fournisseurs, clients, workflows, clés API, checklists, fichiers, localisations et portails de demandes. Leurs thunks renvoient maintenant le `success` retourné par l'API; les vues n'annoncent plus un succès quand le serveur refuse la suppression. Pour les fiches en tiroir ou les dialogues de confirmation, le contexte reste disponible après refus ou erreur.

`scripts/crud-delete-confirmation.test.cjs` vérifie les dix thunks avec réponses refusée et confirmée. La vérification directe du script couvre les deux branches pour chaque slice.
