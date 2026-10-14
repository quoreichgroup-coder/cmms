# Reprise de la revue d’harmonisation — 12 octobre 2026

## Résultat

La reprise n’a pas mis en évidence de dérive des couleurs de statut ni de mélange des palettes clair/sombre dans les principaux branchements Paper et React Navigation inspectés. Elle a toutefois révélé un défaut TypeScript dans le nouveau raccordement des couleurs Paper : le helper acceptait uniquement le type littéral de la palette claire. Le thème sombre ne compilait donc pas. Le helper accepte désormais les deux palettes; `npx tsc --noEmit` passe.

La revue confirme que les contours fonctionnels Paper (`outline`) utilisent `controlOutline`, tandis que les contours décoratifs (`outlineVariant`) gardent le token discret `borderSubtle`. Ce partage s’applique aux champs Paper, à la signature, à l’éditeur de commentaires, à l’authentification et à la bordure React Navigation selon leur rôle. Les tests vérifient le raccordement et le contraste >= 3:1 des contours de contrôle sur les surfaces couvertes.

## Périmètre contrôlé

- Tokens sémantiques clair/sombre et adaptation du thème Material Paper.
- Hydratation de la préférence Light/Dark/System, mise à jour à chaud et sérialisation des écritures locales.
- Couleurs de Navigation, écrans d’authentification, réglages Apparence, statut et priorité.
- Occurrences de couleurs littérales dans les écrans et composants partagés, en distinguant couleurs d’interface, superpositions sur média, ombres et ressources natives.

## Limites qui restent ouvertes

| Domaine | État | Vérification nécessaire |
|---|---|---|
| Rendu Android/iOS | Non certifié par les tests du dépôt. | Installer la build et vérifier les écrans en clair/sombre, tailles 360/375/430 dp et tablette. |
| Couches natives et tierces | Splash, barre de navigation système, clavier, ActionSheet, date picker, caméra et signature dépendent du rendu appareil. | Tester lancement à froid, changement de thème à chaud et formulaires avec clavier ouvert. Les PNG de splash ont un fond blanc opaque; le splash sombre requiert des assets adaptés. |
| Lecteurs d’écran | Pas de preuve VoiceOver/TalkBack dans cette revue. | Vérifier labels, focus, annonces d’erreur/succès et ordre de lecture. |
| Contraste exhaustif | Les tests valident des paires sémantiques et surfaces déclarées, pas chaque écran et état focus/disabled. | Auditer les combinaisons visibles; réserver `textDisabled` aux éléments réellement désactivés. |
| Parité Web/Mobile | Les tokens audités appartiennent au dossier `mobile/`. | La cohérence du frontend Web relève d’une tranche séparée. |
| Personnalisation | Light/Dark/System est disponible; un accent choisi par l’utilisateur n’est pas implémenté. | Ne pas le considérer comme livré; décider séparément s’il est requis. |
| Couleurs littérales | Plusieurs occurrences restent présentes pour transparences photo, caméra, vague Auth, ombres, icône et splash. | Elles sont contextuelles dans les usages repérés; le CSV reste un instantané manuel, pas une preuve automatique d’absence d’autres occurrences. |

## Validations

- `npm run test:mobile-regression` : 7 suites réussies.
- `npx tsc --noEmit` : réussi après correction du type de palette clair/sombre.
- `git diff --check` : réussi après la mise à jour de ce rapport.
- La vérification Prettier des fichiers TypeScript ciblés passe; trois rapports Markdown plus anciens ne respectent pas la mise en forme Prettier actuelle. Ils n’ont pas été reformatés globalement pendant cet audit.

Cette passe contrôle la cohérence UI/thème du code mobile et ne constitue ni un audit de sécurité applicative ni une certification d’accessibilité complète.

## Correctif UI/UX complémentaire — feuilles natives

La suite de la revue a inspecté le comportement du fournisseur `react-native-actions-sheet` installé dans le dépôt. Son conteneur prend `white` par défaut quand aucun `containerStyle.backgroundColor` n’est fourni. Quatre feuilles actives avaient des textes thémés, mais laissaient ce fond par défaut : menus contextuels, création rapide, liste déroulante et quantités de pièces. En sombre, ce défaut produisait des panneaux blancs.

Les quatre conteneurs utilisent maintenant la surface Paper courante par un helper partagé. Test ajouté pour les fonds Light/Dark. `npm run test:mobile-regression` (7 suites), `npx tsc --noEmit`, Prettier ciblé, `git diff --check` et l’export Expo Web réussissent. L’inspection visuelle des feuilles sur Android/iOS reste ouverte.

## Reconciliation du splash sombre — 13 octobre 2026

Le constat historique ci-dessus sur le splash statique n’est plus exact pour l’état courant du worktree. L’inspection des sources montre `userInterfaceStyle: automatic` et `splash.dark` dans `mobile/app.config.ts`; Android fournit `values-night/colors.xml` et les PNG transparents `drawable-night-*`; iOS déclare une palette de luminosité sombre et des fichiers `image-dark*` dans `SplashScreenLogo.imageset`. Le PNG sombre a des pixels de coin transparents, contrairement à la variante claire, évitant ainsi le carré clair opaque sur le fond sombre. `aapt dump configurations` sur l’APK release confirme les qualifications `night`, `night-v33` et `night-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}`; l’APK inclut les deux couleurs de splash. Ces preuves confirment les ressources déclarées/embarquées, mais le lancement à froid en clair/sombre doit toujours être vérifié sur Android et iOS réels.
