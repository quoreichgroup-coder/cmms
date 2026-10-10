# Tutoriel de recette PM — parcours pas à pas

Ce document sert à tester manuellement dans l’application les fonctions de maintenance préventive qui n’ont pas encore été validées de bout en bout sur votre instance. Suivez les six tests dans l’ordre. Chaque scénario utilise des données de démonstration distinctes pour éviter qu’un relevé ou un ordre d’un test fausse le suivant.

Les noms de menus peuvent légèrement varier selon le rôle et la langue. Les noms des fonctions et champs ci-dessous sont ceux de l’interface française actuelle. **Ne faites pas ces essais sur des équipements ou des ordres de production.** Après chaque scénario, cochez le résultat et notez l’ID du PM et des WO.

## Avant de commencer

### A. Mettre à jour l’instance de test

Depuis le dépôt, reconstruisez l’API et le web afin d’appliquer le code et les migrations Liquibase :

```bash
cd ~/Projet/cmms
sudo docker compose up -d --build api frontend nginx
sudo docker compose ps
sudo docker compose logs --tail=200 api
```

Attendez que l’API soit démarrée et que les migrations soient terminées. Si `api` redémarre, si Liquibase signale une erreur ou si le site ne s’ouvre pas, arrêtez la recette et conservez les journaux. Une fois les services sains, ouvrez le site, faites un rechargement forcé du navigateur et reconnectez-vous.

### B. Vérifier le compte et préparer les modèles

Utilisez une entreprise de test et un compte qui peut créer/modifier les équipements, compteurs, modèles de tâches, PM et ordres de travail. Vérifiez que l’offre inclut la maintenance préventive et les compteurs nécessaires. Les essais conditionnels sur licence sont repérés au TEST 06.

Créez ou vérifiez quatre **modèles de tâches** distincts. Utilisez vos menus habituels de gestion des tâches :

| Nom de démonstration | Utilisé dans |
| --- | --- |
| `Inspection visuelle` | PM simple et routine |
| `Graissage complet` | Package mensuel et cycle 300 h |
| `Contrôle heures` | Cycle compteur heures |
| `Contrôle démarrages` | Cycle compteur démarrages |

Dans le formulaire du PM, ajoutez les modèles nécessaires dans le champ **Tâches**. Le panneau de stratégie les affiche ensuite sous forme de cases à cocher. Les tâches ne sont pas automatiquement ajoutées au PM en les cochant dans un package : il faut d’abord les inclure dans la liste **Tâches** du formulaire.

### C. Règles pour la recette

- Dans **Équipements**, créez un nouvel équipement de test pour chaque test indiqué ci-dessous. Créez ses compteurs depuis la fiche de cet équipement, puis saisissez son relevé initial dans la fiche du compteur.
- Pour une mesure de compteur, utilisez la valeur numérique seule; l’unité (`H`, `START` ou unité disponible) est attachée au compteur.
- Vérifiez un ordre dans **Ordres de travail** et le registre dans la fiche du PM. Notez les identifiants. Le registre et les WO sont les preuves attendues, pas seulement un message de succès.
- Un essai de déclenchement doit utiliser un **nouveau PM** et des relevés jamais soumis auparavant. Si votre produit autorise la modification d’un relevé historique, ne modifiez pas une donnée de production.
- Marquez chaque contrôle `PASS`, `FAIL` ou `BLOQUÉ`. Un résultat bloqué par une licence, un équipement indisponible ou une échéance non atteinte n’est pas un succès.

---

## TEST 01 — PM simple : vérifier le parcours standard

**But :** vérifier que le PM simple, sans package ni plan multi-compteurs, reste fonctionnel.

**Données à créer**

| Champ | Valeur |
| --- | --- |
| Équipement | `RECETTE-PM-01-STANDARD` |
| Modèle de tâche | `Inspection visuelle` |
| Nom du PM | `RECETTE-01-CONTROLE-HEBDO` |
| Déclencheur du plan | `Basé sur le calendrier` |
| Type de plan | `Plan standard` |
| Base de récurrence | `Date planifiée` |
| Fréquence | `1` semaine |
| Jour | Le prochain lundi disponible |
| Liste réutilisable | `RECETTE-01-LISTE-INSPECTION` avec deux opérations : `Inspection visuelle` et `Relever la température` |

**Étapes**

1. Ouvrez **Maintenance préventive** et choisissez l’action de création.
2. Dans **Paramètres → Checklists**, créez `RECETTE-01-LISTE-INSPECTION` avec les deux opérations indiquées. Enregistrez, puis ouvrez la ligne de la bibliothèque et vérifiez les intitulés, les types et l’ordre `0010`, `0020`.
3. Renseignez le nom et l’équipement du PM. Dans **Tâches → Checklist**, ajoutez `RECETTE-01-LISTE-INSPECTION`. Vérifiez que les deux opérations apparaissent dans le formulaire. Remplissez les autres champs obligatoires de votre instance (priorité, durée estimée, équipe ou emplacement s’ils sont requis).
4. Dans **Déclencheur du plan**, sélectionnez **Basé sur le calendrier**. Saisissez une date de départ suffisamment proche pour que l’échéance arrive pendant la recette, puis configurez la fréquence hebdomadaire et le lundi.
5. Dans **Stratégie de maintenance et cycles**, laissez **Type de plan** sur **Plan standard**.
6. Regardez la prévision : les prochaines dates doivent être cohérentes avec le lundi et la fréquence. La prévision seule ne doit pas créer de WO.
7. Enregistrez le PM, rouvrez sa fiche et vérifiez que ses deux opérations sont toujours présentes et dans le bon ordre.
8. Quand l’appel devient dû, ouvrez le registre **Ordres de travail récents / appels** et **Ordres de travail**. Vérifiez le lien PM, l’équipement et la présence des deux opérations dans le WO, dans l’ordre attendu.

**Résultat attendu :** la liste est consultable, ses opérations restent ordonnées après le rechargement et sont sélectionnables dans le PM; le PM est conservé après rechargement; les échéances du calendrier sont cohérentes; aucun WO n’existe avant l’heure de génération prévue; l’appel dû produit au plus un WO lié au PM contenant les deux opérations.

**À noter :** ID PM `________` · ID WO `________` · date/heure de l’appel `________` · résultat `PASS / FAIL / BLOQUÉ`.

---

## TEST 02 — Strategy Plan calendaire : Weekly Inspection + Monthly Greasing

**But :** vérifier l’aperçu et les tâches différentes selon la cadence des packages.

**Données à créer**

| Champ | Valeur |
| --- | --- |
| Équipement | `RECETTE-PM-02-CALENDAR` |
| Nom du PM | `RECETTE-02-STRATEGIE-CALENDAIRE` |
| Déclencheur | `Basé sur le calendrier` |
| Fréquence de base | Chaque `1` semaine, le lundi |
| Modèles dans **Tâches** | `Inspection visuelle`, `Graissage complet` |
| Package 1 | `Weekly Inspection`, tous les `1` cycles de base, tâche `Inspection visuelle` |
| Package 2 | `Monthly Greasing`, tous les `4` cycles de base, tâche `Graissage complet` |

**Étapes**

1. Créez le PM avec les valeurs du tableau et choisissez **Stratégie avec packages de tâches** dans **Type de plan**.
2. Dans **Tâches**, ajoutez les deux modèles. Dans le panneau de stratégie, gardez le package initial ou renommez-le `Weekly Inspection`; réglez sa cadence sur `1` et cochez `Inspection visuelle`.
3. Cliquez sur **Ajouter un package**. Nommez-le `Monthly Greasing`, réglez **Tous les … cycles de base** sur `4` et cochez `Graissage complet`.
4. Choisissez une date de départ proche, puis observez la prévision avant d’enregistrer. Le calendrier doit montrer les occurrences de base; le package mensuel ne doit apparaître que sur chaque quatrième cycle global (cycles 4, 8, 12…), même si les anciennes dates ne sont pas affichées.
5. Enregistrez, rechargez la page et rouvrez le PM. Vérifiez les noms, les cadences et les tâches cochées.
6. À la première échéance, vérifiez que le WO contient `Inspection visuelle`, sans `Graissage complet`.
7. Au quatrième appel hebdomadaire, vérifiez qu’un WO contient les deux tâches. Vérifiez aussi dans le registre que les appels sans package dû ne créent pas de WO inutile.
8. Modifiez un nom ou une tâche de package, enregistrez, puis vérifiez que le changement est conservé et qu’un WO déjà créé n’est pas dupliqué.

**Résultat attendu :** le premier cycle est numéroté 1; le package cadence 1 est dû à chaque cycle; celui cadence 4 est dû aux cycles 4, 8, 12… L’aperçu ne déclenche rien. La génération réelle dépend de la date d’appel et du délai d’anticipation configuré.

**À noter :** ID PM `________` · ID WO cycle 1 `________` · ID WO cycle 4 `________` · résultat `PASS / FAIL / BLOQUÉ`.

---

## TEST 03 — Strategy Plan compteur : Routine 100 h + Revision 300 h

**But :** vérifier qu’une stratégie basée sur un cycle compteur garde un seul déclenchement de base et choisit les tâches par package.

**Données à créer**

| Champ | Valeur |
| --- | --- |
| Équipement | `RECETTE-PM-03-METER-STRATEGY` |
| Compteur | `Operating Hours`, unité `H` |
| Relevé initial | `0` |
| Nom du PM | `RECETTE-03-STRATEGIE-HEURES` |
| Déclencheur | `Basé sur un compteur` |
| Compteur / référence / intervalle | `Operating Hours` / `0` / `100` |
| Package `Routine 100 h` | Tous les `1` cycles; tâche `Inspection visuelle` |
| Package `Revision 300 h` | Tous les `3` cycles; tâche `Graissage complet` |

**Étapes**

1. Créez l’équipement et son compteur `Operating Hours`; enregistrez le relevé initial `0`.
2. Créez le PM ci-dessus. Ajoutez les deux modèles dans **Tâches**, puis passez le plan en **Stratégie avec packages de tâches**.
3. Dans le panneau compteur, sélectionnez `Operating Hours`, saisissez la référence `0` et l’intervalle `100`. Vérifiez que l’aperçu des seuils indique `100 H`, `200 H`, `300 H` (et les suivants si affichés). Avec seulement le relevé initial, aucune date estimée ne doit apparaître.
4. Dans la stratégie, configurez `Routine 100 h` à chaque cycle avec `Inspection visuelle`; ajoutez `Revision 300 h` tous les trois cycles avec `Graissage complet`.
5. Enregistrez et rouvrez le PM. Vérifiez que les réglages, modèles de tâches et seuils sont restés identiques.
6. Dans la fiche compteur, saisissez le relevé `100`. Vérifiez le registre et le WO : un seul appel doit être lié au premier seuil et contenir `Inspection visuelle`.
7. Saisissez `200`, puis `300` comme nouveaux relevés. Au seuil `200`, vérifiez la tâche routine seule; au seuil `300`, vérifiez routine et révision.
8. Vérifiez que les alertes configurées sur le compteur, si elles existent, n’ont pas remplacé ou effacé le cycle PM. Les alertes et les cycles PM sont des mécanismes distincts.
9. Contrôlez le registre après actualisation : chaque appel créé doit garder son relevé, son seuil et son lien au WO; un même relevé ne doit pas avoir engendré deux WO identiques.

**Résultat attendu :** trois seuils successifs à 100, 200 et 300 heures; les tâches correspondent aux packages dus. Après au moins deux relevés datés croissants, une date indicative peut apparaître à côté des prochains seuils avec la mention « estimée selon les relevés récents ». Elle reste absente si l’historique ne permet pas un calcul cohérent et ne remplace jamais la valeur du compteur comme déclencheur.

**À noter :** ID PM `________` · IDs WO à 100/200/300 `________ / ________ / ________` · résultat `PASS / FAIL / BLOQUÉ`.

---

## TEST 04 — Multi-Counter OR : 100 heures OU 500 démarrages

**But :** vérifier qu’un compteur peut déclencher son ordre sans attendre l’autre.

**Données à créer**

| Champ | Valeur |
| --- | --- |
| Équipement | `RECETTE-PM-04-OR` |
| Compteur 1 | `Operating Hours`, unité `H`, relevé `0` |
| Compteur 2 | `Start Counter`, unité `START`, relevé `0` |
| Nom du PM | `RECETTE-04-MULTI-OR` |
| Cycle heures | référence `0`, intervalle `100`, tâche `Contrôle heures` |
| Cycle démarrages | référence `0`, intervalle `500`, tâche `Contrôle démarrages` |
| Règle | `OR — créer un ordre dès qu’un cycle est dû` |

**Étapes**

1. Créez l’équipement, attachez les deux compteurs et enregistrez `0` comme relevé initial pour chacun.
2. Créez le PM et ajoutez `Contrôle heures` et `Contrôle démarrages` dans **Tâches**. Sélectionnez **Plan multi-compteurs**.
3. Choisissez **OR**. Configurez le premier cycle avec `Operating Hours`, référence `0`, intervalle `100`, puis cochez `Contrôle heures`.
4. Cliquez sur **Ajouter un cycle compteur**. Configurez `Start Counter`, référence `0`, intervalle `500`, puis cochez `Contrôle démarrages`.
5. Vérifiez que la liste de compteurs ne présente que ceux de `RECETTE-PM-04-OR`. Le premier cycle doit synchroniser le compteur et les paramètres compteur principaux du formulaire.
6. Enregistrez et rouvrez le PM. Vérifiez la règle OR et les deux cycles.
7. Saisissez `100` sur `Operating Hours`. Un WO doit être créé immédiatement pour `Contrôle heures`, sans attendre le compteur de démarrages.
8. Saisissez `500` sur `Start Counter`. Un autre WO doit être créé pour `Contrôle démarrages`.
9. Actualisez le registre et les WO. Vérifiez les deux déclencheurs, les relevés, les tâches et les liens PM. Vérifiez qu’aucun doublon n’a été créé en réouvrant les écrans.

**Résultat attendu :** deux franchissements indépendants produisent deux WO, chacun avec les seules tâches de son cycle.

**À noter :** ID PM `________` · WO heures `________` · WO démarrages `________` · résultat `PASS / FAIL / BLOQUÉ`.

---

## TEST 05 — Multi-Counter AND : 100 heures ET 500 démarrages

**But :** vérifier l’attente du second cycle, la création combinée et la persistance de l’attente.

**Données à créer**

| Champ | Valeur |
| --- | --- |
| Équipement | `RECETTE-PM-05-AND` |
| Compteur heures | `Operating Hours`, unité `H`, relevé `0` |
| Compteur démarrages | `Start Counter`, unité `START`, relevé `0` |
| Nom du PM | `RECETTE-05-MULTI-AND` |
| Cycle heures | référence `0`, intervalle `100`, tâche `Contrôle heures` |
| Cycle démarrages | référence `0`, intervalle `500`, tâche `Contrôle démarrages` |
| Règle | `AND — attendre que tous les cycles soient dus` |

**Étapes**

1. Créez un équipement neuf et ses deux compteurs avec des relevés initiaux à `0`. Ne réutilisez pas les compteurs du TEST 04.
2. Créez le PM multi-compteurs avec les deux cycles et les tâches données; choisissez **AND**.
3. Enregistrez le PM. Vérifiez sa réouverture et la présence des deux cycles.
4. Saisissez `100` uniquement sur `Operating Hours`. Aucun WO combiné ne doit encore apparaître. Dans le registre, vérifiez que le cycle heures est conservé en attente.
5. Laissez cette attente en base. Redémarrez l’API avec `sudo docker compose restart api`, attendez son retour à l’état sain, puis rechargez l’interface.
6. Vérifiez que l’attente du cycle heures est toujours présente. Saisissez ensuite `500` sur `Start Counter`.
7. Vérifiez qu’un seul WO combiné est créé avec `Contrôle heures` et `Contrôle démarrages`, et que le registre relie les deux cycles à cet ordre.
8. Passez au groupe de cycles suivant : saisissez `200` heures sans atteindre `1000` démarrages. Aucun nouvel ordre combiné ne doit être créé. Saisissez `1000` démarrages et vérifiez le second WO combiné.

**Résultat attendu :** le premier compteur seul n’émet pas de WO; l’état survit au redémarrage; le second franchissement complète le groupe et crée exactement un ordre avec les deux ensembles de tâches.

**À noter :** ID PM `________` · ID ordre combiné 1 `________` · ID ordre combiné 2 `________` · résultat `PASS / FAIL / BLOQUÉ`.

---

## TEST 06 — Validations, registre, sécurité et cas encore non éprouvés

Ce dernier test rassemble les contrôles transversaux. N’effectuez les essais destructifs que sur les données de recette. Notez explicitement `BLOQUÉ` lorsqu’il faut une deuxième entreprise, un rôle spécial, une licence ou attendre une échéance réelle.

### 6A. Validation du formulaire et modification

1. Ouvrez en modification le PM du TEST 04 ou 05. Changez un nom de cycle, la règle, une tâche, puis enregistrez.
2. Rouvrez le PM après rechargement : les changements doivent être persistants et les paramètres non modifiés doivent être conservés.
3. Dans un PM de test neuf, vérifiez séparément ces cas, en essayant d’enregistrer après chacun :
   - package stratégie sans tâche;
   - cadence de package égale à `0` ou décimale;
   - plan multi-compteurs avec un seul cycle;
   - cycle sans compteur;
   - référence négative;
   - intervalle égal à `0`;
   - valeur d’arrêt égale ou inférieure à la référence;
   - cycle sans tâche;
   - deux packages ou cycles ayant des noms identiques ou produisant le même code, par exemple `Révision A` et `Revision A`.
4. Pour chaque cas, le formulaire doit bloquer l’enregistrement, montrer un message près du problème ou dans le panneau, et conserver les autres valeurs saisies. Corrigez ensuite le champ et confirmez que le PM s’enregistre.
5. Changez l’équipement après avoir configuré les compteurs. Vérifiez que les cycles ne peuvent pas conserver silencieusement un compteur de l’ancien équipement; choisissez des compteurs du nouvel équipement ou constatez un blocage clair.

**Résultat attendu :** aucun plan incomplet ou incohérent n’est enregistré; le mode édition conserve les données valides.

### 6B. Limites et cycle de vie des compteurs

1. Sur un plan multi-compteurs neuf, choisissez une valeur d’arrêt supérieure à la référence (exemple heures : référence `0`, intervalle `100`, arrêt `250`). Vérifiez l’aperçu des seuils `100` et `200`; aucun seuil supérieur ou égal à l’arrêt ne doit être proposé.
2. Saisissez un relevé plus grand que plusieurs intervalles (par exemple `350` pour un intervalle de `100`). Notez le nombre de WO et le seuil enregistré. Le comportement actuel traite le relevé comme un franchissement du cycle courant; confirmez avec le site si un WO de rattrapage par intervalle sauté est souhaité.
3. Laissez un WO PM ouvert, puis atteignez un autre seuil. Notez si un autre WO est créé. La règle de blocage d’un nouveau cycle tant qu’un précédent reste ouvert n’est pas encore décidée par le site : consignez le résultat, ne le classez pas comme défaut avant validation métier.
4. Testez l’égalité au seuil (par exemple `99`, puis `100`) et un relevé répété identique. Le seuil atteint doit déclencher une fois; une répétition du même relevé ne doit pas créer un doublon.
5. Vérifiez qu’un PM compteur sans relevé réel affiche clairement l’absence de relevé et calcule les seuils depuis la référence configurée, sans prétendre qu’un relevé existe.
6. Faites défiler le registre des appels jusqu’à la page suivante. Il doit afficher la fenêtre glissante des appels à venir (jusqu’à 12 seuils), sans répéter ni perdre une ligne entre les pages.
7. Depuis le registre, ouvrez un WO lié et vérifiez son état avant et après clôture. L’appel correspondant doit suivre l’état jusqu’à `Terminé`; les appels futurs restent à venir.

**Résultat attendu :** arrêt, seuil, relevé et statut du registre restent cohérents. Les rattrapages de plusieurs seuils et le blocage des cycles sur WO ouvert sont des décisions métier à consigner séparément.

### 6C. Appels calendaires, délai d’anticipation et report

1. Sur un PM calendaire de recette, réglez **Créer l’ordre de travail avant l’échéance (jours)** à `7`. Choisissez une date d’appel future située à plus de sept jours.
2. Vérifiez dans la prévision que la date d’échéance reste la date planifiée. Vérifiez dans le registre le moment où l’appel/WO doit être généré : l’anticipation ne doit pas déplacer l’échéance affichée.
3. Dans la fiche du PM, trouvez dans le registre un appel calendaire sans WO lié. Si l’action **Replanifier** est proposée, donnez une nouvelle date future et la raison `Arrêt planifié pour recette`, puis enregistrez.
4. Rechargez la fiche. Vérifiez la nouvelle date, l’ancienne et la nouvelle valeur dans l’historique d’audit, l’auteur du changement, et l’absence de WO prématuré.
5. Tentez de soumettre une date passée ou une date dont l’heure d’appel conservée est déjà passée, ainsi qu’une raison vide. L’interface doit refuser la soumission; aucune modification ne doit apparaître dans le registre.
6. Vérifiez qu’un appel avec un WO déjà généré ne peut pas être reporté. L’action ne doit pas être disponible ou l’API doit refuser sans altérer l’ordre.
7. Désactivez un PM de recette ayant plusieurs appels futurs, puis vérifiez dans le registre que les appels retirés du plan sont conservés comme ignorés/annulés et qu’ils ne génèrent pas de WO.

Si aucun appel futur ne figure au registre, vérifiez l’horizon de génération et le délai d’anticipation du PM. N’utilisez pas un appel de production pour faire apparaître un bouton.

**Résultat attendu :** date et motif sont persistés avec une piste d’audit; les appels passés ou déjà générés ne sont pas modifiables.

### 6D. Récurrence, fuseau horaire et génération

1. Créez un PM hebdomadaire basé sur **Date planifiée**, avec départ un lundi et fréquence `1` semaine. Vérifiez plusieurs lundis dans la prévision.
2. Sur un PM de recette distinct, choisissez **Date d’achèvement**. Clôturez un WO à une date différente de sa date prévue; vérifiez que l’occurrence suivante se recalcule selon la date de clôture et que l’aperçu indique qu’il s’agit d’une estimation.
3. Vérifiez le réglage du fuseau horaire de l’entreprise. Si la prochaine date de votre recette traverse un changement d’heure, comparez l’heure locale planifiée avant et après ce changement. Elle doit rester stable.
4. Comparez la prévision avant sauvegarde et le registre après sauvegarde. La prévision n’écrit pas d’appel ni de WO; le registre et le job API pilotent la génération réelle.
5. Sur un PM calendaire avec un WO ouvert, notez le comportement au prochain appel et vérifiez qu’un seul WO n’est pas dupliqué pour un même appel.
6. Si vous pouvez modifier les dates d’un PM de recette, changez sa récurrence après que des appels futurs ont été préparés. Vérifiez que les dates déjà générées ou terminées restent dans l’historique et que les anciennes occurrences retirées ne redeviennent pas des appels actifs.

**Résultat attendu :** une récurrence basée sur la date planifiée reste ancrée au calendrier; celle basée sur la clôture repart de la clôture; le fuseau de l’entreprise gouverne les dates.

### 6E. Alarmes compteur séparées du PM (si cette fonction est activée)

Ce contrôle porte sur les **déclencheurs d’alarme** de compteur, pas sur les cycles PM testés aux TEST 03–05. Il requiert un compte et une licence qui autorisent cette fonction.

1. Dans **Compteurs**, ouvrez un compteur de recette et ajoutez un déclencheur **MORE_THAN** à `100`, délai `0`, non récurrent. Si l’interface permet de choisir l’ordre modèle, sélectionnez une tâche clairement distincte des tâches PM.
2. Enregistrez d’abord `100`, puis `101`. L’égalité ne doit pas déclencher; la valeur strictement supérieure doit créer au plus un WO d’alarme.
3. Saisissez ensuite `102`. Aucun second WO ne doit apparaître pour le déclencheur non récurrent.
4. Sur un déclencheur temporaire séparé, choisissez un délai d’attente (par exemple `60` secondes). Franchissez le seuil puis revenez sous le seuil avant la fin du délai : l’ordre différé doit être annulé. Recommencez et maintenez la condition au-delà du délai : un WO doit être créé.
5. Sur un déclencheur récurrent séparé, franchissez le seuil, revenez à l’état normal, puis franchissez-le à nouveau. Il doit produire un ordre à chaque nouveau franchissement après réarmement.
6. Comparez les WO d’alarme au registre du PM. Un déclencheur d’alarme ne doit pas avancer l’intervalle du PM; un cycle PM ne doit pas modifier la configuration d’alarme.

**Résultat attendu :** seuil strict, temporisation et réarmement respectés, indépendamment des cycles PM. Si la licence n’est pas disponible, notez `BLOQUÉ — licence`.

### 6F. Droits, entreprises, licences et mobile

1. Connectez-vous avec un rôle qui peut consulter les PM mais ne peut pas les créer/modifier. Les actions d’écriture doivent respecter les permissions et l’API doit refuser une modification non autorisée.
2. Si vous disposez d’une seconde entreprise de test, vérifiez que ses compteurs et tâches ne sont pas proposés dans le formulaire de la première entreprise. Un compteur d’un autre équipement ou d’une autre entreprise ne doit pas être accepté par le serveur.
3. Avec le propriétaire de l’entreprise, ouvrez l’état de licence dans l’interface. Sans entitlements d’essai, vérifiez que l’interface explique l’indisponibilité et que l’API ne permet pas l’écriture. Répétez avec une licence de test valide pour `CONDITION_BASED_PM` si vous devez tester les alarmes. Ne modifiez pas les fichiers de licence de production pour ce test.
4. Sur Android, ouvrez les PM des TEST 03–05 et consultez leur registre/appels et les WO associés. Comparez cycles déclencheurs, relevés, dates, statut, tâches et équipement avec le web.
5. Répétez sur iOS si une version installable est disponible. Si aucun build iOS de test n’est disponible, inscrivez `BLOQUÉ — build iOS`, sans marquer le résultat comme PASS.
6. Sur mobile, vérifiez que les formulaires avancés ne proposent pas une modification partielle trompeuse : la configuration des packages/cycles se fait sur le web dans cette version.
7. Si une saisie de relevé échoue à cause du réseau, vérifiez le registre et les WO avant de renvoyer la saisie. Il ne doit pas y avoir de doublon.

**Résultat attendu :** droits, séparation d’entreprise et entitlements sont imposés côté interface et côté API; les données de lecture mobile correspondent au web.

### 6G. Journaux et compte rendu

Après les scénarios qui ont échoué, récupérez les journaux récents :

```bash
cd ~/Projet/cmms
sudo docker compose logs --since=30m api
sudo docker compose logs --since=30m frontend nginx
```

Ne partagez jamais de mot de passe, jeton JWT, clé de licence privée ou secret. Pour chaque anomalie, recopiez le message UI, l’heure approximative et la route/API si visible dans l’onglet **Network** du navigateur.

---

## Tableau de recette à remplir

### Essais déjà rapportés par l’utilisateur

Ne pas refaire ces premières étapes sauf si une régression apparaît :

- **Liste de tâches réutilisable — partiellement validée :** une liste et ses opérations ont été créées depuis le formulaire PM, puis l’utilisateur a confirmé que la bibliothèque de listes était disponible. Il reste à confirmer dans un WO généré que les opérations et leur ordre sont conservés après rechargement.
- **PM hebdomadaire — création et modification validées :** l’utilisateur a créé/recréé un PM hebdomadaire puis testé son édition. Les champs compteur `Reference reading` et `Cycle interval` arrivaient à `null` dans le formulaire d’édition; le correctif a été appliqué et l’utilisateur a confirmé que l’édition fonctionnait ensuite.
- **PM de recette actuellement signalés :** `PM00004` — `PM01 CalBAse`, dont le titre d’ordre modèle est `WEEKLY INSPETION PM`; `PM00005` est un autre PM de type **Plan standard**. Les équipements `Elution Heaters` et `Z-type Conveyor` ont aussi été signalés comme créés. Le PM qui génère `WO000014` est bien `PM00004`.
- **Ordre récent observé :** `WO000014` porte le titre `WEEKLY INSPETION PM`, le statut `In Progress`, la priorité `High`, la description `CARRY OUT WEEKLY INSPETION PM`, l’emplacement `Main Warehouse (TRAME D'ACCUEIL/OUAGA 2000)` et l’équipement `Primary Crusher`. Sa fiche affiche `Preventive Maintenance: PM01 CalBAse` (`PM00004`), cohérent avec le PM source. Le registre affiche l’occurrence prévue du 12 octobre, puis les prochaines semaines. Le WO a été créé le 6 octobre et son échéance est le 10 octobre.
- **Vérification des dates du WO :** lors d’une configuration antérieure, les valeurs données étaient `Due Date Delay = 4 jours` et `Create WO Before Due Date = 7 jours`. Pour l’occurrence du 12 octobre, le job devait donc partir le 5 octobre; le plan ayant été créé/modifié le 6 octobre à 13:29, Quartz a rattrapé le déclenchement manqué et créé le WO à 13:31. Le code calcule l’échéance à partir de l’heure de création réelle du WO plus `Due Date Delay`; 6 + 4 jours donne le 10 octobre. Les valeurs plus récentes (`5` et `9` jours) ne recalculent pas un WO déjà généré. SAP distingue aussi la date d’appel/création de l’ordre de la date planifiée de l’appel ([SAP Help — Call Horizon](https://help.sap.com/doc/saphelp_nw70/7.0.12/ja-JP/3c/abb377413911d1893d0000e8323c4f/content.htm?no_cache=true), [SAP — Maintenance Plan Schedule](https://help.sap.com/docs/SAP_S4HANA_CLOUD/f9ba73d1b8c543c2bd2ba1666271af86/c0c6fe7dd1414f179cb78aa9162c6d56.html?locale=en-US)). QPM utilise ici un délai fixe en jours, qui n’est pas identique au call horizon SAP en pourcentage.
- **PM compteur `Hours On Going` :** le registre montre `100 H`, `200 H`, `300 H` à venir et aucun WO récent. C’est attendu tant qu’aucun nouveau relevé n’a atteint le prochain seuil. La fiche montrait à tort `Scheduled date`, `Every 1 day` et une date de départ : ce sont les champs calendaires par défaut conservés sur l’entité pour satisfaire le modèle, pas le déclencheur réellement utilisé. Le traitement des relevés ne sélectionne que les plans `METER`; les appels calendrier utilisent séparément `CALENDAR`. La fiche PM est corrigée pour afficher **Basé sur un compteur**, le compteur, sa référence, son intervalle et le prochain seuil, sans exposer la cadence quotidienne factice ni l’anticipation calendrier.

Les statuts ci-dessous distinguent ces confirmations partielles des scénarios qui n’ont pas encore été rapportés.

| Test | Résultat | ID PM / équipement | IDs WO | Commentaire / anomalie |
| --- | --- | --- | --- | --- |
| TEST 01 — PM simple | Partiel — WO `WO000014` correctement rattaché à `PM00004`; échéance cohérente avec les valeurs lors de sa création | `PM00004` — `PM01 CalBAse`; équipement `Primary Crusher` | `WO000014` — In Progress | Vérifier les tâches et leur ordre dans le WO |
| TEST 02 — Stratégie calendaire | À faire |  |  |  |
| TEST 03 — Stratégie compteur | Partiel — seuils 100/200/300 H affichés; aucun WO attendu avant le seuil | `Hours On Going`; équipement `Z-type Conveyor` | Aucun pour le moment | Vérifier que la fiche affiche le type compteur et tester un relevé atteignant 100 H |
| TEST 04 — Multi-compteurs OR | À faire |  |  |  |
| TEST 05 — Multi-compteurs AND | À faire |  |  |  |
| TEST 06A — Formulaire / validation | Partiel — création et édition PM testées après correctif des champs compteur nuls |  |  | Refaire uniquement si un formulaire échoue encore |
| TEST 06B — Bornes / relevés | À faire |  |  |  |
| TEST 06C — Report d’appel | À faire |  |  |  |
| TEST 06D — Récurrence / fuseau | À faire |  |  |  |
| TEST 06E — Alarmes compteur | À faire / Bloqué licence |  |  |  |
| TEST 06F — Droits / mobile | À faire / Bloqué plateforme |  |  |  |

Pour une anomalie, envoyez le numéro de test et de l’étape, le résultat attendu/observé, l’ID PM, le relevé avant/après, l’ID WO s’il existe, une capture sans données sensibles et les quelques lignes de journal pertinentes. Cela permettra de reprendre exactement au bon endroit.

## À confirmer avec le site avant de changer les règles métier

La recette doit constater ces comportements sans leur donner automatiquement le statut de règle approuvée :

- Si un relevé saute plusieurs seuils compteur, faut-il créer un WO par seuil manqué ou seulement pour le cycle courant ?
- Un cycle suivant doit-il être bloqué tant que le WO du cycle précédent reste ouvert ?
- En mode AND, que faire si un compteur atteint plusieurs cycles avant que le dernier compteur du groupe soit dû ?
- Quelles priorités, dates d’échéance et règles de signature doivent être copiées dans les WO PM du site ?
- Quels rôles peuvent reporter un appel calendaire, et quelles raisons de report doivent être obligatoires ?

Documentez la réponse et le nom/fonction du validateur métier avant toute modification de ces règles.

## Limites connues à garder en tête

- Un plan multi-compteurs combine plusieurs compteurs du même équipement; les cycles calendrier et compteur ne sont pas combinables dans un même cycle set.
- Les seuils compteur sont prévisionnels en valeur, sans date calculée depuis un taux d’utilisation.
- La génération et la présentation d’un appel dépendent des jobs serveur, du fuseau de l’entreprise, du délai d’anticipation et de la date actuelle. Un aperçu seul ne prouve pas la génération réelle.
- Les règles concernant les cycles sautés, les WO précédents encore ouverts et les cas avancés AND doivent être validées avec le site.
- L’installation iOS dépend d’un build iOS disponible; l’absence de cet artefact doit être déclarée comme bloquante pour la recette mobile iOS.
