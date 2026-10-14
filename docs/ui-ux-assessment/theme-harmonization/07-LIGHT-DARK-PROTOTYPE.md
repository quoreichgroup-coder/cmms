# Prototype de thème Light / Dark

Un prototype interactif isolé est fourni à [`prototype/theme-preview.html`](prototype/theme-preview.html). Il ne charge pas QPM, n’appelle aucune API et n’écrit aucune préférence. Utiliser les commutateurs **Clair / Sombre / Système** pour examiner auth, tableau de bord, carte d’ordre de travail et réglage d’apparence.

## Critères de revue

- Reconnaître l’identité QPM authentification : bleu, contours topographiques, vague, champs soulignés, action primaire et hiérarchie typographique.
- Comparer la surface claire et la surface sombre; vérifier que la carte WO reste dense et scannable.
- Contrôler que les états gardent libellé + icône/indice et contraste, au lieu d’être distingués par teinte uniquement.
- Évaluer sur largeur 360–390 px et grand viewport; la maquette HTML est une spécification visuelle, pas preuve de comportement natif.

## Écarts assumés

Les textes secondaires et le bleu primaire de prototype sont assombris/éclaircis par rapport au pixel exact de l’écran auth pour corriger les couples de contraste mesurés. La vague sombre se base sur la surface du contenu plutôt que le blanc. Les motifs et fonctions d’auth restent illustratifs; aucune interaction d’auth/API n’est simulée.
