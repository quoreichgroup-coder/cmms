# Travailler sur notre version de CMMS

Dossier : `/home/abdouramane/Documents/Projets/cmms`.

- `origin` : notre fork `quoreichgroup-coder/cmms`, destination des publications.
- `upstream` : dépôt officiel `Grashjs/cmms`, source des nouveautés.
- `main` : référence officielle, à garder sans adaptations ; suit `upstream/main`.
- `projet` : notre branche de travail.

Le clone utilise `--filter=blob:none` : l’historique des commits est conservé. Git télécharge les anciens contenus à la demande ; certaines consultations historiques nécessitent donc Internet.

## Travailler

```bash
cd /home/abdouramane/Documents/Projets/cmms
git switch projet
```

Faire des commits petits et cohérents. Examiner `git diff`, ajouter uniquement les fichiers souhaités avec `git add <fichiers>`, puis `git commit`. Ne pas ajouter les secrets ou les fichiers `.env`.

Pour sauvegarder ensuite la branche sur notre fork :

```bash
git push -u origin projet
```

## Examiner les nouveautés officielles

```bash
git fetch upstream --prune
git log --oneline projet..upstream/main
git log --left-right --cherry-pick --oneline projet...upstream/main
git diff --stat projet...upstream/main
```

`fetch` actualise les références distantes sans modifier notre branche ni les fichiers de travail. Le premier journal liste les commits officiels non présents par leur identifiant ; le second masque les changements équivalents déjà repris par cherry-pick. Le diff à trois points présente les changements officiels depuis l’ancêtre commun, pas une simulation de fusion.

## Intégrer toutes les nouveautés sur une branche d’essai

Commencer avec `git status` propre : enregistrer le travail en cours avant de continuer. Choisir un nom de branche d’essai inédit à chaque intégration.

```bash
git switch projet
git switch -c integration/upstream-AAAA-MM-JJ
git merge upstream/main
```

En cas de conflit : examiner les fichiers, résoudre, puis `git add <fichiers>` et `git merge --continue`. Pour abandonner la fusion en cours : `git merge --abort`.

Tester les fonctionnalités et les adaptations, ainsi que les migrations éventuelles. Une fusion sans conflit Git peut encore introduire des incompatibilités fonctionnelles.

Après validation, et si `projet` n’a pas avancé entre-temps :

```bash
git switch projet
git merge --ff-only integration/upstream-AAAA-MM-JJ
```

Si cette dernière commande refuse, conserver les deux branches et réexaminer leurs changements avant de continuer.

## Reprendre seulement certains commits

Alternative à la fusion complète : créer une branche d’essai depuis `projet`, puis :

```bash
git show <sha>
git cherry-pick -x <sha>
```

Vérifier les dépendances et reprendre les commits nécessaires dans l’ordre. En cas de conflit, résoudre puis `git cherry-pick --continue`, ou annuler avec `git cherry-pick --abort`. Tester, puis intégrer la branche d’essai comme ci-dessus.

Ne pas mélanger systématiquement cherry-pick et fusions complètes : un changement repris par cherry-pick a un autre identifiant, ce qui peut compliquer les intégrations suivantes. Préférer la fusion complète quand on souhaite suivre durablement l’ensemble du projet officiel.

La destination de publication par défaut est `origin`. L’URL de publication de `upstream` est volontairement désactivée dans la configuration locale. `pull.ff=only` évite les fusions implicites lors d’un pull. La branche `projet` reste locale jusqu’au premier `git push -u origin projet`.

Les mises à jour restent manuelles. Ne jamais forcer une synchronisation de `projet` sur l’officiel : cela risquerait de supprimer nos adaptations.
