# Comparaison des écrans QPM et prototypes

Le comparatif visuel interactif est disponible dans [reference-comparison.html](reference-comparison.html). Les captures QPM locales sont côte à côte avec les prototypes concernés. Les pages Dribbble sont liées comme références de pattern; leurs images originales ne figurent pas dans le dépôt.

| Écran cible | Composition actuelle vérifiée | Composition du prototype | Résultat recherché |
|---|---|---|---|
| `MOB-001` Mobile Dashboard | La capture mobile disponible montre une fiche équipement, pas le dashboard. | En-tête poste/jour, résumé de charge, une intervention dominante et prochaines interventions, actions rapides et nav basse. | Priorité de la journée et prochaine action visibles immédiatement. |
| `WEB-062–069`, `MOB-030` Equipment Details | Capture locale: onglets entité, identité/actions, 3 KPI, panneaux d’information sur plusieurs rangées. Le mobile montre une densité/titre contraints. | Cette structure est reproduite: navigation horizontale, carte identité, 3 indicateurs puis paires de panneaux, empilement responsive. | Reprendre la composition éprouvée sans sacrifier la lecture mobile. |
| `WEB-047/048`, `WEB-043` Maintenance Schedule | Aucune capture de calendrier actuel dans les sources locales vues. | Grille mensuelle avec chips d’occurrences, colonne échéances et registre d’appels. | Lire les dates et distinguer « prévu » de « WO généré ». |
| `WEB-054` Work Order List | Pas de capture de la liste actuelle dans ce jeu local. | Segments de statut, recherche, file en lignes denses avec statut/priorité/échéance. | Triage plus rapide avant ouverture du détail. |
| `WEB-055` Work Order Details | Capture locale montre un tiroir sur la liste, boutons statut/temps, onglets et tâches. | Tiroir conserve cette structure; onglets détails/tâches/historique et progression. | Respect de la composition existante avec hiérarchie plus nette. |
| `MOB-002/003` Work Order Details/execution | Pas de capture de détail WO mobile dans le dossier utilisé. | Page mobile dédiée, résumé WO, faits en grille, checklist à grandes cibles, note et progression. | Exécution terrain utilisable sur petit écran. |
| `WEB-055`, `MOB-005` Create Work Order | Pas de capture de formulaire complète dans le dossier local. | Formulaire sectionné « travail / équipement / planification » et aperçu; mobile en pile simple. | Limiter la charge cognitive sans forcer un wizard. |

## Déviations de structure

- Le détail desktop reste un tiroir car la capture QPM montre ce pattern et il préserve le contexte de la liste.
- Sur mobile, le détail passe en plein écran; un tiroir étroit réduirait la largeur des contrôles et des tâches.
- La fiche équipement garde exactement trois tuiles KPI pour correspondre à la capture locale. Leur contenu est lié aux informations opérationnelles prioritaires plutôt qu’aux métriques potentiellement décoratives.
- Le tableau calendrier reste lisible sur mobile par simplification visuelle des événements en marqueurs; la liste détaillée en dessous reste accessible.
- Les contrôles utilisent un contraste renforcé et des cibles tactiles; les onglets défilent horizontalement au lieu d’être tronqués.

## Crédits / vérifiabilité

Les références externes et le mapping des patterns sont répertoriés dans [REFERENCE-PATTERN-MAPPING.md](REFERENCE-PATTERN-MAPPING.md). Les fichiers image Dribbble d’origine n’étaient pas fournis, il reste donc une étape de comparaison pixel/structure une fois ces captures disponibles.
