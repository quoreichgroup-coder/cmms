# QPM sur Android et iOS

Application mobile React Native du CMMS QPM.

## Installer sur Android

Le dernier APK déjà construit et validé dans le dépôt est `dist/QPM-1.0.54.apk`. La version source 1.0.55 est prête, mais son APK doit encore être construit. Le guide détaillé se trouve dans [INSTALLER-APK.md](INSTALLER-APK.md).

L’APK utilise par défaut `https://169-58-86-7.sslip.io/api/`. Le certificat HTTPS est émis et renouvelé automatiquement par Caddy. Si une ancienne adresse personnalisée est conservée après la mise à jour, ouvrez **Serveur personnalisé** depuis l’écran de connexion et choisissez **Réinitialiser**. Connectez-vous avec un compte utilisateur de l’entreprise ; le superadmin de plateforme est un compte technique et le parcours mobile client ne l’accepte pas. Les taps de notification ouvrent maintenant leur ressource après le démarrage et la restauration de session. La réception des push demande encore les credentials Firebase de l’entreprise. Au premier démarrage, le propriétaire de l’entreprise peut saisir la clé de licence depuis **Réglages → Licence de l’entreprise**.

## Reconstruire localement

Installez Node.js 22, Java 17 et Android SDK Platform 36, puis exécutez :

```sh
npm ci
npm run build:apk
```

Définissez `ANDROID_HOME` et `JAVA_HOME` si ces outils ne se trouvent pas dans leur emplacement par défaut. Définissez `API_URL` au moment du build pour utiliser un autre serveur. Le serveur public doit prendre en charge HTTPS.

Conservez `.build-tools/signing/` dans une sauvegarde chiffrée. Android exige le même certificat de signature pour installer une mise à jour sur l’application existante. Le fichier APK contient l’application et ne nécessite ni Expo Go ni une connexion au serveur de développement.

## Vérifications mobiles

```sh
npm run test:mobile-regression
npx tsc --noEmit
npx expo install --check
```

Sans configuration Firebase propre à l’environnement, les notifications push et les événements Firebase Analytics sont désactivés. La compilation iOS (IPA) nécessite macOS et Xcode; `app.config.ts` maintient les identifiants et versions iOS alignés.

## Préparer un build iOS

Un IPA signé ne peut être produit qu’avec un projet EAS lié et des identifiants Apple Developer valides. Depuis le compte Expo de l’entreprise, exécutez `npx eas-cli login`, puis `npx eas-cli init` pour créer ou lier le projet. La configuration dynamique lit son identifiant depuis `EAS_PROJECT_ID`; fournissez cette variable pendant la résolution Expo et les builds EAS. Ne mettez pas cet identifiant ni les credentials Apple dans Git. Le projet requiert EAS CLI 12 ou ultérieur pour sa gestion distante des numéros de build. Le profil `preview` produit une version interne; `production` prépare la distribution App Store/TestFlight et incrémente le numéro de build distant.

Depuis un Mac avec Xcode ou depuis EAS Build :

```sh
EAS_PROJECT_ID="identifiant-du-projet" npx eas-cli build --platform ios --profile preview
EAS_PROJECT_ID="identifiant-du-projet" npx eas-cli build --platform ios --profile production
```

Les deux commandes sont des choix alternatifs selon le type de distribution; la seconde nécessite le compte Apple Developer et les certificats/profils de signature de l’entreprise. N’exécutez pas `eas submit` avant d’avoir validé l’IPA et choisi une publication App Store Connect. Le build courant n’inclut pas de `GoogleService-Info.plist`; le démarrage fonctionne sans Firebase, mais les notifications push/Analytics Firebase iOS exigent les credentials de l’entreprise configurés comme fichier secret dans EAS. Vérifiez les credentials APNs de production avant de distribuer les notifications; le projet doit être lié à l’identifiant EAS pour obtenir les tokens Expo. Voir les guides officiels [EAS CLI](https://docs.expo.dev/eas/cli/), [versions distantes](https://docs.expo.dev/build-reference/app-versions/) et [capabilities iOS](https://docs.expo.dev/build-reference/ios-capabilities/).
