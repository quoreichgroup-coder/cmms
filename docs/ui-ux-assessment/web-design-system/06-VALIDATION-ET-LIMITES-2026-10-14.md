# Validation et limites — prototype Web QPM

**Date :** 14 octobre 2026  
**Périmètre :** revue de conception Web et vérification de compilation du prototype isolé. Aucun fichier source de production, comportement d’API, contrat, permission, règle métier ou schéma de données n’a été modifié.

## Références relues

- `docs/design.md` — politique de recherche, audit, accessibilité et mise en œuvre progressive.
- `docs/WEB-UI-SECURITY-AUDIT-2026-10-14.md` — audit sécurité/RBAC et état visuel Web.
- `docs/WEB-UI-REDESIGN-BACKLOG.md` — dépendances et ordre de traitement proposé.
- `docs/ui-ux-assessment/screen-inventory.json` — destinations déclarées et composants source.
- Thèmes Web `frontend/src/theme/` et connexion Web `frontend/src/content/pages/Auth/Login/Cover/index.tsx`.
- Référence d’authentification mobile `mobile/theme/tokens.ts` et `mobile/screens/auth/AuthenticationScreen.tsx`.
- Matrice de composants, fondation, revue du prototype, cohérence Web/Mobile et protocole d’accessibilité dans ce dossier.

## Faits revalidés dans le code

- Le client Web reste React 17.0.2, TypeScript 4.7.3, MUI 5.8.2, Emotion 11.9, Redux Toolkit 1.8.2, React Router 6.3, Formik 2.2 et Yup 0.32; cette revue n’ajoute ni ne met à jour de dépendance.
- L’inventaire contient 106 destinations Web déclarées. Ce chiffre compte les routes, y compris les destinations publiques, OAuth, erreur et certains chemins partagés; il ne représente pas 106 écrans métier uniques. Les redirections et déclarations commentées sont séparées dans l’inventaire.
- Les trois thèmes de production exposent `palette.mode: 'light'`. Le thème utilisateur est stocké sous `localStorage.appTheme`; le shell ne monte pas actuellement le sélecteur `ThemeSettings`, et `themeCreator()` ne prévoit pas de valeur de repli pour une préférence inconnue.
- La couleur principale du thème Web historique varie (`#5569ff`, `#2442AF`, `#9b52e1`). La référence QPM mobile approuvée utilise `#4B5FE8` en clair et `#AAB5FF` en sombre. Ces valeurs ne sont proposées que pour le prototype, pas appliquées au client Web de production.
- La route `/app` vérifie l’authentification côté interface. Les permissions d’action restent contrôlées par les composants et, de façon faisant autorité, par l’API; une garde de route React n’est pas une frontière de sécurité.
- Le défaut P0 de suppression de clé API cross-tenant indiqué dans l’audit reste une dépendance de sécurité backend non résolue dans ce travail. Il faut le corriger et le tester séparément avant d’exposer davantage les actions d’administration. Aucun essai inter-tenant contre une instance déployée n’a été réalisé.

## Prototype et vérifications

- Workspace : `prototypes/qpm-web-ui/`, séparé de `frontend/src` et `api`.
- Les six vues prévues existent : tableau de bord, liste WO, détail WO, demandes, Equipment 360 et apparence. Les interactions sont locales/simulées; les données sont fictives; aucun client HTTP, service API, store Redux ou contexte d’authentification de production n’est importé.
- Les modes clair/sombre et le mode système sont une démonstration locale du prototype. Ils ne persistent pas une préférence QPM et ne prouvent pas qu’un thème sombre existe en production.
- Vérification exécutée depuis `prototypes/qpm-web-ui/` : `CI=1 npm run build` — **réussie**, compilation optimisée CRA terminée.
- Le prototype liste les états de chargement, vide, erreur, accès refusé et succès dans la galerie de composants. Ils sont illustratifs et ne valident pas les réponses ni les messages réels de l’API.
- Le tableau WO garde une largeur minimale avec défilement horizontal sur viewport étroit. Avant portage, comparer cela à une vue mobile en cartes et vérifier l’accès clavier aux colonnes.

## Vérifications en attente

- Capture et inspection visuelle réelle des six vues à 1440 px, 1024 px, 768 px et 390 px, en clair et en sombre. L’essai headless a échoué car Chromium Snap refuse de démarrer dans cet environnement confiné; le serveur HTTP local de prévisualisation n’est pas autorisé. Aucune capture visuelle n’est donc déclarée comme preuve.
- Navigation clavier complète, focus des dialogues, contraste mesuré sur les états et reflow à 200 % de zoom : non vérifiés sur rendu.
- Validation par comptes réels des rôles/droits, des URLs directes, des refus API et des parcours avec erreurs réseau : non vérifiée.
- Validation de données de production, de temps de réponse, des volumes de tableaux et des écarts entre tenants/sites : non effectuée.

## Suite recommandée

1. Revoir visuellement le workspace isolé avec un navigateur local hors Snap/une prévisualisation autorisée, puis valider les six vues, les deux thèmes et les quatre tailles.
2. Faire approuver les tokens (en gardant la marque d’entreprise séparée de la préférence d’apparence) et la composition du shell avant toute intégration dans `frontend/src`.
3. Traiter SEC-WEB-01 dans un changement backend séparé avec tests négatifs cross-tenant; l’UI doit préserver les permissions/API existantes durant le chantier visuel.
4. Piloter le portage visuel sur WEB-054/WEB-055 et WEB-045/WEB-046 après validation des parcours et états avec des comptes de rôle. N’ajouter ni action ni transition WO dans ce lot.

**Conclusion :** le prototype compile et respecte la séparation des responsabilités, mais il attend la revue visuelle rendue et les tests par rôle avant approbation. La compatibilité API n’est pas altérée par ce prototype et aucune preuve de fonctionnement API n’est revendiquée.

## Vérification complémentaire du workspace isolé

Le 14 octobre, `npm run build` a réussi après correction d’une interaction cassée sur Equipment 360 (transmission de `setDialog`) et amélioration de l’accès clavier aux KPI et rangées WO. Le scan des imports du prototype ne trouve ni client HTTP, ni store, ni contexte d’authentification; les valeurs et confirmations restent locales. `frontend/src` et `api/src` n’ont pas été modifiés par ce lot.

La prise de captures réelles a été bloquée dans cet environnement : Chromium Snap refuse de démarrer car l’isolation AppArmor/snap-confine est indisponible, et le runner Chrome DevTools ne trouve pas de binaire Chrome stable. Les captures desktop/tablette/mobile, l’inspection visuelle effective et le contraste calculé sur le rendu restent donc requis. Aucun screenshot avant de l’application Web authentifiée n’est disponible; une comparaison pixel à pixel serait trompeuse.
