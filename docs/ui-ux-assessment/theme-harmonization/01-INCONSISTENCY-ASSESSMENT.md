# QPM Mobile — audit des incohérences visuelles

**Date : 11 octobre 2026** · **Portée : audit de dépôt et suivi des lots d’harmonisation mobile.**

## Conclusion

L’identité bleue de l’authentification est un bon point de départ, mais le thème mobile n’est pas encore un système partagé. Le runtime fournit un thème Paper clair statique, React Navigation reçoit son thème clair par défaut, l’écran d’authentification fixe encore son fond et plusieurs couleurs en dur, et l’ancien wrapper `Themed.View` calcule une couleur de fond sans l’appliquer. Une préférence utilisateur Light/Dark/System n’est pas présente dans les écrans de réglages observés.

Ce sont des faits de code; l’apparence effective sur tous les appareils et les contrastes mesurés doivent être confirmés par rendu. Une exportation Expo Android réussie ne prouve pas le rendu iOS, Android ou tablette.

## État après les lots d’implémentation en cours

Le provider partage maintenant les thèmes Paper et React Navigation, conserve localement Light/Dark/System et hydrate ce choix avant le runtime d’interface. Les réglages proposent les trois choix; AuthFlow/Verify, le tableau de bord, plusieurs familles de formulaires/détails et les sélecteurs partagés utilisent les surfaces sémantiques. Les composants commentaire, quantité, téléversement, dialogue, signature, snackbar et action sheet ainsi que les foregrounds des badges WO/demandes ont été harmonisés. Les exports Android, iOS et Web ainsi que les contrôles de contraste automatisés passent. Ces résultats ne prouvent pas encore le rendu natif sur appareil, la persistance après redémarrage réel, ni la couverture de toutes les destinations. Les constats ci-dessous décrivent l’état initial audité et restent utiles comme justification; voir aussi l’inventaire courant des couleurs et la revue de composants.

### Mise à jour de l’inventaire

Le relevé lexical a été actualisé après le lot d’authentification et de sélecteurs. Les principales occurrences restantes se trouvent dans les primitives partagées (commentaires, quantité de pièces, caméra, téléversement, états de chargement), dans l’ancien thème Expo et dans quelques écrans/familles encore à valider. Les superpositions caméra et visionneuse sont des exceptions intentionnelles de contraste; les surfaces et textes éditoriaux doivent suivre les tokens. La revue détaillée est dans [`11-COMPONENT-COLOR-REVIEW.md`](11-COMPONENT-COLOR-REVIEW.md), avec les priorités de suite.

## Constats vérifiés

| Gravité | Constat et preuve | Conséquence |
|---|---|---|
| Élevée | `mobile/App.tsx` appelle `useColorScheme()`, mais passe toujours `customTheme` à `PaperProvider`; le choix système n’est pas converti en thème Paper. | Les composants Paper n’adaptent pas globalement leurs surfaces au système. |
| Élevée | `mobile/navigation/index.tsx` configure `NavigationContainer` avec `DefaultTheme`; son argument `colorScheme` n’est pas utilisé pour choisir le thème de navigation. | Barres, en-têtes et arrière-plans natifs peuvent différer des composants Paper. |
| Élevée | `mobile/components/Themed.tsx` calcule `backgroundColor`, puis rend `DefaultView` avec `backgroundColor: 'white'` au lieu de la variable calculée. | Les vues utilisant ce wrapper ne respectent pas la couleur de fond claire/sombre qu’il annonce. |
| Élevée | `mobile/screens/auth/AuthenticationScreen.tsx` contient des styles de surface, texte, bordure et compte codés en hexadécimal; la vague frontale et le contenu sont blancs. `VerifyScreen.tsx` réutilise partiellement les tokens, mais force `theme.colors.white`. | Une activation du mode sombre ne suivrait pas l’ensemble de l’expérience d’authentification. |
| Élevée | `mobile/screens/SettingsScreen.tsx` offre profil, compte, licence et entreprise, mais aucun réglage d’apparence. | L’utilisateur ne peut pas choisir Light, Dark ou System. |
| Moyenne — corrigée | `mobile/constants/Colors.ts` contenait la palette Expo de démarrage, tandis que `mobile/custom-theme.ts` portait la palette QPM. | `Colors.ts` dérive maintenant ses valeurs des tokens Light/Dark QPM; ses deux wrappers d’écran hérités suivent le thème. |
| Moyenne | `mobile/screens/HomeScreen.tsx` a un hero navy et des couleurs de texte/actions explicites qui ne proviennent pas de `custom-theme.ts`. | Le tableau de bord ne suivra pas une personnalisation centralisée et devra être revu pour le mode sombre. |
| Moyenne | `mobile/models/asset.ts` garde au moins une couleur d’état (`MODERNIZATION`) en dur; `mobile/utils/overall.ts` mappe les statuts WO/priorités vers des couleurs de thème, mais `COMPLETE` renvoie la chaîne `'black'`. | Des sémantiques métier peuvent perdre leur lisibilité ou diverger entre thèmes si l’on remplace mécaniquement les hex. |
| Moyenne | `mobile/screens/auth/AuthenticationScreen.tsx` mélange styles globaux `StyleSheet` et valeurs locales, alors que les composants Paper utilisent des variantes et couleurs de thème. | Les contrôles n’ont pas une source de vérité unique pour états normal, actif, erreur et désactivé. |
| À vérifier | Palette actuelle: le contraste calculé de blanc sur `#5569ff` est environ 4,33:1; `#737d95` sur blanc environ 4,12:1. | Ces associations sont sous le seuil WCAG AA 4,5:1 pour texte normal. Ajuster les couples foreground/background dans le prototype et contrôler les états réels. |

## Surface d’impact

L’inventaire existant [`../screen-inventory.json`](../screen-inventory.json) recense 76 destinations mobiles enregistrées, 97 fichiers d’implémentation d’écran et 37 modules de composants partagés dans `mobile/components` (comptage documentaire, voir sa méthode). Les familles à harmoniser sont Authentification (4), Travail/WO (13), Demandes (4), Actifs et emplacements (11), Préventif/compteurs (7), Inventaire/partenaires (12), Personnes/équipes (9), Administration (16). Les destinations sont réparties dans `mobile/navigation/index.tsx`; le détail et les identifiants MOB sont dans l’inventaire.

Le thème touche aussi les feuilles action/bottom sheets déclarées dans `mobile/components/actionSheets/sheets.tsx`, les sélecteurs de `mobile/screens/modals/`, les dialogues Paper, la barre d’onglets, la caméra, le visualiseur d’images, le calendrier, les graphiques et les formulaires. La liste complète de destinations et les composants sources doivent rester la référence de couverture; « 76 destinations » ne signifie pas 76 pages indépendantes.

## Compatibilité fonctionnelle

`mobile/custom-theme.ts`, `mobile/App.tsx`, `mobile/navigation/index.tsx`, `mobile/hooks/useColorScheme.ts`, `mobile/contexts/AuthContext.tsx`, `mobile/screens/SettingsScreen.tsx`, `mobile/screens/auth/AuthenticationScreen.tsx` et `mobile/screens/auth/VerifyScreen.tsx` sont les points d’intégration à évaluer après approbation. L’authentification conserve `login`, `register`, LDAP, sélection de serveur et vérification; ce chantier n’a pas besoin de changer les services Auth ni les API. Aucune préférence d’apparence utilisateur n’a été trouvée dans le profil mobile existant; la synchronisation serveur demeure donc hors de portée jusqu’à vérification d’un champ/endpoint compatible.

**Décision demandée :** valider l’identité proposée, les couples de contraste et le prototype avant toute édition de source applicative.
