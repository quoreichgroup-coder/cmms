# Composants et tokens partagés

Les prototypes utilisent `assets/prototype.css` pour les tokens de base et `assets/replication.css` pour les compositions de référence et leurs adaptations responsive. Aucun kit ou package supplémentaire n’est introduit.

## Composants réutilisables démontrés

| Composant de prototype | Écrans | Rôle |
|---|---|---|
| `StatusBadge` | WO list/details, mobile, planning, asset | État textuel avec fond/contraste distincts. |
| `PriorityMarker` / `PriorityBar` | Mobile dashboard, WO queue/detail, asset | Priorité visible sans dépendre uniquement de la couleur. |
| `WorkOrderCard` / `WorkOrderQueueRow` | `MOB-001/073`, `WEB-054` | Carte compacte mobile et ligne dense desktop, mêmes champs prioritaires. |
| `WorkOrderDrawer` / `FactGrid` | `WEB-055` | Détail contextualisé, statut, priorité, due date et lien à l’actif. |
| `TaskChecklist` / `ProgressBar` | `MOB-002/003`, WO drawer | Cibles cliquables, sous-texte/action attendue, progression. |
| `AssetIdentity` / `AssetTabs` | `WEB-062–069`, `MOB-030` | Identité et actions; navigation entre sous-vues. |
| `ThreeMetricStrip` / `AssetInfoPanel` | Fiche équipement | Trois indicateurs, puis panneaux opérationnels en deux colonnes. |
| `OccurrenceChip` / `UpcomingList` / `CallRegister` | `WEB-047/048` | Échéances calendrier et résultat d’appel visibles séparément. |
| `FormSection` / `OrderPreview` | `WEB-055`, `MOB-005` | Formulaire groupé et résumé de saisie. |
| `StateCard` | Toutes les vues | États chargement, vide, erreur, refus et succès. |
| `BottomTabs` | `MOB-001/073` | Navigation mobile persistante et actions primaires accessibles. |

## Tokens

La source de tokens est `assets/prototype.css`; cette surcouche les réutilise.

- Canvas gris clair et panneaux blancs pour séparer le contexte du travail.
- Encre bleu-graphite avec texte secondaire plus clair.
- Teal QPM pour les actions primaires et les états sélectionnés.
- Ambre pour priorité haute/prévision à venir; rouge pour critique/retard; vert pour terminé/succès.
- Typographie compacte, titres sans-serif, poids renforcé pour actifs et numéros WO.
- Rayons modérés (6–10 px) et élévation faible; tiroir/modal réservé aux actions contextuelles.
- Focus clavier visible et contrasté; informations d’état toujours écrites en texte.
- Cibles tactiles mobiles d’au moins 40–44 px, marges adaptées au pouce et au safe area bas.

## Comportements réutilisés

Les interactions sont centralisées dans `assets/prototype.js`: navigation de vues, état simulé, recherche, filtres, onglets asset/WO, checklist, formulaires de démonstration et messages de confirmation. Pour une implémentation ultérieure, cette séparation donne une base de composants/patterns; elle n’impose pas de réécriture des pages QPM existantes ni de changement de librairie.
