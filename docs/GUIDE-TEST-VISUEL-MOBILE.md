# Guide de test visuel QPM Mobile — APK 1.0.58 / préparation iOS

L’APK 1.0.58 a été rebâti le 13 octobre 2026 avec le correctif de contraste de l’en-tête de l’accueil en thèmes clair et sombre. Taille : 105 631 132 octets. SHA-256 : `701a48b030da01a6fc2c9f3f84b240b2ea4fa5f5153287642b6d2d2d59b00209`. Il conserve le package `com.atlas.cmms`, le `versionCode` 41 et le certificat de signature précédent (`a31877eaf8a0490bae0af0915f9eeff8153fd00a322e40bfbdebcf84204cd4e5`); la vérification APK Signature Scheme v2 réussit.

Ce guide sert à vérifier le parcours mobile avant le lot UI/UX Web. Les opérations de création, changement de statut, ajout de temps/pièces et clôture doivent être faites sur une instance et des comptes de test.

## 1. Préparer l’environnement

Il faut un téléphone Android, l’APK 1.0.58, un compte de test de l’entreprise et une API de test répondant en HTTPS. Une personne responsable doit préparer un convoyeur de test, une demande de maintenance, un WO ouvert, un PM calendaire et, si disponible, un compteur et un PM compteur.

Avant de démarrer, demandez à l’administrateur de confirmer :

- l’URL complète de l’API de test (QPM inclut `/api`; l’URL par défaut actuellement configurée est `https://169-58-86-7.sslip.io/api`);
- un compte de technicien et un compte de responsable, sans utiliser le superadmin technique;
- les droits de lecture/édition et les fonctions/licences activées pour les tâches, pièces, fichiers, compteurs et signature;
- que les données utilisées sont jetables ou restaurables.

Ne faites pas les essais de création/modification/clôture sur des ordres réels. Ne partagez pas de mot de passe, jeton, signature ou donnée personnelle dans les captures.

## 2. Installer ou mettre à jour l’APK

Le fichier livré après reconstruction se trouvera dans `mobile/dist/QPM-1.0.58.apk`. Pour installer par USB depuis le dépôt :

```sh
cd ~/Projet/cmms
adb devices
adb install -r mobile/dist/QPM-1.0.58.apk
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

### C. Demande → WO → intervention

1. En compte responsable, ouvrir la demande préparée; vérifier son équipement, sa localisation, sa priorité, sa description et son état.
2. Utiliser les actions disponibles pour qualifier ou convertir la demande; contrôler qu’un seul WO est créé et que le lien vers la demande est conservé.
3. Affecter l’équipe/le technicien et l’échéance avec les options déjà proposées.
4. En compte technicien, ouvrir le WO depuis **Mes ordres**; vérifier identifiant, statut, priorité, équipement et emplacement.
5. Exécuter une tâche, ajouter une note, un temps et, si permis, une pièce ou une photo de test. Vérifier le retour succès/erreur et revenir à la fiche sans perdre le contexte.
   Pour une sous-tâche, choisir successivement `OPEN`, `IN_PROGRESS`, `ON_HOLD`, puis `COMPLETE` : seuls les trois premiers états doivent rester en attente dans la progression et empêcher la clôture si « tâches terminées » est obligatoire; `COMPLETE` doit faire avancer la jauge. Une inspection `FAIL` reste un résultat renseigné, distinct d’une sous-tâche ouverte.
   Avec TalkBack/VoiceOver, vérifier que l’action Photo annonce son état désactivé si la tâche est en lecture seule, si la sélection/envoi est en cours ou si la licence manque; le motif de licence ne doit pas être annoncé lorsque l’action est bloquée pour lecture seule.
   Sur le chronomètre, vérifier en thème clair et sombre que **Démarrer** (bleu) et **Arrêter** (rouge) sont lisibles, que la durée reste lisible lorsque le bouton est étendu, puis démarrer et arrêter un seul chronomètre de test. Comparer le temps affiché au temps renvoyé par le détail WO après rechargement.
6. Tester un champ obligatoire manquant à la clôture. L’app doit nommer l’élément bloquant. Ensuite, configurer ou choisir un WO de test conforme et clôturer une seule fois.
7. Répéter sur un WO de test avec feedback et/ou signature requis. Vérifier la validation, l’indicateur d’envoi, l’absence de double requête, le retour en cas d’échec et la persistance du résultat après rechargement.
   La saisie/arrêt du temps enregistre le travail réel; elle ne clôture pas l’ordre. La clôture QPM reste une action séparée au niveau du WO. SAP distingue aussi la confirmation partielle/finale au niveau opération : ne pas attendre ces statuts opérationnels dans QPM sans évolution dédiée de son modèle/API.
8. Essayer un statut depuis un compte en lecture seule; aucun contrôle ne doit permettre une mutation interdite.

Lors d’un test contrôlé de création d’un WO avec modèles de tâches, vérifiez aussi le cas où l’attachement des tâches échoue après création du WO. L’application doit signaler la création partielle et ouvrir la fiche du WO existant. Vérifiez les tâches avant toute correction manuelle; ne renvoyez pas le formulaire, afin d’éviter un doublon.

Pour contrôler les données obligatoires de clôture, utiliser un WO de test dont les champs requis comprennent pièces, coûts, temps ou fichiers. Simuler une coupure réseau ou un refus de lecture pendant le chargement d’une de ces rubriques. La clôture doit rester bloquée avec une erreur récupérable, sans présenter les données inconnues comme simplement absentes. Utiliser **Réessayer**, attendre le chargement réussi, puis vérifier que l’application distingue une donnée réellement manquante d’une lecture qui avait échoué. Répéter sur les commentaires si la configuration exige un fichier ou un commentaire.

### D. Actif, emplacement et PM

1. Ouvrir le convoyeur; vérifier hiérarchie, emplacement, WO récents, compteurs et dernières valeurs.
2. Ouvrir le PM calendaire et un PM compteur; contrôler que date d’occurrence et cible compteur sont étiquetées différemment.
3. Ouvrir le registre d’appels, parcourir la pagination, consulter un appel puis ouvrir son WO lié.
4. Tester les états sans compteur, sans relevé, sans ordre lié, erreur et permission refusée.
5. Ne pas tenter d’éditer un plan depuis mobile si l’écran indique une consultation seule; créer/configurer les plans sur le Web existant.

### E. PDF / prévisualisation avant impression

1. Depuis le détail WO, générer et télécharger le PDF de test; vérifier qu’il s’ouvre sur le téléphone et que l’équipement, le statut, les tâches, les temps et les options incluses sont corrects.
2. Depuis le Web existant, ouvrir **WO → Rapport PDF**, comparer les options choisies et le fichier téléchargé. Le bouton actuellement libellé « Aperçu / imprimer » télécharge le PDF; il ne l’ouvre pas dans une prévisualisation intégrée.
3. Ouvrir le PDF téléchargé et vérifier ses pages et son contenu avant toute émission d’archive. L’action d’émission est séparée, mais QPM ne bloque pas son usage avant inspection; ne pas archiver de document officiel pendant le test pilote. Noter cet écart pour le lot Web.

## 5. Captures et relevé de résultat

Nommer les captures `MOBILE-<module>-<état>-<clair|sombre>-<appareil>.png` (ex. `MOBILE-WO-detail-clair-Pixel.png`). Pour chaque anomalie, noter : appareil/version OS, version QPM, compte/permission (sans identifiant sensible), route/écran, action juste avant, résultat attendu, résultat observé et si le problème bloque le travail.

| Parcours                            | Réussi / Échec / Non testé | Capture | Données persistées vérifiées | Gravité / note |
| ----------------------------------- | -------------------------- | ------- | ---------------------------- | -------------- |
| Auth + serveur                      |                            |         |                              |                |
| Thèmes clair/sombre/système         |                            |         |                              |                |
| Dashboard vs données API            |                            |         |                              |                |
| Demande → WO                        |                            |         |                              |                |
| Affectation → exécution             |                            |         |                              |                |
| Tâches/temps/pièces/fichiers        |                            |         |                              |                |
| Clôture sans/avec exigences         |                            |         |                              |                |
| Actif/emplacement/compteurs         |                            |         |                              |                |
| PM/appels/WO généré                 |                            |         |                              |                |
| Rapport PDF + aperçu avant émission |                            |         |                              |                |

Ne marquez un parcours comme réussi qu’après avoir vérifié la réponse UI **et** le résultat enregistré dans la même instance de test.

## 6. iOS

Ce workspace est sur Linux; il ne peut pas produire localement un IPA signé avec Xcode. Le projet contient le profil EAS `preview`, mais un IPA interne exige un projet Expo lié, un jeton Expo valide et des identifiants de signature Apple configurés. Une fois ces prérequis disponibles, le build doit être lancé par EAS Build depuis le dépôt; installer l’IPA sur un iPhone de test via le canal interne/TestFlight et exécuter les mêmes parcours. Jusqu’à cette installation, le test iOS est « non vérifié » et ne doit pas être déduit de l’export Expo iOS.

Pour le rechargement visuel rapide, utiliser la build de développement QPM Dev et Metro (`npm run start:lan` sur le même réseau, ou le tunnel documenté dans `mobile/README.md` sur un réseau distant). La build Dev et l’APK de production sont deux applications distinctes; Expo Go ne remplace pas le client natif QPM.

Pour produire le build iOS interne depuis le dépôt après configuration des credentials dans EAS, lancer depuis `mobile/` : `npx eas-cli@latest build --profile preview --platform ios`. Suivre l’état du build sur le tableau de bord Expo, puis installer l’IPA via le canal interne provisionné (TestFlight ou distribution ad hoc). Sans certificat/profil Apple configuré, le bundle iOS exporté ne constitue pas une application installable.
