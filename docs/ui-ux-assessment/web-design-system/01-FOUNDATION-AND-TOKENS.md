# QPM Web prototype — fondation et tokens proposés

**État :** proposition de prototype, non approuvée pour la production. **Date :** 14 octobre 2026.

## Sources d’autorité

- `docs/design.md` : identité configurable/provisoire, conception fondée sur les tâches, ne pas imposer une marque unique aux entreprises.
- `mobile/theme/tokens.ts` : palette d’authentification actuellement utilisée par la fondation mobile. Bleu clair `#4B5FE8`, bleu sombre `#AAB5FF`, surfaces/textes/states sémantiques clair/sombre.
- `docs/ui-ux-assessment/theme-harmonization/02-AUTHENTICATION-IDENTITY-AUDIT.md` : audit de la référence auth, contraste mesuré 5,12:1 pour `#4B5FE8` sur blanc.
- `frontend/src/theme/schemes/PureLightTheme.ts` : ancien primaire Web `#5569FF`; `GreyGooseTheme.ts` et `PurpleFlowTheme.ts` introduisent d’autres identités primaires; les trois thèmes de production sont `light` selon `docs/WEB-UI-SECURITY-AUDIT-2026-10-14.md`.
- `mobile/screens/auth/AuthenticationScreen.tsx` : composition authentification mobile fonctionnelle observée dans le code; l’authentification Web actuelle est la carte MUI centrée `frontend/src/content/pages/Auth/Login/Cover/index.tsx`.

La couleur `#4B5FE8` est adoptée **comme référence de marque QPM du prototype** d’après l’authentification mobile approuvée. Cela ne modifie pas le thème Web en production et ne présume pas que toutes les entreprises partagent leur logo/couleur d’accent.

## Tokens prototype

Les valeurs implémentées dans `prototypes/qpm-web-ui/src/tokens.js` sont un mapping Web de `mobile/theme/tokens.ts`, à revoir lors de la validation.

| Rôle | Clair | Sombre | Usage |
|---|---|---|---|
| Brand action | `#4B5FE8` | `#AAB5FF` | Action principale, focus/selection; aucune sémantique métier. |
| Texte sur brand | `#FFFFFF` | `#172044` | Libellé du bouton principal. |
| Canvas | `#F7F8FC` | `#0D1220` | Arrière-plan d’application. |
| Surface | `#FFFFFF` | `#151D2E` | Navigation, panneaux et cartes. |
| Surface élevée | `#F6F7FF` | `#1C263A` | Contrôles secondaires/zone douce. |
| Texte principal | `#202943` | `#F1F4FC` | Titres, données opérationnelles. |
| Texte secondaire | `#5E687E` | `#B5C0D4` | Métadonnées et aide. |
| Bordure | `#D7DDEE` | `#35415A` | Séparation et contours. |
| Success / Warning / Error / Info | `#237A32 / #8A5700 / #C6283D / #1675A8` | `#77D18A / #FFC66D / #FF8292 / #71C9F2` | Sens stable selon `mobile/theme/tokens.ts`, avec conteneurs assortis dans le prototype. |

## Échelle proposée

- Typographie : Inter si disponible, sinon Segoe UI/system; titre de page 29 px, sections 20 px, corps 13–14 px, métadonnées 10–11 px. Les identifiants et nombres utilisent des chiffres tabulaires lorsque le style de plateforme le permet.
- Espacement : grille 4 px; pas usuels 8/12/16/24/32 px.
- Rayon : 10–12 px pour contrôles, 14–16 px cartes, 8 px badges.
- Élévation : priorité à la bordure et à l’espacement; pas d’ombre décorative sur chaque carte.
- Densité : dense pour tables planificateur desktop; les champs sont lisibles et les cibles d’action atteignent 40–44 px au prototype (à confirmer visuellement et au clavier).
- Responsive : 1440 px desktop, 1024 px tablette/petit laptop, 768 px tablette étroite, 390/375 px Web mobile. Sidebar persistante au large; navigation en tiroir en compact.
- Appearance : clair/sombre bascule immédiatement dans le workspace. « Système » suit `prefers-color-scheme` du navigateur sans rechargement dans le prototype. C’est un essai de rendu uniquement; la production Web n’a pas aujourd’hui les modes sombre/système et aucune préférence n’est persistée/synchronisée.
- Personnalisation : l’apparence est un choix personnel local au prototype. Identité, logo, accent et sémantique métier de l’entreprise sont une configuration d’entreprise séparée et non éditable depuis cette préférence.

## Garde-fous sémantiques

Priorité et état du cycle de vie sont des attributs séparés. Un libellé accompagne toujours la couleur. « En retard », « terminé », « en attente » et « urgent » utilisent des tons distincts des actions de marque. Aucune valeur de KPI affichée dans cette maquette n’est calculée à partir de la base; les exemples sont des données fictives et la fiabilité non disponible est explicitement indiquée.

## Éléments à valider avant tout portage production

Contraste calculé par paire sur le rendu Web final (incluant les badges et états focus), préférences `system` lors du premier paint, persistance et priorité entre personnalisation utilisateur et configuration entreprise, logo multi-tenant, traduction longue FR/EN, zoom navigateur à 200 %, clavier/tablette, permissions réelles et revue par rôle. Aucune de ces propriétés n’est certifiée par le seul prototype.
