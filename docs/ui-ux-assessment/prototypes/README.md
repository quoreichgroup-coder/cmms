# QPM — prototypes à partir des patterns de référence

Ces prototypes HTML/CSS/JavaScript sont isolés de l’application. Ils couvrent six écrans prioritaires en quatre parcours interactifs, et utilisent des exemples fictifs.

## Lancer la revue

Depuis la racine du dépôt :

```bash
python3 -m http.server 4173 --directory docs/ui-ux-assessment/prototypes
```

Ouvrir `http://localhost:4173/`. Aucun package, serveur QPM, compte ou accès réseau n’est requis.

## Parcours

- `mobile-technician.html` — accueil `MOB-001`, ordres assignés, détail/exécution `MOB-002/003` et création `MOB-005`.
- `asset-360.html` — fiche `WEB-062–069` et détails mobile `MOB-030`.
- `maintenance-schedule.html` — planning `WEB-047/048` et compteurs `WEB-043`.
- `web-operations.html` — supervision à trois piliers, liste `WEB-054`, détail WO `WEB-055` en tiroir, formulaire de création.
- `reference-comparison.html` — comparaisons QPM capture/prototype et liens de référence externe.

Dans les vues principales, le sélecteur « État visuel » affiche chargement, vide, erreur, accès refusé et succès. Les clics, filtres, onglets, tâches et soumissions sont locaux. Le tiroir WO s’ouvre en sélectionnant une WO depuis la vue de supervision ou la file.

## Fidélité et limites des sources

Les images présentes dans `docs/validation-pilote/2026-10-03/` sont les captures QPM utilisées pour reproduire la fiche équipement et le détail WO. Le dépôt ne contient pas les captures Dribbble originales mentionnées dans les recherches, ni de capture du dashboard mobile actuel. Les pages externes sont donc citées et leurs patterns publiés sont adaptés; aucune capture ou contenu propriétaire n’est remplacé par une image fictive. Le degré exact de ressemblance avec une image Dribbble non fournie reste à valider une fois son fichier disponible.

Voir [la cartographie référence → pattern → écran](REFERENCE-PATTERN-MAPPING.md), [les composants/tokens](COMPONENTS-AND-TOKENS.md), [la comparaison écran par écran](SCREEN-COMPARISON.md), [la checklist d’évaluation](USABILITY-CHECKLIST.md) et [l’impact d’implémentation](IMPLEMENTATION-IMPACT.md).

## Limites techniques

- Aucun appel à l’API QPM, aucune donnée persistée et aucune authentification réelle.
- Les noms, dates, horaires, tâches, indicateurs, équipements et compteurs sont de démonstration.
- Les états de permission sont illustratifs et ne testent pas les rôles réels.
- Les prototypes n’imitent pas les gestes natifs iOS/Android ni le rendu de l’application Expo.
- Ils ne modifient aucune source de production et ne prouvent pas que les contrats backend supportent une évolution de formulaire.
