# Comparaison des écrans QPM et prototypes

Le comparatif visuel interactif est disponible dans [reference-comparison.html](reference-comparison.html). Les captures QPM locales sont côte à côte avec les prototypes concernés. Les pages Dribbble sont liées comme références de pattern; leurs images originales ne figurent pas dans le dépôt.

| Écran cible | Composition actuelle vérifiée | Composition du prototype | Résultat recherché |
|---|---|---|---|
| `MOB-001` Mobile Dashboard | La capture mobile disponible montre une fiche équipement, pas le dashboard. | En-tête poste/jour, résumé de charge, une intervention dominante et prochaines interventions, actions rapides et nav basse. L’outil de sélection des états est placé hors de l’écran simulé. | Priorité de la journée et prochaine action visibles immédiatement; le prototype reste lisible sur téléphone et les cibles tactiles sont dimensionnées pour le terrain. |
| `WEB-062–069`, `MOB-030` Equipment Details | Capture locale: onglets entité, identité/actions, 3 KPI, panneaux d’information sur plusieurs rangées. Le mobile montre une densité/titre contraints. | Cette structure est reproduite: navigation horizontale, carte identité, 3 indicateurs puis paires de panneaux, empilement responsive. | Reprendre la composition éprouvée sans sacrifier la lecture mobile. |
| `MOB-030` Mobile Equipment Details | La capture mobile locale montre une identité d’actif suivie de nombreuses cartes verticales et un titre tronqué. L’implémentation native actuelle utilise des onglets Détails, Ordres, Documents et Pièces. | Prototype natif simulé: identité et emplacement, trois indicateurs, onglets horizontaux alignés sur les sections mobiles actuelles, puis informations/compteur et ordres récents. | Garder l’identification d’actif visible, réduire les cartes isolées et atteindre les ordres/compteurs sans perdre le contexte. |
| `WEB-047/048`, `WEB-043` Maintenance Schedule | Aucune capture de calendrier actuel dans les sources locales vues. | Grille mensuelle avec chips d’occurrences, colonne échéances et registre d’appels. | Lire les dates et distinguer « prévu » de « WO généré ». |
| `WEB-054`, `MOB-073` Work Order List | Pas de capture de la liste actuelle dans ce jeu local. | File Web dense et liste mobile en cartes; la carte mobile met le titre, l’équipement, le statut, la priorité et l’échéance dans un ordre stable. | Triage plus rapide avant ouverture du détail, sans tableau horizontal sur téléphone. |
| `WEB-055` Work Order Details | Capture locale montre un tiroir sur la liste, boutons statut/temps, onglets et tâches. | Tiroir conserve cette structure; onglets détails/tâches/historique et progression. | Respect de la composition existante avec hiérarchie plus nette. |
| `MOB-002/003` Work Order Details/execution | Pas de capture de détail WO mobile dans le dossier utilisé. | Page mobile dédiée, résumé WO, faits en grille, checklist à grandes cibles, note et progression. La navigation garde « Mes ordres » sélectionné pendant le détail. | Exécution terrain utilisable sur petit écran, avec retour clair au contexte de la file. |
| `MOB-015/016` Mobile PM list/details | Écran natif: liste en lecture seule, puis détail avec calendrier/compteur, stratégie, registre d’appels et historique WO paginé. | Deux vues mobiles: badge de déclencheur et prochaine échéance dans la liste; détail compteur affiche lecture réelle, seuils distincts des WO et appels paginés en groupe lisible. | Le déclencheur et la base de calcul sont explicites; prévision, appel enregistré et WO restent des concepts distincts. |
| `WEB-055`, `MOB-005` Create Work Order | Pas de capture de formulaire complète dans le dossier local. | Formulaire sectionné « travail / équipement / planification » et aperçu; mobile en pile simple. | Limiter la charge cognitive sans forcer un wizard. |
| `MOB-030` → `MOB-005` Asset-to-Work-Order | Le parcours de création depuis une fiche équipement n’a pas été confirmé visuellement dans les captures locales. | Le bouton d’action de la fiche ouvre la création mobile et préremplit l’équipement via session locale. | Réduire les saisies répétées tout en gardant le comportement explicitement simulé et sans persistance serveur. |

## Déviations de structure

- Le détail desktop reste un tiroir car la capture QPM montre ce pattern et il préserve le contexte de la liste.
- Sur mobile, le détail passe en plein écran; un tiroir étroit réduirait la largeur des contrôles et des tâches.
- La fiche équipement garde exactement trois tuiles KPI pour correspondre à la capture locale. Leur contenu est lié aux informations opérationnelles prioritaires plutôt qu’aux métriques potentiellement décoratives.
- Le tableau calendrier reste lisible sur mobile par simplification visuelle des événements en marqueurs; la liste détaillée en dessous reste accessible.
- Les contrôles utilisent un contraste renforcé et des cibles tactiles; les onglets défilent horizontalement au lieu d’être tronqués.

## Crédits / vérifiabilité

Les références externes et le mapping des patterns sont répertoriés dans [REFERENCE-PATTERN-MAPPING.md](REFERENCE-PATTERN-MAPPING.md). Les fichiers image Dribbble d’origine n’étaient pas fournis, il reste donc une étape de comparaison pixel/structure une fois ces captures disponibles.
