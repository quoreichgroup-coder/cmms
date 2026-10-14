# Relecture de l’harmonisation QPM Mobile — 12 octobre 2026

## Résultat

La fondation Light/Dark/System est bien branchée au runtime : `AppearanceProvider` fournit le thème Paper, `NavigationContainer` dérive ses couleurs du même thème, l’authentification lit ces tokens et l’écran Réglages expose les trois préférences. La préférence est lue avant le montage de l’application et ses écritures sont sérialisées. Les tests de contraste et de persistance présents passent. Cette vérification de dépôt ne suffit cependant pas à certifier le rendu sur Android/iOS ni la couverture visuelle de toutes les destinations.

Le contrôle automatisé de contraste couvre maintenant les textes sémantiques sur cinq surfaces QPM et les contours de contrôles sur ces mêmes surfaces, en modes clair et sombre. Le texte principal/secondaire respecte 4,5:1; le texte désactivé et les contours respectent 3:1. Ces assertions valident les tokens, mais pas chaque association réellement rendue par les composants ni les états natifs.

Une fuite claire/sombre a été trouvée dans la zone de sécurité racine : `components/RootLayout.tsx` ne peignait pas le fond de la zone basse avec le thème actif. Elle est maintenant liée à `theme.colors.background`. L’autre changement réalisé pendant ce lot verrouille la sauvegarde des notes de tâche contre un double toucher et empêche l’édition pendant l’envoi; il conserve la mutation existante.

Le suivi du Dashboard a également protégé les chargements concurrents des compteurs : lors d’un rafraîchissement ou d’un changement rapide de filtre, les anciennes réponses et erreurs ne peuvent plus remplacer l’état demandé en dernier. Les six compteurs gardent leur endpoint et leurs filtres existants. La grille de compteurs et la carte de filtre utilisent maintenant le token QPM `radius.cardLarge` (20 dp) pour des cartes clairement arrondies; le hero et son action gardent leurs tokens de rayon dédiés. L’export Expo Web et le build APK Android doivent être reréalisés après cette dernière évolution. La recette sur appareil demeure ouverte.

## Constats de la relecture

| Niveau | Statut | Preuve | Conséquence / suite |
|---|---|---|---|
| Élevé | Corrigé dans ce lot | `mobile/components/RootLayout.tsx` rendait un `SafeAreaView` sans fond explicite. | La zone système basse suit maintenant le fond du thème; confirmer son rendu sur appareil avec la barre de navigation gestuelle Android et l’indicateur iOS. |
| Élevé | Ressources corrigées, validation appareil ouverte | `mobile/app.config.ts` définit maintenant des variantes de splash clair/sombre. Les ressources natives iOS et les drawables Android de toutes les densités utilisent le logo convoyeur QPM, et Android choisit un fond/logo sombre via les ressources `night`. | L’ancien monogramme A a été remplacé dans les assets de lancement natifs. Confirmer après installation que le système sélectionne bien les variantes avec une préférence sombre et que l’icône affichée correspond au thème système. |
| Moyen | Écart de centralisation | `mobile/custom-theme.ts` conservait des couleurs littérales pour `secondary`, `onSecondary`, `primaryAlt` et `tertiaryContainer`, alors que la spécification annonce une source de tokens dans `theme/tokens.ts`. De plus, `secondaryContainer` était hérité du thème Material par défaut et apparaît dans les statistiques et le menu Plus. | Corrigé : ces couleurs actives et `secondaryContainer` utilisent maintenant les tokens sémantiques et leurs associations de contraste sont testées. Les couleurs de compatibilité `white`/`black` sont elles aussi dérivées des tokens. |
| Moyen | Couverture automatisée partielle | `mobile/scripts/appearance.test.cjs` vérifie maintenant les textes sémantiques sur les cinq surfaces QPM, les contours de contrôles et les principaux états. Il ne parcourt pas toutes les paires exposées par les composants, les overlays ni toutes les couleurs de thème Paper. | Le résultat AA des tokens testés ne prouve pas que chaque combinaison écran/état atteint AA. Maintenir la recette visuelle appareil et étendre les tests aux autres paires réellement utilisées. |
| Moyen | Couverture d’écran documentaire obsolète | `06-SCREEN-FAMILY-MATRIX.md` et `screen-inventory.json` datent du 10 octobre; la matrice signale elle-même que les routes Auth actuelles ont évolué et que les anciens écrans Login/Register ne sont plus montés dans l’AuthNavigator. | Régénérer les IDs à partir des routes montées, y compris les flux conditionnés par rôle/licence, avant de déclarer les 76 destinations intégralement contrôlées. |
| À vérifier | Rendu natif non démontré | Le thème d’état est appliqué à `StatusBar`, mais aucun test sur appareil n’a été fourni pour les barres système, clavier, splash, action sheets, caméra, signature, date picker ou lecteurs d’écran. | L’export Expo et TypeScript ne constituent pas une preuve de ces comportements. Suivre la checklist `09-QUALITY-ASSURANCE.md` sur Android et iOS. |

## Contrôle des couleurs littérales

Le CSV [`10-LITERAL-COLOR-INVENTORY.csv`](10-LITERAL-COLOR-INVENTORY.csv) comprend 110 occurrences source dans 22 fichiers. La relecture du code confirme plusieurs exceptions intentionnelles : traits translucides et vague d’authentification, superposition de caméra/visionneuse, fonds de splash/icône et ombres natives. Les ombres ne sont pas des couleurs de contenu. `mobile/constants/Colors.ts` reste une palette héritée; le wrapper `components/Themed.tsx` résout désormais ses usages connus depuis le thème, mais cette ancienne palette demeure un piège pour tout nouvel appel.

Le bleu de marque courant est `#4B5FE8`, dérivé du bleu auth initial `#5569FF` pour satisfaire les contrastes AA des textes testés. Ce changement est explicite dans `03-TOKEN-SPECIFICATION.md`; il n’est pas une substitution silencieuse. L’authentification utilise désormais `brandHeader`, `primary`, `surface`, `onSurface` et leurs équivalents sémantiques. Les couleurs statutaires passent par les mappings de domaine existants; aucun changement de sens métier n’a été repéré dans les fichiers consultés.

## Contrôles exécutés et limites

- `npx tsc --noEmit` : réussi après les corrections.
- `npm run test:mobile-regression` : 6 suites réussies après la correction de contraste.
- `git diff --check` : réussi après les changements de code.
- Exports Expo Web, Android et iOS : réussis en séquence après la centralisation des tokens. L’export groupé initial avait été tué avec le code 137; aucun échec de bundling n’a été observé dans les exports individuels.
- Aucun lancement visuel Android/iOS, test VoiceOver/TalkBack ou essai de redémarrage avec préférence persistée n’a été réalisé dans cette relecture.

## Priorités restantes

1. Refaire l’inventaire actif des routes et relier chaque destination à un état Light et Dark contrôlé.
2. Valider le splash clair/sombre et les zones système après installation d’un binaire natif, avec préférence sombre persistée.
3. Vérifier sur appareil les overlays, feuilles, formulaires, clavier, navigation et annonces accessibles.
4. Étendre les tests de contraste aux paires de couleurs utilisées dans les états spécifiques de composants.

Cette relecture ne révèle pas de modification de contrat API, de permissions ou de logique métier dans les lots cités. Elle relève des limites de preuve native qui doivent rester ouvertes jusqu’à validation.
