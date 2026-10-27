# Configurer les secrets GitHub Actions pour le déploiement VPS

Ce guide décrit la configuration nécessaire au workflow `.github/workflows/main-ci.yml` pour publier les images Docker puis déployer la branche `projet` sur le VPS. Il ne contient aucune valeur secrète.

## Pourquoi le déploiement est bloqué

Le workflow a atteint les tests backend et le smoke test, mais les deux tâches de connexion à Docker Hub ont échoué avec `Username and password required`. Le déploiement VPS dépend de ces tâches : il est donc ignoré tant que Docker Hub et SSH ne sont pas configurés. Un build et un smoke test réussis ne signifient pas que la production a été mise à jour.

## Secrets requis

Dans le dépôt `quoreichgroup-coder/cmms`, configure ces quatre **Actions secrets** au niveau du dépôt :

| Nom exact | Contenu attendu | Où l’obtenir / le vérifier |
| --- | --- | --- |
| `DOCKERHUB_USERNAME` | Nom d’utilisateur Docker Hub autorisé à publier dans `intelloop` | Compte ou organisation Docker Hub qui possède ou peut publier les images `intelloop/atlas-cmms-backend` et `intelloop/atlas-cmms-frontend` |
| `DOCKERHUB_TOKEN` | Jeton d’accès Docker Hub avec les droits de lecture et d’écriture nécessaires | Docker Hub → Account Settings → Personal access tokens. Utiliser un jeton, pas le mot de passe du compte. Copier sa valeur lors de sa création. |
| `VPS_SSH_KEY` | Clé privée OpenSSH associée à une clé publique installée pour l’utilisateur `abdouramane` sur le VPS | Générer une clé dédiée au déploiement, puis autoriser sa clé publique sur le serveur. Voir la procédure ci-dessous. |
| `VPS_DEPLOY_PATH` | Chemin absolu du clone QPM sur le VPS, probablement `/home/abdouramane/Projet/cmms` | Confirmer le chemin avec `pwd` dans le répertoire du projet sur le VPS. Le workflow l’utilise pour `cd`, `git pull` et `docker compose`. |

Les noms sont sensibles aux fautes de frappe. Le workflow attend précisément ces identifiants.

## Ajouter les secrets au dépôt

1. Ouvrir [Settings → Secrets and variables → Actions](https://github.com/quoreichgroup-coder/cmms/settings/secrets/actions) avec un compte qui peut administrer les secrets du dépôt.
2. Choisir **New repository secret**.
3. Ajouter chacun des quatre noms ci-dessus et sa valeur dans le champ secret correspondant.
4. Enregistrer. GitHub ne permet généralement pas de relire la valeur ensuite ; il faut la remplacer pour la corriger.

Ne pas créer ces valeurs comme Actions variables : le workflow les lit dans `secrets.*`. Ne jamais envoyer les valeurs dans une conversation, un ticket ou un commit, ni les inscrire dans un fichier du dépôt ou une commande conservée dans l’historique du shell.

## Préparer une clé SSH dédiée

La clé doit être utilisable en mode non interactif par GitHub Actions. Le workflow actuel ne configure pas de phrase secrète ni d’agent SSH ; une clé protégée par phrase secrète ne fonctionnera donc pas avec cette configuration. Utiliser une clé dédiée, limitée à cet usage, et la protéger comme un secret d’accès au VPS.

Sur un poste d’administration de confiance, générer une paire dédiée :

```bash
ssh-keygen -t ed25519 -C "qpm-github-actions-deploy" -f ~/.ssh/qpm_github_actions
```

Pour le workflow actuel, laisser la phrase secrète vide lors de la génération. Cela rend la clé privée particulièrement sensible : ne la partager qu’avec le secret GitHub `VPS_SSH_KEY`, limiter l’accès au dépôt et la renouveler si elle est exposée. Ne pas copier la clé privée dans le dépôt.

Installer **la clé publique seulement** (`~/.ssh/qpm_github_actions.pub`) dans `~abdouramane/.ssh/authorized_keys` sur `169.58.86.7`, avec le propriétaire et les permissions corrects. Exemple à exécuter sur le VPS sous l’utilisateur `abdouramane` :

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Ajouter ensuite la ligne de la clé `.pub` dans `authorized_keys` par un canal sécurisé. Ne pas afficher ni transmettre la clé privée. Vérifier la connexion depuis le poste où la clé a été générée :

```bash
ssh -i ~/.ssh/qpm_github_actions -o IdentitiesOnly=yes abdouramane@169.58.86.7
```

La connexion doit fonctionner sans demander de mot de passe interactif. Le secret `VPS_SSH_KEY` doit contenir le fichier privé complet, y compris les lignes `-----BEGIN OPENSSH PRIVATE KEY-----` et `-----END OPENSSH PRIVATE KEY-----`.

## Vérifier le répertoire de déploiement sur le VPS

Connecté au VPS sous `abdouramane`, se placer dans le clone utilisé pour la production et vérifier :

```bash
cd /home/abdouramane/Projet/cmms
pwd
git remote get-url origin
git branch --show-current
docker compose ps
```

Le chemin affiché par `pwd` est la valeur de `VPS_DEPLOY_PATH`. Le workflow vérifie que le dépôt distant correspond à `quoreichgroup-coder/cmms` et que la branche courante est `projet`, puis exécute `git pull --ff-only origin projet`. Le fichier Compose, son `.env` et les configurations de production doivent déjà être présents dans ce clone.

Le déploiement lance `docker compose` directement sous l’utilisateur SSH `abdouramane` (sans `sudo`). Vérifier que cet utilisateur peut utiliser Docker : `docker compose ps` doit s’exécuter sans erreur de permission. Si Docker répond `permission denied`, corriger l’accès Docker de cet utilisateur sur le VPS selon la politique d’administration du serveur avant de relancer le workflow. Ne pas mettre un mot de passe sudo dans GitHub.

## Relancer le déploiement

Après avoir enregistré les quatre secrets et vérifié l’accès SSH et Docker, ouvrir [le workflow Actions](https://github.com/quoreichgroup-coder/cmms/actions/workflows/main-ci.yml) et relancer **Re-run all jobs** sur le commit concerné. On peut aussi ouvrir le run précédent puis utiliser **Re-run jobs**. La relance reprend le même commit avec les secrets configurés actuellement ; elle ne crée pas de commit supplémentaire.

Le workflow de la branche `projet` suit ces étapes :

1. Tests backend Maven, si des changements backend sont détectés.
2. Construction et démarrage du stack de smoke test, si nécessaire.
3. Connexion Docker Hub, construction et publication des images backend et frontend modifiées.
4. Déploiement SSH sur le VPS, seulement si les étapes requises ont réussi.
5. Contrôle HTTP de `http://127.0.0.1:3000/api/health-check` sur le VPS.
6. Mise à jour des tags `deployed-backend` et `deployed-frontend` pour les images publiées avec succès.

Pour le run qui a exposé le problème de connexion Docker Hub, le lien est [Actions run 39742283468](https://github.com/quoreichgroup-coder/cmms/actions/runs/39742283468). Si les secrets sont configurés après ce run, une relance peut être faite depuis cette page.

## Vérifier le résultat

Le déploiement est confirmé seulement si le run affiche le succès des étapes de publication et de `Deploy self-hosted stack to VPS`, notamment **Check backend health through nginx**. Vérifier aussi dans les logs que le contrôle de santé a terminé sans erreur. Le succès du job de tests ou du smoke test seul ne confirme pas le déploiement.

Si le workflow échoue, consulter l’étape rouge et ses logs. GitHub masque les secrets reconnus dans les logs, mais il ne faut jamais imprimer leur valeur pour tenter de diagnostiquer un problème.

## Dépannage

| Erreur observée | Vérifications |
| --- | --- |
| `Username and password required` à la connexion Docker Hub | Les deux secrets `DOCKERHUB_USERNAME` et `DOCKERHUB_TOKEN` existent, sont des Actions secrets du bon dépôt et sont orthographiés exactement comme dans le workflow. |
| `unauthorized`, `denied` ou échec de push | Le jeton Docker Hub est valide, possède l’accès en écriture et le compte peut publier sous `intelloop`. Générer un nouveau jeton si l’ancien a expiré, puis remplacer `DOCKERHUB_TOKEN`. |
| `Permission denied (publickey)` | `VPS_SSH_KEY` correspond bien à la clé privée de la clé publique autorisée pour `abdouramane@169.58.86.7`; la clé privée n’a pas été tronquée et ne requiert pas de phrase secrète avec le workflow actuel. |
| Échec de `cd`, dépôt distant incorrect ou branche incorrecte | `VPS_DEPLOY_PATH` désigne le clone de production et celui-ci est sur la branche `projet`, avec le dépôt distant attendu. |
| `docker compose` permission denied sur le VPS | Le compte `abdouramane` ne dispose pas de l’accès Docker utilisé par le workflow. Faire corriger les permissions côté serveur ; le workflow n’exécute pas `sudo`. |
| Le contrôle de santé échoue après redémarrage | Examiner la sortie du job puis, sur le VPS, `docker compose ps` et `docker compose logs --tail=100 api nginx`. Vérifier la configuration `.env` et l’état des services sans exposer de secrets. |

## Rotation et révocation

En cas de fuite ou de départ d’un administrateur, révoquer immédiatement le jeton Docker Hub ou la clé publique SSH concernée, créer un nouvel identifiant dédié et remplacer le secret GitHub correspondant. L’ancienne clé publique doit être retirée de `authorized_keys`. Ne pas réutiliser une clé personnelle pour l’automatisation.

Ce guide couvre uniquement les secrets du déploiement VPS de la branche `projet`. Les identifiants iOS/EAS, Netlify, Koyeb et les autres secrets de publication sont indépendants et ne sont pas nécessaires à ce chemin de déploiement.
