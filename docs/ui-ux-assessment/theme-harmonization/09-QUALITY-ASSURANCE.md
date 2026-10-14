# Checklist de recette thème et accessibilité

## Thèmes et persistance

- [ ] Clair / sombre / système dans l’écran Apparence; sélection affichée immédiatement et persistée après redémarrage.
- [ ] System suit le basculement clair/sombre de l’appareil sans redémarrage; préférence explicite ne le suit pas.
- [ ] Splash natif en apparence système claire/sombre, démarrage hors ligne et session expirée. Les ressources claires/sombres sont configurées dans Expo (`splash.dark`), dans les qualifiers Android `night` et dans les apparences iOS du catalogue d’assets; les variantes sombres sont transparentes sur `#0D1220`. Vérifier chaque apparence par lancement à froid après installation du binaire; l’inspection des fichiers ne prouve pas le rendu OS.
- [ ] Logout, changement de compte et serveur conservent la préférence locale.
- [ ] Paper, React Navigation, Portal, ActionSheet, Snackbar, dialogs, status/navigation bars, splash et clavier restent cohérents.

## Matrice d’écran et de plateforme

- [ ] Toutes les 75 destinations actives (`MOB-001` à `MOB-067`, puis `MOB-069` à `MOB-076`) contrôlées au minimum par navigation et thème; MOB-068 est une entrée historique non montée. Noter les vues invisibles/permissionnées.
- [ ] Pilote : auth, dashboard avec vrais zéros, liste/détail WO, saisie tâches, demande, Asset 360, PM et paramètres.
- [ ] Dashboard : changer rapidement « mes ordres » et tirer pour rafraîchir dans les deux sens; les compteurs doivent rester associés au dernier filtre choisi même si les réponses API arrivent dans le désordre.
- [ ] Téléphone étroit 360/375 dp, téléphone large 430 dp, tablette portrait/paysage et Expo Web étroit/large.
- [ ] Vérifier le rayon de 20 dp des cartes du Dashboard, des notifications, des ordres de travail, des demandes, des actifs et des annuaires en clair/sombre, avec texte long et fonte agrandie.
- [ ] Sur la fiche et l’exécution d’un ordre de travail, confirmer que la carte d’identité, progression, tâches, coûts et temps gardent une élévation légère sans réduire les zones tactiles ou masquer les actions.
- [ ] Dans la section Pièces d’un ordre de travail, vérifier les sous-cartes, badges de quantité, nom de pièce long, menu d’édition/suppression et dialogue de quantité en clair/sombre et sur téléphone étroit.
- [ ] Contrôler les cartes Actifs, Emplacements, Pièces, Compteurs et Maintenance préventive, y compris les cartes imbriquées de fiche compteur, en clair/sombre et avec le texte agrandi.
- [ ] Contrôler les cartes de détails Demande et profil entreprise, les sections Réglages/profil utilisateur et dialogues du profil, en thème clair/sombre et avec taille de texte agrandie.
- [ ] Contrôler les états vides Fournisseurs/Clients, les statistiques WO et la carte Licence; vérifier que les métriques imbriquées restent visuellement secondaires.
- [ ] Contrôler les fiches Équipe/Utilisateur, erreurs et états vides des listes WO/Demandes, avec filtres/recherche, sur téléphone étroit et thème sombre.
- [ ] Contrôler les liens associés de l’Actif, Emplacement, Pièce et Compteur : libellés longs, plusieurs valeurs, cibles tactiles et navigation, sur téléphone étroit en clair/sombre.
- [ ] Vérifier le menu Plus, les recherches People/Teams/Compteurs, les visuels des fiches Actif/Compteur et l’action de relevé en thèmes clair/sombre.
- [ ] Android et iOS réels/simulateurs; clavier, safe area, rotation, feuilles, modal, viewer, caméra, date picker, signature.

## Contraste et interaction

- [ ] Mesurer texte normal >=4.5:1; grand texte >=3:1; indicateurs graphiques/contrôles pertinents >=3:1.
- [x] Contraste automatisé >=3:1 pour `controlOutline` sur les surfaces clair/sombre; les contours non sélectionnés des sélecteurs utilisent ce token dédié. Confirmer leur rendu sur appareil.
- [x] Contraste automatisé des textes sémantiques sur les cinq surfaces QPM (`canvas`, `surface`, `surfaceRaised`, `surfaceBrandSubtle`, `tertiaryContainer`) : textes principal/secondaire >=4,5:1; texte désactivé >=3:1. `controlOutline` est aussi vérifié à >=3:1 sur ces surfaces dans les deux thèmes. Ces assertions valident les tokens et ne remplacent pas l’inspection de chaque composant sur appareil.
- [x] Les textes de conteneurs status (`success`, `warning`, `error`, `info`) atteignent >=4,5:1 dans les palettes QPM claire et sombre; vérifier le rendu visuel des usages sur appareil.
- [ ] Aucun état transmis par couleur seule; badge combine texte et éventuellement icône.
- [ ] En cas de mutation destructive, bouton de confirmation annonce le chargement, refuse les pressions répétées et permet la relance si l’API échoue; valider sur appareil les dialogues de WO, actifs, emplacements, compteurs, équipes, fournisseurs et clients.
- [ ] Valider aussi les états busy/erreur/succès pour le retrait d’une pièce liée, la suppression d’un commentaire et la confirmation de suppression de compte; confirmer le maintien de la confirmation pendant une requête active.
- [ ] Valider les suppressions de temps/coûts WO, quantités de pièces et relevés compteur : progression visible, blocage des doubles pressions, résultat erreur/succès et formulaire de quantité conservé après échec.
- [ ] Dans les formulaires basés sur le composant partagé, toucher deux fois rapidement sur Enregistrer : une seule mutation doit partir, le bouton reste occupé jusqu’à la fin, puis une nouvelle tentative doit fonctionner après échec.
- [ ] Focus visible clavier, hit-area cible >=48 dp, labels accessibles, annonces busy/error/saved, ordre lecteur d’écran.
- [ ] Zoom système/tailles de police, texte français long, anglais et chaînes de traduction sans troncature ni recouvrement.
- [ ] États formulaire normal, focus, erreur, disabled, loading; message API conservé et bouton accessible.
- [ ] Sélecteur date/heure vide et renseigné : invite et date formatée localisées FR/EN, libellé de bouton annoncé, état développé à l’ouverture, cible tactile minimale 48 dp; vérifier le dialogue natif sur Android et iOS.
- [ ] Champ de signature : actions et commandes du canvas dans la langue choisie, libellé accessible, contour lisible en clair/sombre, zone de dessin et boutons sans recouvrement avec clavier/formulaire; vérifier la sauvegarde et l’effacement sur Android/iOS.
- [ ] Enregistrement audio : une seule cible VoiceOver/TalkBack pour démarrer/arrêter, zone tactile ≥48 dp, distinction visuelle clair/sombre pendant l’enregistrement, lecture/pause/arrêt séparés; vérifier permission micro accordée/refusée et traitement busy sur Android/iOS.

## Non-régression métier/API

- [ ] Connexion email, LDAP, inscription autorisée, vérification, choix serveur et messages d’erreur restent connectés au service existant.
- [ ] Work Orders, transitions, tâches, exigences de clôture, permissions et entitlements inchangés.
- [ ] API/payloads, filtre, dates/timezone, devises, unités, coûts, uploads et notification inchangés.
- [ ] Vérifier les mappings status/priorité/asset avec leurs libellés et les couleurs spécifiques au thème.
- [ ] Serveur CMMS : vérifier en FR/EN l’erreur serveur inaccessible et adresse qui n’est pas une instance CMMS; confirmer que l’URL enregistrée, le contrôle `instance-config`, les réponses 401 et la navigation fonctionnent comme avant.
- [ ] Tests unitaires de tokens/mode/contraste; TypeScript et suites `test:mobile-regression`; export Expo Android/iOS puis builds natifs et installation réelle.

Chaque case doit inclure build, appareil, largeur, schéma, rôle et résultat observé. Un export de bundle valide seulement le bundling; il ne prouve pas le rendu natif ni l’intégrité de l’API.
