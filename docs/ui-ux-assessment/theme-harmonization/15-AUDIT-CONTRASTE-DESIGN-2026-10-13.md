# Audit mobile QPM — contraste et cohérence visuelle

Date : 13 octobre 2026
Périmètre : sources mobiles actives, thème React Native Paper, tokens QPM, écrans et composants partagés. Aucun endpoint, rôle ou comportement métier n’a été modifié.

## Conclusion

Les défauts connus de contraste relevés pendant l’harmonisation (en-tête Home clair/sombre, texte des états sémantiques, actions de chronométrage, état désactivé du FAB et hiérarchie de la confirmation) sont corrigés dans l’état actuel du dépôt. Les tests couvrent les paires de couleurs pour les deux thèmes, les cinq surfaces de contenu, les statuts/priorités et les commandes de minuterie.

Cette conclusion porte sur les valeurs et associations source. Elle ne certifie pas encore le rendu perçu sur téléphone, les couleurs composites des composants natifs, ni l’annonce des états par VoiceOver/TalkBack.

## Vérifications et résultat

| Zone                        | Contrôle                                                                                                                                             | Résultat                                                                                                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentification et accueil | Fond bleu de marque avec texte `onBrandHeader`; le bandeau Home utilise `onBrandHeader` à opacité 1 et un fond transparent pour sa ligne supérieure. | Conforme dans les deux thèmes selon les tokens; composition vérifiée dans `HomeScreen.tsx`.                                                                                                                                  |
| Surfaces                    | Texte principal et secondaire sur `canvas`, `surface`, `surfaceRaised`, `surfaceBrandSubtle` et `tertiaryContainer`.                                 | Assertions AA à 4,5:1; texte désactivé et contours à 3:1 minimum.                                                                                                                                                            |
| Boutons et contrôles        | Couples `primary/onPrimary`, `secondary/onSecondary`, bordure de contrôle et messages d’erreur.                                                      | Paires explicites du thème; vérification dans `appearance.test.cjs`.                                                                                                                                                         |
| Statuts/priorités           | Correspondance `OPEN`, `IN_PROGRESS`, `ON_HOLD`, `LATE_WO`, `TODAY_WO`, `COMPLETE` et priorités `NONE` à `HIGH`.                                     | Mapping sémantique stable; texte associé vérifié sur les aplats correspondants.                                                                                                                                              |
| Minuterie WO                | Démarrer, arrêter et état désactivé/occupé.                                                                                                          | Texte actif associé à `onPrimary` ou `onError`; l’état désactivé associe les tokens Paper de surface et d’encre désactivées. Tests existants conservés.                                                                      |
| Thème Paper tertiaire       | `tertiary` QPM correspond au bleu information, mais les encres tertiaires étaient héritées de Material.                                              | Défaut latent corrigé : `onTertiary` utilise `onInfo`; `onTertiaryContainer` est explicite. Un test couvre les deux modes et le contraste des deux paires.                                                                   |
| Formes et rythme            | Rayon des contrôles/cartes/grandes cartes/feuilles et espacement à l’échelle 4 dp.                                                                   | Tokens centralisés dans `theme/tokens.ts`; les cartes de répertoire et les familles harmonisées reprennent l’échelle QPM. Les écrans historiques restants doivent encore être parcourus sur appareil pour les écarts locaux. |

## Couleurs littérales encore observées

La recherche dans `mobile/screens`, `mobile/components` et `mobile/navigation` ne trouve plus de couleur littérale ordinaire de texte/fond dans les écrans. Les occurrences restantes sont limitées à des couches dont la couleur doit rester indépendante du thème :

- `components/ImageViewer.tsx` et `ImageViewer.web.tsx` : voile sombre sur photographie, commandes blanches sur cette voile;
- `components/InAppCamera.tsx` : viseur/commandes caméra blancs et voile noire;
- `screens/auth/AuthenticationScreen.tsx` : bordures blanches translucides sur le décor bleu de marque.

Ces exceptions sont intentionnelles et ne constituent pas des surfaces de contenu clair/sombre. À l’examen visuel, confirmer que les textes de la visionneuse restent lisibles sur des photos très claires et que le viseur caméra reste visible sur des scènes claires; ajouter un fond de commande local si l’essai le révèle nécessaire.

## Cohérence de design

- La palette Auth QPM est bien représentée par `brandPrimary`, `brandHeader`, `onBrandHeader` et les surfaces associées; les pages internes utilisent le même fournisseur Paper et la même préférence Light/Dark/System.
- Les statuts conservent leur sens métier (ouvert/neutre, en cours/succès, suspendu/avertissement, en retard/erreur, terminé/complété). Aucun code de statut n’a été recoloré de façon arbitraire pendant cet audit.
- La hiérarchie textuelle et les grands rayons sont définis par des tokens, mais l’adoption n’est pas uniforme dans tous les styles historiques. L’inventaire est au niveau du dépôt, pas une revue exhaustive de chaque écran à chaque taille d’écran.
- La palette de compatibilité `mobile/constants/Colors.ts` existe encore. Les nouveaux styles doivent utiliser `useAppTheme` et `qpmDesignTokens`/`qpmLayoutTokens`; ne pas créer de nouvelles références à l’ancienne palette.

## Anomalie corrigée

`mobile/theme/paperColors.ts` remplaçait le rôle Paper `tertiary` par `tokens.info`, tout en héritant `onTertiary` d’une palette Material non corrélée. Les usages directs n’étaient pas repérés dans les écrans actuels, mais un composant Paper configuré en mode tertiaire pouvait associer un texte inadéquat. Le thème expose maintenant `onTertiary: tokens.onInfo` et un `onTertiaryContainer: tokens.textPrimary` explicite. Le test dédié confirme leurs contrastes AA en clair et sombre.

## Validation exécutée

- `npm run test:mobile-regression` : 11/11 suites passent, dont les assertions de contraste.
- `npx tsc --noEmit --pretty false` : réussi.
- `npx prettier --check theme/paperColors.ts scripts/appearance.test.cjs` : réussi.
- `npx expo export --platform android` : bundle réussi, 2 205 modules.
- `npx expo export --platform ios` : bundle réussi, 2 174 modules.

## Contrôles appareil encore ouverts

Faire une recette physique en clair et sombre sur Android et iOS : accueil et safe areas, formulaire Auth, liste et détail WO, tâches/minuterie, confirmation, listes de statuts/priorités, champs avec erreur/désactivés, menus et feuilles, clavier, sélecteurs natifs, appareil photo et visionneuse. Vérifier aussi contraste perçu, texte agrandi, navigation lecteur d’écran et barres système. Les exports Expo et ratios numériques ne remplacent pas cette recette.
