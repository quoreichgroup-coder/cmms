# Matrice de réutilisation Web

Les noms ci-dessous sont des recettes proposées dans un bac isolé; la matrice n’affirme pas que tous ces composants existent déjà sous ces noms.

| Recette / pattern | Prototype | Source QPM à préserver/inspecter | Décision |
|---|---|---|---|
| AppShell, sidebar, en-tête | `prototypes/qpm-web-ui/src/App.js` | `frontend/src/layouts/ExtendedSidebarLayout/`, `frontend/src/layouts/SidebarLayout/`, `frontend/src/layouts/Header/`, `frontend/src/router/app.tsx` | Raffiner le shell existant; pas de remplacement par une autre architecture. Groupes Work/Assets/Appearance servent au test de hiérarchie. |
| PageHeader, contexte et retour | `PageIntro` | `frontend/src/components/PageHeaderDocs/`, en-têtes des modules | Consolider hiérarchie/breadcrumb; conserver les routes et retour historique. |
| BentoKpiCard | `KpiCard` | Dashboard existant et modules analytics sous `frontend/src/content/own/` | Réutiliser les valeurs/actions déjà disponibles; retirer toute décoration sans action. KPI prototype fictifs seulement. |
| WorkOrderDataTable | `.data-table` et `WorkOrders` | `frontend/src/content/own/WorkOrders/`, `CustomDatagrid2`, `TableCustomized`, MUI X DataGrid/TanStack usages | Définir une recette commune après comparaison du tri, filtre, page, sélection clavier et états; garder la logique existante. |
| FilterToolbar | barre recherche/statut/filtre | Formulaires de filtre WO, Requests et composants de listes | Garder critères et query params inchangés; design uniquement. |
| StatusBadge / PriorityBadge | `StateBadge` | mapping domaine actuel (`frontend/src/utils/overall.ts` et helpers des modules à confirmer au portage) | Partager la forme, garder mapping et libellés métier existants; status ≠ priorité. |
| DetailPageHeader | `PageIntro` + `.detail-summary` | `frontend/src/content/own/WorkOrders/Details/` | Réutiliser les actions permises et statuts issus du serveur; aucun changement de transition. |
| AssetProfileCard | `.asset-hero`, `Info` | `frontend/src/content/own/Assets/Show/` | Garder l’identité, le site, la hiérarchie et les champs effectivement disponibles. |
| FormSection | recette gallery | Formik/Yup, contrôles MUI et formulaires sous `frontend/src/content/own/` | Garder validation, noms et payload; structurer visuellement. |
| DetailDrawer | non implémenté (option suivante) | drawers/détails actuels Requests et Work Orders | Prototyper un panneau triage uniquement après validation de route/back button/contexte conservé. |
| ConfirmDialog | dialogue global de démo uniquement | dialogues/confirmations existants dans chaque module | Réutiliser API de confirmation existante; pas modifier les règles ou exigences de fermeture WO. |
| ActivityTimeline | aperçu section du WO/Asset | historiques et journaux associés aux vues de détail | Unifier présentation seulement si provenance/date/acteur gardés; pas de fausse activité. |
| CalendarSelector | aperçu de charge Dashboard | composants FullCalendar dans le frontend | Garder mécanisme d’événement et données; le panneau calendrier de la maquette est factice. |
| Empty/Error/Loading/Denied | Component Gallery | `frontend/src/components/` et états locaux des écrans | Consolider les présentations sans confondre vide, refus, panne et chargement; conserver retry réel. |
| AppearanceSettings | vue Prototype Appearance | `frontend/src/theme/ThemeProvider.tsx`, `ThemeSettings` | Isolé de la production; tout portage requiert une décision sur préférence system et entreprise. |

## Patterns TPT → MUI/React existant

| Principe de composition observé | MUI/React QPM |
|---|---|
| Petits composants composables plutôt qu’écrans monolithiques | Composants React, `Paper`, `Stack`, `Box`, `Typography`, hooks locaux existants. |
| Tokens de style explicites | extension/mapping des thèmes MUI (`createTheme`, `ThemeProvider`, Emotion), sans Tailwind. |
| Tables adaptées au métier | MUI X DataGrid ou recette HTML/MUI actuelle; ne pas changer la source de vérité de tri/pagination. |
| Variantes sémantiques | `Chip`/`Alert` utilisant les mapping métier et tokens sémantiques. |
| Composition de shell/navigation | React Router, layouts QPM et Drawer responsive existants. |
| Icônes cohérentes | `@mui/icons-material` déjà installé; aucune dépendance Lucide requise. |

Pas de dépendance shadcn, Base UI, Tailwind, Next.js ou nouvelle bibliothèque n’est introduite.
