# Règle de développement : local, Docker et GitHub

## Principe

- **Le poste local est l’environnement de développement** : le code et les dépendances sont modifiés et testés localement.
- **Docker est l’environnement de production** : l’image exécutée sur le serveur est construite à partir du code validé et versionné; on ne corrige pas le code directement dans un conteneur.
- **GitHub est la source versionnée du code** : aucune correction ne doit exister uniquement dans un conteneur ou sur le serveur.
- Il n’y a pas d’installation manuelle de dépendances propre au serveur : les manifests et fichiers de verrouillage du dépôt sont la référence utilisée par le développement local et par le build Docker.

## Dépendances

1. Installer ou mettre à jour les dépendances dans l’environnement local de développement (`npm` pour le frontend/mobile, Maven pour l’API, ou l’outil déjà prévu par le module).
2. Déclarer chaque dépendance dans les manifests appropriés et versionner les fichiers de verrouillage modifiés (`package.json`, `package-lock.json`, `pom.xml`, etc.). Le même état versionné sert au développement et à la construction Docker; ne pas ajouter une dépendance à la main uniquement dans Docker ou sur le serveur.
3. Le Dockerfile reconstruit l’environnement de production à partir de ces fichiers. **Ne pas installer de dépendance à la main dans un conteneur de production** avec `docker exec`, `npm install` ou une commande équivalente : ces changements seraient éphémères et absents du code GitHub.
4. Ne pas versionner `node_modules`, les caches, les secrets ou les fichiers temporaires.

## Cycle de livraison

1. Développer dans le dépôt local et installer les dépendances déclarées localement.
2. Exécuter les vérifications adaptées au changement; examiner le diff et confirmer que les contrats d’API et données restent compatibles.
3. Mettre à jour les fichiers de dépendances et la documentation concernés, puis créer le commit sur la branche de travail.
4. Pousser le commit validé sur GitHub. Pour la branche `projet`, le workflow `.github/workflows/main-ci.yml` exécute les contrôles, construit et publie les images Docker des modules concernés, puis déploie les conteneurs de production lorsque ses conditions sont satisfaites.
5. Vérifier la réussite du workflow GitHub Actions, l’état des services et leur santé HTTP après le déploiement. Le code dans GitHub, l’image Docker publiée et le déploiement doivent correspondre au même commit.

Un build Docker local peut vérifier que l’image est reproductible; il ne met pas à jour la production. Le push déclenche le déploiement seulement sur les branches et dans les conditions configurées par le workflow; un push ne prouve donc pas à lui seul que la production est à jour.

## Garde-fous

- Ne pas modifier le code directement dans l’image ou le conteneur de production; corriger le dépôt, reconstruire l’image et redéployer.
- Ne pas copier des dépendances ou des artefacts de développement dans la production hors du processus normal de build.
- Garder le même code et les mêmes versions de dépendances déclarées dans GitHub et dans l’image Docker publiée; seules les configurations propres à l’environnement et les secrets peuvent différer.
- Ne jamais inclure de secrets dans Git, l’image, les logs ou les commandes copiées dans un terminal partagé.
- Si le build, les tests, le push ou le déploiement échouent, ne pas déclarer la mise à jour terminée : indiquer l’étape en échec et son résultat.
- Le push GitHub et le déploiement restent deux étapes distinctes, même si le workflow les enchaîne automatiquement. Ne pas annoncer une mise en production tant que le workflow et le contrôle de santé n’ont pas réussi.
