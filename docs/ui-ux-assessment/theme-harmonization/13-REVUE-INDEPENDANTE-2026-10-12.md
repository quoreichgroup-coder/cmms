# Revue indépendante de l’harmonisation QPM Mobile — 12 octobre 2026

## Conclusion

La fondation de thème n’est pas biaisée par une palette unique appliquée à tous les états : la marque, les surfaces et les états opérationnels ont des rôles distincts, et les statuts Open, On Hold, In Progress, Completed, Overdue et Priority gardent leurs mappings de domaine. Paper, React Navigation, l’authentification et les trois préférences Light/Dark/System sont reliés au thème courant. La revue n’a trouvé aucune modification des contrats d’API ou des permissions dans le chemin du thème.

La couverture reste incomplète. Une paire de contraste non conforme est utilisée pour les contrôles non sélectionnés, plusieurs composants visuels gardent des couleurs intentionnelles ou héritées, et le thème partagé ne couvre que l’application mobile. Le dépôt ne prouve pas encore le rendu Android/iOS ni l’accessibilité de chaque écran.

## Périmètre et preuves

- Revue des tokens, `AppearanceProvider`, initialisation du splash, wrapper de couleurs, `NavigationContainer`, préférences Réglages, flux d’authentification et occurrences couleur littérales du code mobile.
- Matrice actualisée : 75 déclarations de navigation mobile actives; 76 entrées d’inventaire, dont MOB-068 conservée comme trace historique non montée; 99 fichiers source sous `mobile/screens`; 37 modules de composants partagés sous `mobile/components`.
- Scan lexical documenté dans `10-LITERAL-COLOR-INVENTORY.csv` : le relevé après harmonisation du tutoriel partagé comptait 104 occurrences dans 21 fichiers. Cette relecture a retiré l’entrée périmée de `NotFoundScreen` et quatre couleurs de squelettes déléguées aux tokens (`WelcomeScreen`/`TabTwoScreen`); le relevé actuel compte 99 occurrences dans 18 fichiers. Ce décompte est un guide de revue, pas un indicateur de défauts.
- Vérifications exécutées le 12 octobre : `npm run test:mobile-regression` (6 suites, 6 réussies), `npx tsc --noEmit` (réussi), `git diff --check` (réussi).
- Aucun appareil Android/iOS, lecteur d’écran ou redémarrage d’application n’a été vérifié pendant cette revue. Un export JavaScript ne prouve pas ces rendus natifs.

## Écarts et limites constatés

| Gravité | Constat | Preuve et impact |
|---|---|---|
| Corrigé dans le lot suivant | `outline` servait aux contrôles non sélectionnés; son contraste était trop faible. | `controlOutline` dédié est maintenant utilisé dans les sélecteurs et testé à >=3:1 sur les surfaces clair/sombre. Les bordures de cartes et diviseurs restent inchangées. |
| Moyen — harmonisation multiplateforme inachevée | Les tokens et préférences examinés appartiennent à `mobile/`; le thème Web sous `frontend/src/theme` reste indépendant et aucune couche de tokens partagée n’est démontrée. | La cohérence Web/Mobile n’est donc pas garantie par cette implémentation. Maintenir ce travail comme harmonisation mobile, ou prévoir une tranche séparée Web avant de déclarer QPM entier harmonisé. |
| Moyen — spécification plus large que le code | Le système centralise surtout les couleurs. Espacement, rayons, élévation et typographie ne forment pas encore un ensemble complet de tokens communs. Aucun sélecteur d’accent personnalisé n’est implémenté. | `mobile/theme/tokens.ts` contient les palettes sémantiques mais pas ces échelles. Le choix d’accent était conditionnel (« si pris en charge ») dans la demande; il n’est pas annoncé comme livré. |
| Moyen — contraste non testé exhaustivement | Les tests vérifient des paires textuelles et statutaires choisies, mais pas chaque combinaison Paper, contour, état désactivé/focus, surface élevée, overlay ni usage de token. | `appearance.test.cjs` ne teste pas les tokens `border`/`borderSubtle` comme indicateurs fonctionnels. Les valeurs `textDisabled` ne dépassent pas 4,5:1 sur surface (4,12:1 clair, 4,41:1 sombre); actuellement aucune utilisation active n’a été trouvée. Leur emploi futur pour du texte informatif ordinaire nécessiterait une couleur plus contrastée. |
| À vérifier sur appareil | Le splash reste statiquement blanc dans `app.config.ts`; le système attend l’hydratation de la préférence avant le premier rendu React. | Le splash natif peut donc rester clair avant l’interface sombre. Les barres système, zones gestuelles, clavier, ActionSheet, Snackbar, caméra, lecteur d’images, date picker et signature demandent encore un contrôle réel sur Android et iOS. |
| Faible — exceptions délibérées à documenter | Les blancs/transparences de caméra et visionneuse, la vague d’authentification, les ombres et le fond de splash restent littéraux. | Le contexte d’overlay les justifie; ce ne sont pas des fuites de couleur de contenu. `WelcomeScreen` et `TabTwoScreen` restent des squelettes non montés, mais leurs surfaces suivent maintenant le thème; `ModalScreen` est monté et son composant tutoriel est thémé. |

## Contrôles positifs

- Le `PaperProvider` et le `NavigationContainer` dérivent leurs thèmes de la même préférence effective.
- L’application attend le chargement des ressources et de la préférence avant de monter les écrans; les changements système s’appliquent en préférence `system`.
- Les tests de contraste existants passent pour les paires qu’ils couvrent. Les statuts conservent des tokens d’arrière-plan et de premier plan distincts entre modes; aucun changement de leur sens métier n’a été observé.
- Le registre écran a été recalé sur les routes actives. `AuthFlow` (accueil, connexion, inscription), `Verify` et `CustomServer` sont les destinations auth actives; MOB-068 demeure marqué comme entrée historique non montée.
- Les exceptions de couleur photo/caméra sont des overlays sombres cohérents sur Android/iOS/Web, et non des couleurs d’état métier.

## Suite recommandée

1. Confirmer visuellement les contrôles non sélectionnés sur appareil et étendre le scan aux indicateurs interactifs non recensés.
2. Faire une recette appareil clair/sombre sur Android et iOS, avec petites/grandes tailles, changement de thème à chaud, redémarrage avec préférence persistée, navigation gestuelle, clavier et permissions caméra.
3. Vérifier le rendu des écrans atteignables par rôles, licences et permissions, en distinguant les 75 destinations actives des 76 enregistrements documentaires.
4. Garder la portée mobile explicite. Une couverture Web commune, l’accent personnalisable et les tokens de typographie/espacement demandent une tranche de conception/implémentation séparée.

Cette revue confirme la cohérence de la structure principale, mais **ne certifie pas l’absence de défaut d’accessibilité ni la parité visuelle Web/mobile**. Le défaut de contraste des indicateurs de sélection observé pendant la revue a été corrigé ci-dessous; les autres limites de validation restent ouvertes.

### Vérification du correctif des contrôles — même date

Le token `controlOutline` a été ajouté aux thèmes Light/Dark et appliqué aux marqueurs non cochés des sélecteurs d’actifs, pièces, compteurs, catégories, emplacements, équipes, personnes, fournisseurs et clients. Le test de contraste vérifie cinq surfaces par thème à >=3:1. `npm run test:mobile-regression` (6/6), `npx tsc --noEmit`, Prettier, `git diff --check` et `npx expo export --platform web` réussissent après ce changement. Le rendu et l’opérabilité sur appareil Android/iOS restent à faire.

Le composant de tutoriel Expo `EditScreenInfo`, atteint depuis la route modale, ne force plus sa propre palette; il utilise les couleurs Paper/QPM. La revue précédente comptait alors 104 occurrences dans 21 fichiers; après correction de l’entrée `NotFound` et des quatre littéraux des écrans hérités, voir le relevé actuel de 99/18. La route `NotFound` utilise déjà le token primaire; aucun changement source n’était nécessaire sur son code.

### Relecture complémentaire — composants partagés et écarts résiduels

- Les badges de statut et priorité passent par `Tag` et gardent leur couleur foreground/background fournie par les mappings existants dans `mobile/utils/overall.ts` et `mobile/models/asset.ts`; leurs libellés restent explicites. Un rayon fixe de 5 dp et un espacement indépendant ont été alignés sur `qpmLayoutTokens` dans `mobile/components/Tag.tsx`. Les mappings, textes, conditions et actions ne changent pas.
- Les couleurs littérales restantes recensées ont été échantillonnées : les valeurs de la caméra et du visualiseur photo appartiennent à des overlays sur média; les valeurs `shadowColor` sont des effets natifs; la vague Auth conserve ses transparences décoratives. `WelcomeScreen` et `TabTwoScreen` sont des squelettes hérités hors navigation active, maintenant raccordés au thème. Cela ne prouve pas l’absence de toute autre fuite visuelle.
- La parité du thème Web n’est pas établie, car les tokens QPM audités sont sous `mobile/`. Les arrière-plans natifs de splash restent statiques (clair sur iOS, blanc/bleu nuit sur Android) et peuvent diverger du thème sombre avant l’interface. Ce sont des écarts documentés, pas des corrections mobiles démontrées.
- Vérification de ce lot : `npm run test:mobile-regression` (6/6), `npx tsc --noEmit`, Prettier sur `Tag.tsx` et `git diff --check` réussissent. Aucun appareil, émulateur ou lecteur d’écran n’était connecté; l’apparence Android/iOS à chaud, après redémarrage, et l’usage des interactions restent à vérifier manuellement.

Cette relecture réduit un défaut de consistance visuelle et corrige un faux positif documentaire. Elle n’autorise pas à déclarer l’harmonisation complète : la recette native, la couverture Web, le splash sombre et le contrôle exhaustif des routes sous différents rôles restent ouverts.

### Vérification supplémentaire des couleurs de statut

Une comparaison avec la version antérieure du helper (`git show HEAD:mobile/utils/overall.ts`) a révélé une dérive que le scan des littéraux ne détectait pas : `tertiary` était gris avant l’harmonisation (`#9DA1A1`), mais est maintenant lié au bleu d’information. Comme `OPEN` et `Priority.NONE` dépendaient de `tertiary`, ils avaient donc pris une teinte bleue par effet indirect, en contradiction avec le token `status.neutral` de la spécification.

Corrigé : `getStatusColor('OPEN')` et `getPriorityColor('NONE')` utilisent désormais `neutral`; le badge `OPEN` utilise `onNeutral`. Les associations `IN_PROGRESS/success`, `ON_HOLD/warning`, `LATE_WO/error`, `TODAY_WO/primary`, `COMPLETE/complete` et les priorités Low/Medium/High ne changent pas. La logique et les libellés de domaine sont intacts. Le test de contraste vérifie maintenant aussi le couple neutre clair/sombre. Suites mobiles (6/6), TypeScript et `git diff --check` passent. Le rendu sur appareil reste à confirmer.

La relecture des usages de priorité a aussi trouvé que `PriorityPicker` définissait le fond sélectionné de chaque segment sans définir sa couleur de texte. Paper choisissait alors une encre globale qui n’était pas nécessairement contrastée avec le niveau sélectionné. Le helper `getPriorityForegroundColor` expose maintenant la paire associée (neutre/information/avertissement/erreur), passée à `checkedColor`; le test couvre les quatre couples en clair et sombre à >=4,5:1. Des assertions vérifient également les mappings runtime de chaque priorité et des principaux statuts dans les deux thèmes. Suites mobiles (6/6), TypeScript, `git diff --check` et export Expo Web réussissent. L’interaction visuelle sur appareil reste à confirmer.

### Palette Expo héritée — raccordement au système QPM

`mobile/constants/Colors.ts` dérive maintenant ses valeurs des tokens Light/Dark au lieu de conserver les bleus/noirs/blancs initiaux d’Expo. Les séparateurs de `WelcomeScreen` et `TabTwoScreen` n’imposent plus de couleurs spécifiques et héritent du thème QPM via `Themed.View`. Ces deux écrans ne sont toujours pas des destinations actives; la correction retire néanmoins leur palette contradictoire en cas de réactivation. Les routes et comportements restent inchangés.

Pour ce lot : `npm run test:mobile-regression` (6/6), `npx tsc --noEmit`, Prettier sur les trois fichiers modifiés, `git diff --check` et `npx expo export --platform web` réussissent. L’export Expo valide le bundle web partagé, pas son rendu natif ni les interactions sur appareil.

### Relecture complémentaire — 12 octobre 2026

Une seconde passe a comparé les tokens, les usages de thèmes Paper/Navigation, l’authentification, les réglages d’apparence, les overlays et les ressources natives de démarrage. Aucun écart de mapping sémantique confirmé n’a été trouvé entre les états de maintenance et leurs couleurs : `OPEN`/`NONE` restent neutres, `IN_PROGRESS` vert, `ON_HOLD` ambre, `LATE_WO` rouge, `COMPLETE` utilise son token dédié; les tests protègent les correspondances en clair et en sombre.

| Gravité | Constat vérifié | Suite |
|---|---|---|
| Moyen | Le splash natif reste blanc dans `mobile/app.config.ts` et `mobile/android/app/src/main/res/values/colors.xml`; le fond de la barre d’état Android est aussi explicitement blanc dans `mobile/android/app/src/main/res/values/styles.xml`. Cela peut faire apparaître une bande ou un flash clair avant le premier écran sombre, même si le splash attend l’hydratation de la préférence. | Tester un lancement à froid en mode sombre sur Android et iOS. La configuration Expo examinée définit un fond unique; une adaptation native demande une décision/configuration distincte et un nouveau binaire. Aucun changement n’a été fait dans cette passe d’audit. |
| Moyen | Le CSV d’occurrences littérales est un instantané, pas un scan généré automatiquement. Il ne qualifie pas les couleurs trouvées. Les littéraux blancs/translucides de l’en-tête Auth, de la caméra et de la visionneuse sont des traitements contextuels; l’ombre noire est décorative. | Régénérer l’inventaire au prochain lot de code de thème et garder ces exceptions classées. Ne pas remplacer les couleurs de contenu restantes à l’aveugle. |
| Moyen | La vérification des overlays a confirmé que les dialogs/portals Paper héritent du thème partagé, mais certaines couches natives ou tierces (ActionSheet, clavier, date picker, signatures et barres gestuelles) dépendent aussi du rendu OS et ne sont pas prouvées par le code ni par les tests de bundle. | Contrôle manuel Android/iOS en clair et sombre, en particulier les barres de navigation et la reprise après affichage du clavier. |
| Faible | Les tokens `textDisabled` ont un contraste inférieur à AA pour du texte informatif courant; les tests ne justifient pas de les utiliser pour les libellés essentiels. | Les réserver aux contenus réellement désactivés et vérifier les états activés/désactivés sur les formulaires. |

Cette passe est un audit de cohérence UI/thème sur le dépôt, pas un test d’intrusion ni une certification de sécurité globale. Elle n’a trouvé ni dérive confirmée des couleurs métier, ni changement induit des API ou permissions dans les points d’intégration du thème. La confirmation visuelle complète reste indisponible dans cet environnement sans appareil/simulateur ni lecteur d’écran.

Validations rejouées après les changements présents : `npm run test:mobile-regression` (7/7), `npx tsc --noEmit` et `git diff --check`.

### Relecture supplémentaire des assets de démarrage — 12 octobre 2026

L’inspection des pixels a révélé que les PNG du splash sur Android et iOS ont un fond blanc opaque (`image.png` iOS et `drawable-*-dpi/splashscreen_logo.png` Android). Une variante de fond natif sombre seule laisserait un carré blanc autour du logo; l’essai de variantes sombres a été retiré avant livraison. Le splash clair reste inchangé et le point QA reste ouvert jusqu’à création/validation d’assets de lancement sombres. Cette vérification a évité une incohérence visible. La validation native Gradle n’a pas été possible dans le bac à sable, qui interdit de créer le verrou sous `/home/abdouramane/.gradle`.
