# Spécification Light / Dark / System

## Comportement attendu

- Trois préférences : **Clair**, **Sombre**, **Système**. Système est le défaut de première installation.
- `effectiveScheme = preference === 'system' ? deviceScheme : preference`; les mises à jour d’apparence système se reflètent sans redémarrage tant que la préférence est System.
- Un unique fournisseur de thème crée le thème Paper et le thème React Navigation depuis la même palette sémantique effective. Authentification, application, Dialog, Portal, action sheet, barre de statut et en-têtes reçoivent le même schéma.
- Hydrater le choix local avant d’afficher la navigation; conserver un état d’amorçage neutre dérivé du schéma système et éviter de peindre brièvement le mode clair par défaut. Le splash ne se masque qu’après la disponibilité de la préférence et des polices.
- La préférence est locale et indépendante du compte. La connexion, le compte sélectionné, le changement de serveur et la déconnexion ne doivent pas la réinitialiser.
- Sur Android : thème de statut/barre système, canaux de notifications et clavier doivent rester lisibles. iOS : status bar, safe area, formulaires et feuilles doivent suivre le schéma. Vérifier les couleurs système réelles par version OS.

## Candidats de palette

Voir `03-TOKEN-SPECIFICATION.md`. Le mode sombre est une composition de surfaces navy/gris et d’accents bleus clairs; il n’est pas une inversion mécanique. Les états danger, avertissement, succès et arrêt d’urgence gardent leur sens.

## Risques de compatibilité à lever en prototype

1. Les dialogues sont parfois enveloppés avec `Portal theme={theme}` (`SettingsScreen.tsx`); vérifier que le thème unifié arrive jusque dans Portal et ActionSheet.
2. Les composants `Themed.View` et `Themed.Text` s’appuient sur `mobile/constants/Colors.ts`, dont les valeurs Light/Dark sont maintenant dérivées des mêmes tokens QPM que le thème Paper.
3. Certaines vues passent les couleurs par `StyleSheet` statiques et d’autres par le thème à l’exécution; le dark mode exige de convertir le premier groupe.
4. Le fond de splash (`mobile/app.config.ts`) reste une ressource native statique; il doit être évalué comme transition de lancement, pas seulement après montage React.
5. Les formulaires, calendrier, graphiques, signatures et viewer d’images ont des surfaces propres qui doivent être listées dans la recette.

Cette spécification ne certifie pas la prise en charge par toutes les versions Android/iOS et ne modifie aucune préférence aujourd’hui.
