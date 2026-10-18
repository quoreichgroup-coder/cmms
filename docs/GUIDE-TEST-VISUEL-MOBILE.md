# Guide de test visuel QPM Mobile — APK 1.0.59 / préparation iOS

Le fichier `mobile/dist/QPM-1.0.59.apk` a été généré le 15 octobre 2026 (105 719 060 octets, SHA-256 `56ad9c1802c05665794e3694c51f149e36d370a398744442484e0df5045a8f54`, package `com.atlas.cmms`, `versionName` 1.0.59, `versionCode` 42). La signature de l’APK a été vérifiée. Ce build précède des changements consignés après sa génération, dont la conservation du compteur `METER`, la reprise NFC au retour du premier plan et les cibles tactiles minimales de 48 dp; utiliser le Dev Client Expo pour les tester ou reconstruire l’APK. L’installation et le test de la 1.0.59 sur téléphone restent à faire.

Ce guide sert à vérifier le parcours mobile avant le lot UI/UX Web. Les opérations de création, changement de statut, ajout de temps/pièces et clôture doivent être faites sur une instance et des comptes de test.

## État de la recette au 16 octobre 2026

Vérifications automatisées du dépôt au 16 octobre : `npm run test:mobile-regression` passe (**30/30 suites**), `npx tsc --noEmit --pretty false` passe, et l’export Expo `--platform all --no-minify` a terminé pour Web (**1 888 modules**), Android/Hermes (**2 224 modules**) et iOS/Hermes (**2 215 modules**). Ces contrôles prouvent la compilation TypeScript et la génération des bundles, pas le rendu ni le fonctionnement de la caméra/NFC sur appareil; les tests physiques listés ci-dessous restent à exécuter. Un bundle iOS réussi ne constitue pas un IPA signé. L’APK 1.0.59 ci-dessus est antérieur aux changements UI/UX documentés dans les lots récents; utiliser Expo Dev Client ou reconstruire l’APK pour les tester nativement.

La validation isolée du 3 octobre est consignée dans [`VALIDATION-PILOTE-2026-10-03.md`](VALIDATION-PILOTE-2026-10-03.md) : son scénario Web responsive, ses tests API et ses captures attestent uniquement les contrôles qui y sont listés, sur leur fixture dédiée. Depuis, les tests API ciblant `WorkOrderServiceTest` et `WorkOrderControllerTest` passent (304 tests, puis 6 tests ciblés après ajout du cas de réouverture interentreprise). Ces résultats ne remplacent pas l’intégration sur la base ou l’instance de recette.

Le dernier état transmis de l’instance Docker montrait l’API en redémarrage et `/api/health-check` en 502, avec des erreurs de validation de schéma. L’état courant de cette instance n’a pas été revérifié : le socket Docker n’est pas accessible depuis l’environnement de développement. **Ne commencez pas la recette métier tant que l’API ne démarre pas de façon stable et que le contrôle HTTP n’est pas réussi.**

Pour passer à la refonte UI/UX Web après la recette mobile, il reste à obtenir :

1. API et migrations vérifiées sur une base de test, sans boucle de redémarrage; réponses attendues sur `/api/health-check` et `/api/instance-config`.
2. Recette réelle demande → WO → affectation → exécution → clôture avec les comptes responsable et technicien, incluant les valeurs du tableau de bord comparées aux données API.
3. Vérification des permissions et de l’isolation entreprise, dont clôture par technicien, refus de réouverture sans droit, réouverture par responsable autorisé avec motif et consultation du journal.
4. Vérification de persistance après rechargement : tâches, temps, pièces, fichiers éventuels, signature/feedback et historique de clôture/réouverture.
5. Contrôle appareil Android des parcours terrain et accessibilité; iOS reste à faire après installation d’un build iOS interne.
6. Consignation des défauts acceptés ou bloquants. Le véritable aperçu PDF intégré avant émission est un élément du lot Web et peut être pris dans son pilote; l’émission officielle et le registre existants doivent rester distincts.

Le test visuel reste une ligne distincte de ces contrôles d’intégration. Ne marquez donc pas le MVP « prêt pour le Web » uniquement parce que les captures paraissent correctes ou que les tests unitaires passent.

## 1. Préparer l’environnement

Il faut un téléphone Android, l’APK 1.0.59 (ou le Dev Client Expo pour les changements plus récents), un compte de test de l’entreprise et une API de test répondant en HTTPS. Une personne responsable doit préparer un convoyeur de test, une demande de maintenance, un WO ouvert, un PM calendaire et, si disponible, un compteur et un PM compteur.

Avant de démarrer, demandez à l’administrateur de confirmer :

- l’URL complète de l’API de test (QPM inclut `/api`; l’URL par défaut actuellement configurée est `https://169-58-86-7.sslip.io/api`);
- un compte de technicien et un compte de responsable, sans utiliser le superadmin technique;
- les droits de lecture/édition et les fonctions/licences activées pour les tâches, pièces, fichiers, compteurs et signature;
- que les données utilisées sont jetables ou restaurables.

Ne faites pas les essais de création/modification/clôture sur des ordres réels. Ne partagez pas de mot de passe, jeton, signature ou donnée personnelle dans les captures.

## 2. Installer ou mettre à jour l’APK

Le fichier livré après reconstruction se trouve dans `mobile/dist/QPM-1.0.59.apk`. Pour installer par USB depuis le dépôt :

```sh
cd ~/Projet/cmms
adb devices
adb install -r mobile/dist/QPM-1.0.59.apk
```

Le téléphone doit autoriser le débogage USB et apparaître dans `adb devices`. Sinon, transférez l’APK depuis `mobile/dist/` dans le téléphone puis ouvrez-le avec le gestionnaire de fichiers pour l’installer. La mise à jour doit conserver le même certificat de signature que l’app installée. Si Android signale une incompatibilité de signature, arrêtez-vous et ne désinstallez pas l’app avant d’avoir sauvegardé les données locales et confirmé la clé de mise à jour.

## 3. Connecter l’app à l’API de test

Au premier lancement, choisissez **Serveur CMMS** et saisissez l’URL fournie par l’administrateur avec `https://` ou `http://` et le chemin `/api` si l’instance l’exige. Exemple de forme : `https://cmms-test.example/api`. Validez l’instance, puis connectez-vous avec le compte QPM de test.

Si l’écran devient blanc, si la requête tourne indéfiniment ou si un message 502 apparaît, notez l’heure et arrêtez les essais métier : il s’agit d’abord d’un problème de disponibilité API/proxy, pas d’un résultat visuel valide. Un écran de connexion chargé ne prouve pas que les routes métier répondent.

## 4. Parcours visuel à exécuter

Pour chaque étape, vérifiez l’état clair et sombre si disponible, l’état de chargement, les textes français, les cibles tactiles, le retour arrière et le résultat visible après l’action. Prenez une capture avant/après sans données sensibles.

### A. Authentification et thème

1. Lancer l’app à froid; vérifier le logo QPM, le fond, les champs, le bouton et l’absence de flash d’un thème incorrect.
2. Ouvrir le choix du serveur; valider le message URL invalide, l’instance inaccessible et le succès de validation.
3. Se connecter, fermer et relancer l’app; vérifier la restauration de session.
4. Dans **Profil → Réglages → Apparence**, tester **Clair**, **Sombre** puis **Système**. Changer l’apparence système, revenir à QPM et vérifier l’actualisation sans fermeture forcée.
5. Sur **Accueil**, confirmer en clair et sombre que « QPM · Accueil » et la date sont blanc opaque sur la carte bleue, alignés sur la même ligne, sans bande de fond claire derrière eux.

### B. Tableau de bord et données réelles

1. Comparer les compteurs de tableau de bord aux listes API de la même entreprise et du même filtre utilisateur.
2. Vérifier qu’un vrai zéro est affiché `0`, qu’une valeur indisponible n’est pas remplacée par zéro et que le rafraîchissement ne duplique pas les résultats.
3. Ouvrir chaque carte/action et vérifier qu’elle mène au bon filtre ou module.
4. Passer temporairement la police du téléphone à une grande taille et choisir le français; vérifier que `Priorité élevée` et les autres libellés longs restent complets et que les cartes s’agrandissent sans chevauchement. Revenir ensuite à la taille habituelle.
5. Avec un compte technicien qui peut consulter ses WO, provoquer l’échec de chargement des préférences utilisateur tout en laissant l’analytics accessible. Après le chargement des compteurs, ouvrir une carte KPI : elle doit rester activée et afficher uniquement les WO affectés à ce technicien. Pour un rôle qui voit tous les ordres, vérifier que les KPI ne deviennent activables qu’après résolution de la préférence qui fixe le filtre; aucune carte ne doit ouvrir une liste sans le filtre de rôle requis.

### C. Demande → WO → intervention

1. En compte responsable, ouvrir la demande préparée; vérifier son équipement, sa localisation, sa priorité, sa description et son état.
2. Utiliser les actions disponibles pour qualifier ou convertir la demande; contrôler qu’un seul WO est créé et que le lien vers la demande est conservé.
3. Affecter l’équipe/le technicien et l’échéance avec les options déjà proposées.
   Dans les sélecteurs d’équipe, technicien, fournisseur et client, parcourir un répertoire de test volumineux, rechercher un nom, sélectionner/désélectionner plusieurs entrées, tirer pour actualiser et vérifier l’état sans résultat. Vérifier que l’action **Ajouter** conserve le nombre de sélections et que l’invitation depuis le sélecteur de personnes reste accessible.
   Dans les formulaires proposant un sélecteur de catégorie, tester la recherche, la sélection simple et multiple, l’actualisation par glissement, le résultat vide et la création lorsqu’aucune catégorie n’est disponible. Simuler une erreur réseau au chargement puis utiliser **Réessayer**; si des catégories étaient déjà affichées, vérifier que l’avertissement reste visible au-dessus de la liste.
   Si le formulaire mobile propose une checklist, choisir un modèle de test et vérifier que ses tâches sont ajoutées une seule fois, dans leur ordre d’origine; tester la recherche, l’actualisation, l’erreur avec nouvelles tentatives et la conservation des modèles en cache pendant une panne de rafraîchissement. Pour une tâche manuelle de type choix multiple, saisir au moins trois options, modifier puis supprimer la deuxième ou la troisième et vérifier que chaque valeur reste dans son champ et que le curseur ne saute pas vers une autre ligne. Avec le clavier ouvert sur le dernier champ, vérifier qu’il reste visible et que les actions Ajouter/Supprimer répondent au premier tap; vérifier également que le défilement ferme le clavier sans bloquer les contrôles. Avec TalkBack/VoiceOver, vérifier l’annonce « Option 1/2/3 », « Supprimer l’option N » et le bouton Ajouter; réorganiser la police à grande taille puis contrôler le défilement jusqu’aux dernières options. Ces changements sont postérieurs à l’APK 1.0.59 : utiliser le Dev Client ou un APK reconstruit.
   Créer aussi une tâche `METER`, sélectionner un compteur de test, enregistrer le WO puis le recharger. Vérifier que le compteur choisi reste associé à la tâche; changer le type de tâche avant l’enregistrement doit effacer l’association devenue inutile. Avec la version 1.0.59, ce contrôle nécessite le Dev Client ou un APK reconstruit après le correctif.
4. En compte technicien, ouvrir le WO depuis **Mes ordres**; vérifier identifiant, statut, priorité, équipement et emplacement.
   Tester aussi deux WO de recette : l’un avec technicien et prestataire assignés, l’autre avec prestataire seul. Le détail doit afficher chaque groupe sous son libellé distinct, même sans technicien; leurs noms sont du texte consultable, pas de faux boutons.
   À l’ouverture des listes WO et demandes, vérifier que les filtres par défaut n’affichent aucun compteur « sélectionné » fugitif; ouvrir chaque filtre et confirmer que seules les options actives sont cochées.
   Dans la liste, comparer trois WO de test : une échéance future à plus de deux jours doit rester neutre, une échéance dans les deux jours doit porter le badge « Échéance imminente » en avertissement, et une échéance passée doit afficher « En retard » en erreur. Un WO `COMPLETE` reste neutre même si sa date est passée; vérifier les mêmes cas en clair/sombre et sur écran étroit.
5. Exécuter une tâche, ajouter une note, un temps et, si permis, une pièce ou une photo de test. Vérifier le retour succès/erreur et revenir à la fiche sans perdre le contexte. Ouvrir ensuite l’écran Tâches d’un WO terminé puis d’un WO ouvert en lecture seule : valeurs, notes, photos et actions de réessai doivent être désactivées, avec un message explicite, tandis que les tâches restent consultables. Pour un WO actif modifiable, ces contrôles restent utilisables. Ce correctif est postérieur à l’APK 1.0.59; le vérifier dans Expo ou un APK reconstruit.
   Dans les commentaires du WO, contrôler que les cartes imbriquées, suggestions de mention, champs de modification et pièces jointes gardent des coins QPM cohérents, avec texte et bordures lisibles en clair/sombre sur petit écran.
   Pour une sous-tâche, choisir successivement `OPEN`, `IN_PROGRESS`, `ON_HOLD`, puis `COMPLETE` : seuls les trois premiers états doivent rester en attente dans la progression et empêcher la clôture si « tâches terminées » est obligatoire; `COMPLETE` doit faire avancer la jauge. Une inspection `FAIL` reste un résultat renseigné, distinct d’une sous-tâche ouverte.
   Pour une tâche `NUMBER` ou `METER`, vérifier que le bouton ± fait au moins 48 dp, est annoncé « Inverser le signe » par TalkBack/VoiceOver et inverse le signe sans perdre les décimales. Ce contrôle utilise le Dev Client ou un APK reconstruit après le correctif tactile.
   Avec TalkBack/VoiceOver, vérifier que l’action Photo annonce son état désactivé si la tâche est en lecture seule, si la sélection/envoi est en cours ou si la licence manque; le motif de licence ne doit pas être annoncé lorsque l’action est bloquée pour lecture seule.
   Sur le chronomètre, vérifier en thème clair et sombre que **Démarrer** (bleu) et **Arrêter** (rouge) sont lisibles, que la durée reste lisible lorsque le bouton est étendu, puis démarrer et arrêter un seul chronomètre de test. Comparer le temps affiché au temps renvoyé par le détail WO après rechargement.
6. Tester un champ obligatoire manquant à la clôture. L’app doit nommer l’élément bloquant. Ensuite, configurer ou choisir un WO de test conforme et clôturer une seule fois.
7. Répéter sur un WO de test avec feedback et/ou signature requis. Vérifier la validation, l’indicateur d’envoi, l’absence de double requête, le retour en cas d’échec et la persistance du résultat après rechargement.
   Pendant que le formulaire de clôture est ouvert, vérifier qu’il identifie sans ambiguïté le WO (numéro et titre) et l’équipement associé, s’il y en a un. Comparer ces informations avec la fiche précédente; le formulaire doit rester compréhensible même si la fiche d’origine n’est plus visible. Pour la confirmation simple sans feedback/signature requis, vérifier de même l’identifiant, le titre et l’équipement avant de valider; tester avec un WO avec puis sans équipement et confirmer que le WO sélectionné est bien celui qui passe en lecture seule.
   La saisie/arrêt du temps enregistre le travail réel; elle ne clôture pas l’ordre. La clôture QPM reste une action séparée au niveau du WO. SAP distingue aussi la confirmation partielle/finale au niveau opération : ne pas attendre ces statuts opérationnels dans QPM sans évolution dédiée de son modèle/API.
8. Depuis le compte technicien, vérifier qu’un WO `COMPLETE` est verrouillé contre les modifications et transitions normales. Essayer un statut depuis un compte en lecture seule; aucune mutation interdite ne doit être acceptée.
9. Avec un technicien assigné, tenter de rouvrir un WO terminé : l’action doit être absente ou l’API doit refuser l’accès. Avec un responsable qui possède le droit dédié de réouverture, rouvrir un WO de test avec un motif; vérifier le statut actif, le message de succès et l’événement avec acteur/date/motif dans l’historique. Réessayer avec un motif vide et vérifier le refus sans changement.
10. Recharger le détail après réouverture. Si aucun nouveau feedback ou signature n’est saisi, vérifier que les valeurs du WO sont encore présentes. Vérifier dans l’historique visible chaque transition, son acteur/date et le motif de réouverture. Après une nouvelle clôture, un nouvel événement doit apparaître et la date/auteur actifs doivent correspondre à cette dernière clôture. La conservation des anciennes valeurs dans `work_order_aud` doit être vérifiée côté base; l’app ne propose pas encore de lecteur des révisions Envers.

Lors d’un test contrôlé de création d’un WO avec modèles de tâches, vérifiez aussi le cas où l’attachement des tâches échoue après création du WO. L’application doit signaler la création partielle et ouvrir la fiche du WO existant. Vérifiez les tâches avant toute correction manuelle; ne renvoyez pas le formulaire, afin d’éviter un doublon.

Pour contrôler les données obligatoires de clôture, utiliser un WO de test dont les champs requis comprennent pièces, coûts, temps ou fichiers. Simuler une coupure réseau ou un refus de lecture pendant le chargement d’une de ces rubriques. La clôture doit rester bloquée avec une erreur récupérable, sans présenter les données inconnues comme simplement absentes. Utiliser **Réessayer**, attendre le chargement réussi, puis vérifier que l’application distingue une donnée réellement manquante d’une lecture qui avait échoué. Répéter sur les commentaires si la configuration exige un fichier ou un commentaire.

### D. Actif, emplacement et PM

Avant les détails équipement, ouvrir **Scanner** depuis l’Accueil. Si l’état réseau est encore en cours de détection au démarrage, l’action doit rester disponible; une absence de connexion confirmée doit afficher le message hors ligne existant. Vérifier que les choix NFC et code-barres/QR ont chacun une icône et une courte instruction; demander à TalkBack/VoiceOver de les annoncer comme boutons avec leur aide. Dans le lecteur QR, vérifier que le texte « Démarrage de la caméra… » s’efface dès que l’aperçu est prêt et que le flux vidéo, le cadre de visée et l’indication de scan sont visibles dans la modale. Si l’aperçu n’apparaît pas sous 12 secondes, l’écran doit proposer **Réessayer**, **Ouvrir les paramètres** et **Retour**; si la permission y est accordée, le lecteur doit se remonter au retour dans QPM. Noter si l’écran indique un refus de permission ou une erreur d’aperçu malgré une permission accordée; les logs natifs sont nécessaires pour caractériser un échec matériel. Tester aussi le passage de l’app en arrière-plan puis son retour : l’image doit reprendre et aucun scan arrivé en retard ne doit fermer le lecteur. Scanner un QR connu et confirmer l’ouverture du bon équipement. Scanner ensuite un identifiant inconnu avec un compte **sans** droit de création : aucune proposition de création ne doit apparaître. Refaire le test avec un compte autorisé : seule une réponse API 404 confirmée peut proposer la création; une panne réseau ou un refus 403 doit afficher une erreur et ne jamais être traité comme un équipement absent. Sur Android, le lecteur NFC doit indiquer de rapprocher et garder le téléphone près du tag. Tester au moins un tag NDEF et un tag UID non formaté NDEF. Pendant qu’une lecture est ouverte, mettre QPM en arrière-plan, attendre quelques secondes puis revenir : la session NFC doit être annulée pendant l’arrière-plan et le lecteur doit reprendre au premier plan sans lancer deux lectures ni afficher une alerte tardive. Fermer ensuite le lecteur pendant une lecture et recommencer avec le NFC désactivé dans les réglages. Vérifier la résolution de l’équipement et le message explicatif si le NFC est désactivé. Sur iOS natif, l’action NFC doit aussi apparaître; tester un tag MIFARE ou ISO 15693 compatible, l’annulation et la résolution du tag, ainsi que le même cycle arrière-plan/premier plan. Avec un compte autorisé à créer/modifier les actifs et l’entitlement NFC/code-barres actif, ouvrir le formulaire d’actif et vérifier que le champ NFC est visible sur iOS et Android; le toucher doit lancer le même lecteur natif puis remplir l’identifiant. Sur Web, ce champ natif doit rester masqué et QR/code-barres doit rester disponible. Une valeur scannée est un identifiant de recherche, pas une autorisation d’accès.

Dans ce formulaire, vérifier que les actions NFC et code-barres/QR sont des boutons encadrés avec une icône visible, que la valeur lue apparaît sous le bouton, que la cible est facile à toucher et que le lecteur d’écran annonce le type d’identifiant, sa valeur et l’action. Après un scan réussi, le lecteur doit se fermer, remplir le champ et laisser le formulaire parent ouvert. Pendant une sauvegarde, confirmer que les deux boutons sont désactivés.

Pour l’appareil photo intégré aux pièces jointes, l’ouvrir depuis un formulaire autorisé. Vérifier que la caméra apparaît derrière les commandes de prise de vue (sans avertissement Expo indiquant des enfants de `CameraView`), que le message de démarrage disparaît quand l’aperçu est prêt, et que le déclencheur reste désactivé avant cet instant. Fermer la modale puis la rouvrir : le flux précédent ne doit pas rester actif. Mettre l’application en arrière-plan pendant l’aperçu puis la reprendre; attendre que la caméra soit prête avant de prendre une photo. Tester la fermeture avec le bouton et le bouton Retour Android, puis un échec natif et **Réessayer**.

1. Ouvrir le convoyeur; vérifier hiérarchie, emplacement, WO récents, compteurs et dernières valeurs.
   Dans la fiche, vérifier que le technicien principal et l’emplacement sont annoncés comme liens par TalkBack/VoiceOver, qu’ils offrent une cible d’au moins 44 dp et qu’ils ouvrent toujours les fiches correspondantes.
   Dans une hiérarchie d’emplacements, vérifier que le bouton d’ouverture des enfants nomme aussi son emplacement parent et que le lecteur d’écran annonce son aide de navigation.
2. Ouvrir le PM calendaire et un PM compteur; contrôler que date d’occurrence et cible compteur sont étiquetées différemment.
   Depuis un formulaire autorisé à sélectionner un compteur, ouvrir le sélecteur avec plusieurs compteurs de test, vérifier la recherche et la sélection simple/multiple selon le formulaire, puis provoquer une erreur réseau et utiliser **Réessayer**. Une erreur ne doit pas être présentée comme une liste réellement vide.
3. Ouvrir le registre d’appels, parcourir la pagination, consulter un appel puis ouvrir son WO lié.
4. Tester les états sans compteur, sans relevé, sans ordre lié, erreur et permission refusée.
5. Ne pas tenter d’éditer un plan depuis mobile si l’écran indique une consultation seule; créer/configurer les plans sur le Web existant.
6. Ouvrir les fiches d’une Pièce et d’un Compteur avec un compte lecture seule puis un compte avec droit d’édition ou de suppression. En lecture seule, vérifier que le menu « plus d’options » n’apparaît pas; avec une action permise, il doit apparaître comme une seule cible annoncée et n’afficher que les actions autorisées.
7. Répéter ce contrôle sur les fiches Actif, Emplacement, Fournisseur et Client. Un Emplacement peut aussi proposer la création d’un WO ou d’un actif si le rôle possède le droit correspondant; sans aucune action disponible, son menu doit rester absent. Chaque menu doit être une cible unique pour VoiceOver/TalkBack.

Pour les pièces jointes des fiches **Actif, Emplacement et Pièce**, demander la suppression d’un fichier de test, puis appuyer deux fois rapidement sur **Supprimer**. Une seule requête doit être envoyée; la progression doit être annoncée. Simuler ensuite un échec réseau : la confirmation doit rester ouverte et un nouvel essai doit être possible. Après succès, elle se ferme et un seul retour de succès apparaît.

### E. PDF / prévisualisation avant impression

1. Depuis le détail WO, générer et télécharger le PDF de test; vérifier qu’il s’ouvre sur le téléphone et que l’équipement, le statut, les tâches, les temps et les options incluses sont corrects.
2. Depuis le Web existant, ouvrir **WO → Rapport PDF**, comparer les options choisies et le fichier téléchargé. Le bouton actuellement libellé « Aperçu / imprimer » télécharge le PDF; il ne l’ouvre pas dans une prévisualisation intégrée.
3. Ouvrir le PDF téléchargé et vérifier ses pages et son contenu avant toute émission d’archive. L’action d’émission est séparée, mais QPM ne bloque pas son usage avant inspection; ne pas archiver de document officiel pendant le test pilote. Noter cet écart pour le lot Web.

### F. Notifications et actualisation paginée

1. Se connecter avec un rôle Demandeur ayant plus de 15 notifications non lues. Vérifier que les badges Notifications de l’Accueil et de Demandes affichent le total serveur, même si la liste visible est limitée à une page. Ouvrir Notifications, marquer des éléments comme lus ou utiliser « Tout lire », puis revenir : le total doit se recalculer à la reprise de l’écran. En cas d’échec réseau du comptage sur l’Accueil, l’erreur doit être annoncée avec une action Réessayer et aucun zéro erroné ne doit être présenté.
2. Sur l’Accueil et dans Demandes, avec VoiceOver/TalkBack, vérifier que la cloche annonce « Notifications » et le nombre non lu comme une action unique; le badge visuel ne doit pas être annoncé séparément. Tester avec un compte ayant des notifications non lues puis zéro notification non lue. Dans Demandes, activer séparément l’icône Paramètres et confirmer qu’elle ouvre bien Paramètres.
3. Préparer plus de 15 notifications, atteindre le chargement de la page suivante, puis déclencher immédiatement l’actualisation par glissement.
4. Vérifier que le résultat rafraîchi remplace la première page, que l’ancienne page tardive ne s’ajoute pas au nouveau résultat et que le chargement paginé peut reprendre ensuite.
5. Répéter en faisant échouer l’ancienne page après la réussite du rafraîchissement : aucune erreur de pagination tardive ne doit apparaître sous les résultats rafraîchis.

### G. Recherche et pagination sous réseau ralenti

Dans les listes **WO, Demandes, Actifs, Emplacements, Compteurs, Pièces, Équipes/Personnes, Clients/Fournisseurs et Maintenance préventive**, ralentir le réseau si l’outil de test le permet. Saisir une recherche A puis rapidement une recherche B; attendre les deux réponses et vérifier que seuls les résultats de B restent affichés. Lancer ensuite une page suivante puis tirer pour actualiser avant la fin de la pagination : les anciennes lignes ne doivent pas se rajouter à la première page rafraîchie, son indicateur doit se terminer correctement et une nouvelle pagination doit rester possible. Répéter en faisant échouer la requête ancienne après la réponse récente; son erreur ne doit pas remplacer l’état courant. Comparer également les états de chargement, erreur relançable et absence réelle de résultat.

Dans les listes **WO** et **Demandes**, lancer une recherche, ouvrir le clavier, puis utiliser **Effacer recherche et filtres** dans l’état sans résultat. Sans fermer le clavier ni quitter le champ, saisir immédiatement une nouvelle recherche et vérifier que les résultats changent après le délai normal d’une seconde dans les deux listes.

### H. Envoi d’un avis sans duplication

Depuis l’invitation à évaluer QPM, ouvrir l’écran de retour, saisir un texte de test puis appuyer deux fois rapidement sur **Envoyer** pendant une connexion lente. Vérifier qu’un seul avis est créé, qu’un seul message de succès apparaît et que l’écran revient une fois à la vue précédente. En cas d’échec réseau, vérifier le message d’erreur puis qu’un nouvel appui après la fin de la requête peut réessayer.

### I. Pièces jointes — état vide et lecteur d’écran

Ouvrir une fiche Actif, Emplacement ou Pièce sans pièce jointe. Vérifier que l’icône de document est décorative : TalkBack/VoiceOver ne doit pas l’annoncer comme bouton ou action, et le lecteur d’écran doit lire le texte expliquant qu’il n’y a aucun fichier. Avec une fiche qui contient des fichiers, vérifier séparément les actions existantes de consultation et de suppression.

## 5. Captures et relevé de résultat

Nommer les captures `MOBILE-<module>-<état>-<clair|sombre>-<appareil>.png` (ex. `MOBILE-WO-detail-clair-Pixel.png`). Pour chaque anomalie, noter : appareil/version OS, version QPM, compte/permission (sans identifiant sensible), route/écran, action juste avant, résultat attendu, résultat observé et si le problème bloque le travail.

| Parcours                             | Réussi / Échec / Non testé | Capture | Données persistées vérifiées | Gravité / note |
| ------------------------------------ | -------------------------- | ------- | ---------------------------- | -------------- |
| Auth + serveur                       |                            |         |                              |                |
| Thèmes clair/sombre/système          |                            |         |                              |                |
| Dashboard vs données API             |                            |         |                              |                |
| Demande → WO                         |                            |         |                              |                |
| Affectation → exécution              |                            |         |                              |                |
| Tâches/temps/pièces/fichiers         |                            |         |                              |                |
| Clôture sans/avec exigences          |                            |         |                              |                |
| Réouverture avec/sans droit et motif |                            |         |                              |                |
| Journal des cycles de clôture        |                            |         |                              |                |
| Actif/emplacement/compteurs          |                            |         |                              |                |
| PM/appels/WO généré                  |                            |         |                              |                |
| Rapport PDF + aperçu avant émission  |                            |         |                              |                |
| Recherche/pagination réseau ralenti  |                            |         |                              |                |
| Envoi d’avis double appui            |                            |         |                              |                |

Ne marquez un parcours comme réussi qu’après avoir vérifié la réponse UI **et** le résultat enregistré dans la même instance de test. Pour les droits, vérifiez aussi le refus côté serveur; masquer un bouton ne suffit pas.

## 6. iOS

Ce workspace est sur Linux; il ne peut pas produire localement un IPA signé avec Xcode. Le projet déclare le plugin `react-native-nfc-manager`, le texte d’usage Core NFC et l’entitlement de lecture TAG. Le parcours iOS choisit les technologies MIFARE/ISO 15693; son fonctionnement réel reste à vérifier avec un iPhone compatible et un profil Apple qui autorise cette capacité. Le projet contient le profil EAS `preview`, mais un IPA interne exige un projet Expo lié, un jeton Expo valide et des identifiants de signature Apple configurés. Une fois ces prérequis disponibles, lancer le build EAS depuis le dépôt, installer l’IPA sur un iPhone via le canal interne/TestFlight et exercer les parcours. L’export JavaScript iOS réussi ne constitue pas une archive signée ni une preuve de fonctionnement NFC.

Pour le rechargement visuel rapide, utiliser la build de développement QPM Dev et Metro (`npm run start:lan` sur le même réseau, ou le tunnel documenté dans `mobile/README.md` sur un réseau distant). La build Dev et l’APK de production sont deux applications distinctes; Expo Go ne remplace pas le client natif QPM.

Pour produire le build iOS interne depuis le dépôt après configuration des credentials dans EAS, lancer depuis `mobile/` : `npx eas-cli@latest build --profile preview --platform ios`. Suivre l’état du build sur le tableau de bord Expo, puis installer l’IPA via le canal interne provisionné (TestFlight ou distribution ad hoc). Sans certificat/profil Apple configuré, le bundle iOS exporté ne constitue pas une application installable.

### J. Cibles tactiles et filtres — lot Expo actuel

Dans les écrans **Ordres de travail** et **Demandes**, toucher les filtres de statut/priorité et le filtre **Mon travail** lorsqu’il est disponible, sur un téléphone étroit puis sur un grand écran. Vérifier qu’ils restent faciles à toucher avec le pouce, que les filtres inactifs se distinguent du fond grâce à leur contour en clair/sombre, et qu’ils ne se chevauchent pas lorsque la police système est agrandie. Les états actif/inactif des filtres doivent rester visibles même sans se fier uniquement à la couleur. Le filtre **Mon travail** doit annoncer son nom complet et son état coché/décoché dans TalkBack/VoiceOver. Vérifier également les commandes de scan du formulaire Actif, les liens d’identité Asset 360, l’action principale de l’accueil, le sélecteur de langue et les commandes de la visionneuse d’image : leur cible doit atteindre au moins 48 dp. Dans les formulaires courants, vérifier que le bouton principal d’envoi garde une hauteur de 56 dp sans masquer le dernier champ quand le clavier est ouvert. Ce lot est présent dans le code et les bundles Expo Android/iOS, mais pas dans l’APK 1.0.59.

### K. Action Notifications — « Tout marquer comme lu »

Ouvrir Notifications avec au moins une notification non lue. Vérifier que l’action en haut à droite reste entièrement touchable (cible minimale 48 dp) sur écran étroit et avec une grande taille de police, puis confirmer qu’elle passe à l’état occupé jusqu’à la réponse et que les notifications sont marquées comme lues. Vérifier également l’annonce TalkBack/VoiceOver du libellé et de l’état désactivé. Répéter sans notification non lue : l’action ne doit pas être affichée. Pour vérifier le total agrégé, préparer plus de 15 notifications dont au moins une non lue en dehors de la première page; l’action doit quand même apparaître. Après l’avoir utilisée, tirer pour actualiser et confirmer que le total et l’état restent synchronisés. Provoquer un échec réseau du comptage : une bannière relançable doit apparaître, et le retry doit recalculer le total après rétablissement du réseau. Le changement de taille de cible ne modifie pas le traitement serveur; l’APK 1.0.59 ne le contient pas.
