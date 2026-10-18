# Revue du prototype interactif Web

## Workspace isolé

Chemin : `prototypes/qpm-web-ui/`. Il a son propre `package.json`, sa page et son point d’entrée; il ne fait pas partie des répertoires de production `frontend/src` ou `api`. Pour la validation locale, son `node_modules` est un symlink non versionné vers `frontend/node_modules`, afin de réutiliser React 17/MUI 5/Emotion existants sans installation ni mise à niveau. Les données du prototype sont déclarées dans `src/App.js`. Il n’importe aucun service API, store Redux, contexte d’authentification ou client d’accès.

## Six prototypes et écrans source

| Prototype | IDs inventaire | Route/composant de production existants | Parcours démo |
|---|---|---|---|
| Dashboard opérationnel | WEB-005 | Dashboard dans `frontend/src/content/own/Dashboard/` (le point d’entrée exact est à vérifier sur route; données live absentes du prototype) | KPI → file urgente → détail WO; demandes; planning fictif. |
| Liste Work Orders | WEB-054 | `/app/work-orders`, `frontend/src/content/own/WorkOrders/index.tsx` | recherche, filtre statut, reset, clavier Entrée sur ligne, panneau vide, ouverture détail, dialogue local. |
| Détail Work Order | WEB-055 | `/app/work-orders/:workOrderId`, composant partagé `WorkOrders/index.tsx` et détail sous `WorkOrders/Details/` | sections par onglets, information équipement, progression exemple, dialogue non-mutant et chemin vers actif. Aucun statut n’est modifié. |
| Demandes | WEB-045/046 | `/app/requests`, `/app/requests/:requestId`, `frontend/src/content/own/Requests/index.tsx` | file triage, états et priorité; boutons ouvrent une confirmation simulée. Pas de conversion ou d’approbation réelle. |
| Equipment 360 | WEB-062 à WEB-069 | `/app/assets/:assetId/{overview,work-orders,details,parts,files,meters,downtimes,analytics}`, `frontend/src/content/own/Assets/Show/index.tsx` | identifiant, hiérarchie, champs, ordres liés, onglets; champs/KPI sans preuve sont marqués fictifs/indisponibles. |
| Appearance Settings | écran de proposition, pas une route production | `frontend/src/theme/ThemeProvider.tsx`, identité auth mobile `mobile/theme/tokens.ts` | Clair/sombre immédiat; Système suit le média navigateur `prefers-color-scheme`; séparation marque entreprise/apparence personnelle. |

Une galerie composant additionnelle est joignable via le lien de pied de page et montre badges, feedback, formulaires, densité et états asynchrones.

## Navigation raffinée après revue — 14 octobre 2026

- La direction demandée est une évolution modérée : conserver les destinations, les vues, le shell React/MUI et leurs interactions de démonstration, en affinant l’identité et la hiérarchie de navigation.
- La sidebar affiche maintenant « Maintenance industrielle » sous le logo QPM, regroupe le tableau de bord, les demandes, les ordres et les équipements sous « Maintenance », et déplace « Apparence » dans une section « Préférences ». Les labels Dashboard et Requests sont clarifiés en « Tableau de bord » et « Demandes de maintenance ».
- Les références d’inventaire WEB-xxx restent associées aux entrées dans le code pour l’évaluation, mais ne sont plus montrées comme du contenu produit. Les boutons de navigation annoncent l’élément courant via `aria-current`.
- Aucun ID de route interne, destination, API ou règle de permission ne change. La vue Apparence reste une démonstration locale, pas un paramètre de profil persisté.
- Build optimisé du prototype après cette évolution : `npm run build` réussi le 14 octobre 2026 (JS 141,26 kB gzip; CSS 5,47 kB gzip). L’aperçu existant doit être actualisé de force dans le navigateur. Les screenshots de bureau/tablette/mobile et le rendu navigateur réel restent à valider; le processus Chromium de cet environnement est bloqué.

## Référence → proposition

| Composition observée dans la production par lecture de code | Direction prototype |
|---|---|
| Login Web : `Login/Cover/index.tsx`, carte centrée et formulaire MUI; elle n’est pas le nouveau shell métier | Shell opérationnel séparé; la palette de la vraie authentification mobile est réutilisée, pas sa composition de formulaire. |
| Trois palettes Web claires et une configuration couleur personnalisée seulement appliquée au thème PureLight | Une palette QPM sémantique claire/sombre en bac d’essai; accent société présenté comme config distincte. |
| Tables et listes développées selon modules (`CustomDatagrid2`, `TableCustomized`, DataGrid/TanStack) | Une seule composition visuelle de table avec filtres, statut/priorité, assignee et échéance; comportement/pagination réel non simulé. |
| Shell existant `ExtendedSidebarLayout` responsive | Sidebar visible en grand écran, navigation tiroir sous 760 px, mêmes destinations/IDs d’ancrage au pilote. |
| Écrans détaillés riches et routes imbriquées | Hiérarchie identifiant/titre/action, données prioritaires d’abord, onglets locaux pour sections de dossier. |

Comparaison limitée au code/source pour l’état actuel : aucune capture Web de compte authentifié n’est dans les pièces disponibles. Les captures du prototype ne doivent donc pas être étiquetées comme une comparaison pixel-to-pixel. Avant toute approbation, prendre une vraie capture de chaque écran courant à données/comptes de test égaux.

## Interactions et limites des états

- Interactions locales : recherche dans les exemples, filtre état, reset, navigation, onglets, toggle d’apparence, dialogues d’essai et Toast de succès nommé « démonstration uniquement ».
- Couverture d’état illustrative dans la galerie : success, warning, error/retry, info/access boundary, spinner et empty. Ces contrôles ne simulent pas l’intégration réseau, le droit courant, la licence ou un serveur de permission.
- Il n’existe aucun mock login, auth, assignation persistée, transition de statut, mutation DB, export réel, appel HTTP ou contrôle d’autorisation dans cet espace.
- Responsive : CSS fournit disposition bureau/tablette et transformation de la liste en rangées/cartes mobiles. Le build optimisé a été vérifié le 14 octobre 2026; le rendu dans un vrai navigateur et les captures aux différents viewports restent à faire avant validation visuelle. Le Chromium Snap disponible est bloqué par `snap-confine`/AppArmor et le runner Chrome DevTools n’a pas d’exécutable Chrome configuré.

## Correctifs de prototype relevés pendant la validation

- Les actions de la vue Equipment 360 référençaient `setDialog` sans recevoir cette fonction. Elle est maintenant transmise depuis l’état local de l’App; les dialogues restent simulés et n’appellent aucun service.
- Les KPI cliquables sont rendus comme boutons natifs pour le clavier et reçoivent un nom accessible. Les rangées WO répondent à Entrée et Espace.
- `npm run build` : succès avec les dépendances React 17/MUI 5 déjà présentes. Vérification visuelle par navigateur et navigation lecteur d’écran : non exécutées ici.
- Aucune capture Web authentifiée de l’interface production n’est disponible; ne pas présenter de maquette comme une comparaison avant/après de pixels. La comparaison de référence reste basée sur le code et les compositions décrites ci-dessus.

## Comment lancer

Depuis le dépôt après création du lien `node_modules` non versionné :

```bash
cd prototypes/qpm-web-ui
npm start
```

Le lien réutilise localement `frontend/node_modules`; aucun package n’est téléchargé par cette configuration.
