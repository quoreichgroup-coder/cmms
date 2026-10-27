# Arrêts planifiés — cadrage QPM inspiré de SAP PM

**État :** découverte initiale, 27 octobre 2026
**Backlog :** `SHUTDOWN-01`; dépendance ultérieure de `READINESS-01`.

## Référence SAP et principes retenus

SAP S/4HANA décrit des *maintenance events/windows* qui rendent visibles des périodes pendant lesquelles un équipement est disponible pour la maintenance. Des ordres d’entretien peuvent être associés à l’événement; leur planning peut être ajusté à cette fenêtre. Un événement de maintenance n’est donc ni l’ordre de travail, ni un historique de panne. [Finding and Using Maintenance Windows](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/8308e6d301d54584a33cd04a9861bc52/b679f8008d724bf4a9bed302a36b9ed1.html)

SAP distingue aussi les *event-based planning buckets*, utilisés pour regrouper les activités d’un événement unique, des listes opérationnelles récurrentes. Ces fenêtres servent à organiser plusieurs activités sur une période commune, surveiller les ressources/pièces et ajuster les dates de travail. Les ordres et avis restent des objets séparés, affectés à l’événement. [Maintenance Backlog Management](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/9f8af92329054abb981aef4c826ffb36.html), [Planning Maintenance Work for Assets](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/41acaa2e02354a10a50dc102f60f8471.html)

Le guide d’utilisation SAP exige une interface desktop ou clavier/souris pour le glisser-déposer du graphique de planification; le tactile n’est pas pris en charge par ce parcours précis. QPM devra conserver un moyen explicite d’assigner et déplacer une OT depuis téléphone/tablette, sans faire du glisser-déposer la seule commande. [Finding and Using Maintenance Windows](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/8308e6d301d54584a33cd04a9861bc52/b679f8008d724bf4a9bed302a36b9ed1.html)

## Inventaire QPM

- `AssetDowntime` est un fait d’indisponibilité associé à un équipement, avec début et durée. Il alimente disponibilité, durée d’arrêt et statistiques MTBF.
- `WorkOrder` porte le travail demandé, les tâches, affectations, pièces et dates d’exécution.
- Les statuts d’actif comme `EMERGENCY_SHUTDOWN` décrivent l’état opérationnel actuel; ils ne fournissent ni fenêtre prévisionnelle ni historique de révisions.
- Aucun modèle d’événement/arrêt planifié ou d’association OT-vers-fenêtre n’a été trouvé dans l’API, le Web ou Mobile.

**Conclusion :** ne pas étendre `AssetDowntime` pour y stocker les arrêts prévus. Les statistiques actuelles le traitent comme une durée d’arrêt effective; y insérer des prévisions gonflerait les temps d’arrêt historiques et la disponibilité.

## Modèle fonctionnel proposé

```text
ShutdownEvent (fenêtre / événement planifié)
  ├─ baseline immuable + révisions de dates/motif/approbation
  ├─ périmètre : site, zone et actifs (règles de chevauchement à définir)
  ├─ OT associées (relation; le cycle de vie WO reste indépendant)
  ├─ état planifié / en cours / terminé / annulé
  └─ réalisé : début/fin réels, compte rendu et références aux faits AssetDowntime
```

Un arrêt planifié représente une **intention de coordination**. Il ne change pas automatiquement le statut d’un équipement, ne ferme pas d’OT, ne réserve pas de capacité d’équipe et ne crée pas un `AssetDowntime`. Les données réelles ne deviennent des faits qu’à leur saisie/confirmation. Une actualisation conserve les valeurs de référence et ajoute une révision attribuée à un acteur, horodatée et motivée.

### Contraintes d’intégrité

- Dates prévues : début strictement antérieur à fin; fuseau interprété selon le site ou la zone explicitement configurée.
- Révisions et annulations historisées; un changement n’écrase pas le baseline approuvé.
- Liens vers OT/actifs dans la même entreprise et dans le périmètre de site autorisé; une suppression de fenêtre ne supprime jamais les OT ni les arrêts réels.
- Plusieurs OT peuvent être associées à une fenêtre; une OT peut-elle être dans plusieurs fenêtres est une règle à confirmer.
- Chevauchements ne sont pas bloqués silencieusement : le système signale les conflits d’actif/fenêtre; la politique de résolution doit être définie par le pilote.
- Import Excel avec prévisualisation, validation et rapport d’erreurs; aucun effet de bord avant confirmation et aucune duplication au retry.
- Interfaces desktop, tablette et mobile partagent les mêmes contrats et droits. Le déplacement exact sur une timeline a une commande de repli accessible au clavier et au tactile.

## Tranches du chantier

| Lot | Livrable | Garde-fou |
|---|---|---|
| SHUT-01 — métier | Définir propriétaire, approbations, site/fuseau, périmètre, baseline et règles de révision. | Pas de changement aux OT ni aux mesures de panne. |
| SHUT-02 — lecture | API et calendrier lisant les événements et conflits, filtrés par entreprise/site. | Données prévisionnelles clairement séparées des temps d’arrêt réels. |
| SHUT-03 — association OT | Ajouter/retirer une OT d’une fenêtre et visualiser les ordres à préparer. | Aucun changement automatique de dates/statut WO; proposer un ajustement explicite. |
| SHUT-04 — exécution | Début/fin réels et rapprochement avec `AssetDowntime`, sans double comptage. | Définir si l’événement crée ou référence le fait d’arrêt réel. |
| SHUT-05 — import et expérience mobile | Import avec aperçu, calendrier responsive, formulaires utilisables au toucher. | Idempotence et mêmes permissions Web/API/Mobile. |
| READINESS — disponibilité | Signaux de fenêtre, ordre, pièces et ressources, avec provenance et fraîcheur. | Signaux explicables; aucun feu vert automatique d’exécution. |

## Questions à décider avec le site pilote

1. Le périmètre peut-il inclure plusieurs actifs, une zone entière, ou les deux? Comment hérite-t-il de la hiérarchie des actifs?
2. Un arrêt planifié bloquera-t-il la planification d’OT, ou ne sera-t-il qu’un repère d’information?
3. Qui crée, approuve, révise et annule? Faut-il une séparation auteur/approbateur?
4. Une OT peut-elle appartenir à plusieurs fenêtres? Qui contrôle et approuve son déplacement?
5. Le début/fin réel crée-t-il un `AssetDowntime`, ou lie-t-on un enregistrement existant? Comment gérer l’écart, les pauses et les arrêts qui chevauchent minuit?
6. Quels imports Excel réels existent, quelles colonnes sont stables, et qui peut confirmer la prévisualisation?

## Première implémentation autorisée

Le lot immédiatement utile est la lecture du contrat existant et la maquette des flux/API, suivie d’un modèle additif pour événement et révision **après** réponse aux questions 1–5. Dans l’intervalle, le périmètre métier est cadré ici; aucun champ n’est ajouté à `AssetDowntime`, aucun nouvel arrêt planifié n’est persisté et aucune date/status OT ne change.
