# QPM sur Android et iOS

Application mobile React Native du CMMS QPM.

## Prévisualiser l’interface sans reconstruire ni installer l’APK

Pour vérifier rapidement les écrans et interactions dans un navigateur avec React Native Web :

```sh
cd mobile
npm run web -- --localhost --port 8082
```

Expo démarre le bundle Web sur `http://localhost:8082` ; dans VS Code, transférez le port 8082 (onglet **Ports**) puis ouvrez l’adresse locale affichée. Utilisez l’émulation téléphone/tablette du navigateur pour contrôler les dimensions. Ce mode valide la présentation Web responsive, mais ne remplace pas un test sur le runtime natif Android/iOS.

Si Expo signale `EACCES` lors du nettoyage de `/tmp/metro-cache` (par exemple après un lancement précédent avec `sudo`), créez un cache temporaire privé au projet et relancez le Web :

```sh
mkdir -p .build-tools/expo-tmp
TMPDIR="$PWD/.build-tools/expo-tmp" npm run web -- --localhost --port 8082 --clear
```

Pour le rechargement à chaud sur un téléphone dans le runtime natif, QPM utilise `expo-dev-client` et le lancement `npx expo start --dev-client`. Il faut disposer une première fois d’un build de développement QPM installé sur le téléphone ; ensuite, les modifications TypeScript/JavaScript et UI se chargent depuis Expo sans reconstruire l’APK à chaque changement. Le profil EAS `development` est déjà configuré dans `eas.json`.

### Test natif avec Expo depuis le serveur de développement

Une build de développement Android séparée peut être créée avec `npm run build:dev-apk` (package `com.atlas.cmms.dev`, ARM64). Le suffixe `.dev` permet de garder QPM de production à côté. Avec le téléphone branché et le débogage USB autorisé, construisez puis installez-la ainsi :

```sh
npm run build:dev-apk
adb install -r dist/QPM-1.0.59-dev.apk
```

On peut aussi transférer le fichier sur le téléphone puis l’ouvrir pour l’installer. Après cette installation initiale, les changements TypeScript/JavaScript et UI se rechargent depuis Metro, sans reconstruire ni retélécharger d’APK.

Pour démarrer Expo depuis un serveur distant ou un réseau où le téléphone ne peut pas joindre directement l’ordinateur, lancez `npm run start:tunnel` et scannez le QR code avec l’application QPM Dev. `@expo/ngrok` est une dépendance locale du projet : Expo ne doit pas tenter une installation globale nécessitant `sudo`. Sur un réseau local accessible au téléphone, utilisez `npm run start:lan` à la place. N’utilisez pas Expo Go pour ce projet natif.

Sur Linux, Metro exclut déjà les sorties Gradle volumineuses pour éviter de consommer les watchers du système. Si le cache global `/tmp/metro-cache` donne une erreur `EACCES`, ou si vous voulez isoler le cache de développement du cache créé par `sudo`, utilisez un répertoire local ignoré par Git :

```sh
mkdir -p .build-tools/expo-tmp
TMPDIR="$PWD/.build-tools/expo-tmp" npm run start:tunnel -- --port 8084 --clear
```

Sur un réseau local, remplacez `start:tunnel` par `start:lan`. Gardez le terminal Expo ouvert; après un redémarrage du tunnel, utilisez la nouvelle adresse affichée, pas un ancien lien `exp.direct`. Si `ENOSPC: System limit for number of file watchers reached` persiste malgré les exclusions Metro, augmentez temporairement la limite inotify de l’hôte puis redémarrez Expo :

```sh
sudo sysctl -w fs.inotify.max_user_watches=524288
TMPDIR="$PWD/.build-tools/expo-tmp" npm run start:tunnel -- --port 8084 --clear
```

Le réglage `sysctl` s’applique à l’hôte Linux et revient à sa valeur précédente au prochain redémarrage.

Expo Go n’est pas un substitut direct pour ce projet : QPM s’appuie sur des modules natifs tels que Firebase, Sentry, Clarity et NFC qui ne sont pas tous inclus dans Expo Go, et le projet utilise Expo SDK 53. N’utilisez donc pas `--go` pour valider ce build natif. Les API et règles métier restent les mêmes dans les deux modes.

## Installer sur Android

L’APK de production 1.0.59 est disponible dans `dist/QPM-1.0.59.apk` (version Android `versionCode` 42), signé avec le certificat QPM existant. Pour le rechargement UI continu, créez et installez une build Dev selon les étapes ci-dessus. Le guide détaillé se trouve dans [INSTALLER-APK.md](INSTALLER-APK.md), et le parcours de validation est dans [`../docs/GUIDE-TEST-VISUEL-MOBILE.md`](../docs/GUIDE-TEST-VISUEL-MOBILE.md).

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

La configuration Expo est déjà liée au projet QPM EAS `fbfaa721-adb1-463a-8757-3e256cf7337a` (`@qrchs-team/qpm`); `app.config.ts` utilise cet identifiant par défaut. Ne relancez pas `eas init`/`eas project:init`, car cela pourrait créer ou lier un projet différent. Vérification locale le 20 octobre : `npx expo config --type public --json` résout le bon identifiant, le slug `qpm`, la version `1.0.59`, le bundle iOS `com.cmms.atlas` et les runtime versions Android/iOS `1.0.59`. La configuration iOS source porte `buildNumber` 13, tandis que `eas.json` utilise `appVersionSource: remote`; EAS est donc la source du numéro de build des versions cloud et le profil `production` l’incrémente. Un IPA signé nécessite une session Expo active et les identifiants Apple Developer valides. L’IPA 1.0.59 reste à construire; les credentials Apple ne sont pas configurés/vérifiés dans cette validation.

Depuis un Mac avec Xcode ou depuis EAS Build :

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile preview
# Après validation du preview et des credentials Apple :
npx eas-cli@latest build --platform ios --profile production
```

Les deux commandes sont des choix alternatifs selon le type de distribution; la seconde nécessite le compte Apple Developer et les certificats/profils de signature de l’entreprise. N’exécutez pas `eas submit` avant d’avoir validé l’IPA et choisi une publication App Store Connect. Le build courant n’inclut pas de `GoogleService-Info.plist`; le démarrage fonctionne sans Firebase, mais les notifications push/Analytics Firebase iOS exigent les credentials de l’entreprise configurés comme fichier secret dans EAS. Vérifiez les credentials APNs de production avant de distribuer les notifications. Voir les guides officiels [EAS CLI](https://docs.expo.dev/eas/cli/), [versions distantes](https://docs.expo.dev/build-reference/app-versions/) et [capabilities iOS](https://docs.expo.dev/build-reference/ios-capabilities/).
