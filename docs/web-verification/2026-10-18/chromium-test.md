# QPM Web — vérification Chromium du 18 octobre 2026

Le build React de production local a été servi par un serveur statique avec repli SPA. Chromium 155 a été lancé directement depuis le binaire du Snap, puis piloté par DevTools Protocol.

## Résultats

- Page testée : connexion QPM après redirection SPA depuis `/app/work-orders`.
- Viewports mesurés : 1440 × 1000, 768 × 1024 et 390 × 844.
- Largeur documentale identique au viewport dans les trois cas; aucun débordement horizontal.
- Le lien « Lost password ? » garde une seule ligne à 390 px et se place sous les contrôles lorsqu’il n’y a pas assez de largeur.
- Après purge du profil de test, Chromium a chargé le bundle `main.b8d6b979.js`; aucune exception ni erreur JavaScript n’a été émise.
- Une requête de l’application vers l’API a échoué parce que ce banc de test ne démarrait aucun backend. Les écrans authentifiés, les droits et le retry de l’état de licence contre une API réelle restent donc à vérifier.

## Captures

- Desktop : [qpm-login-desktop.png](qpm-login-desktop.png)
- Mobile : [qpm-login-mobile.png](qpm-login-mobile.png)

Les captures représentent l’écran de connexion. Elles ne prouvent pas le fonctionnement des parcours authentifiés.
