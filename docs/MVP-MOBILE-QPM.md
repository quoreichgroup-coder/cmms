# Périmètre MVP mobile QPM — décision de passage au Web

**Backlog UI/UX complémentaire :** la navigation flottante Scan, la séparation Home/Stats et l’audit des cartes sont cadrés dans [`FINAL-UIUX-MAINTENANCE-BACKLOG.md`](FINAL-UIUX-MAINTENANCE-BACKLOG.md). Ils ne sont pas déclarés implémentés par les correctifs d’accessibilité recensés ci-dessous.

**Révision :** 20 octobre 2026
**Cible :** pilote mobile de maintenance minière sur convoyeur
**Règle :** poursuivre les backlogs Mobile et Web en parallèle; la recette du pilote Mobile reste un critère de validation terrain et ne bloque pas les améliorations Web. Le Web existant reste la surface de planification et d’administration qui n’est pas disponible dans l’app mobile.

## Décision proposée

QPM a assez de fondations mobiles pour entrer en validation de bout en bout, mais le MVP n’est pas encore accepté comme prêt pour le terrain. Les sources montrent les écrans et interactions, et les tests automatisés couvrent plusieurs garde-fous; ils ne prouvent ni l’accès stable à l’API de test, ni le rendu Android/iOS réel, ni l’exactitude d’une intervention enregistrée dans une installation représentative.

Le prochain jalon reste une validation opérationnelle sur téléphone de l’APK 1.0.59, avec une entreprise, un utilisateur technicien et un utilisateur responsable de test. L’archive du 20 octobre est signée, versionCode 42, et inclut le code Mobile courant; elle n’a pas encore été installée/testée sur un appareil physique. La refonte Web est en parallèle dans `frontend/`; elle ne nécessite pas de recréer le Web existant.

## Périmètre inclus

| Priorité | Parcours mobile                                            | État vérifié dans le dépôt                                                                                                                                                                                                                                                                                                                                                                                                                   | Critère d’acceptation MVP                                                                                                                                                                                                                                                                                                                                              |
| -------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Démarrage, choix/validation du serveur, connexion, session | Écrans Auth et service API présents; URL par défaut dans `mobile/apiConfig.ts`. Les derniers diagnostics transmis dans cette conversation montraient des 502 dus au démarrage API; l’état actuel du serveur n’est pas confirmé.                                                                                                                                                                                                              | URL de l’instance de test validée; connexion/reconnexion fonctionne; erreurs de réseau visibles et relançables; aucun secret consigné dans les captures.                                                                                                                                                                                                               |
| P0       | Autorisations et contexte d’entreprise                     | Les écrans utilisent les permissions existantes; l’API reste l’autorité.                                                                                                                                                                                                                                                                                                                                                                     | Les rôles demandeur, responsable et technicien ne voient et ne modifient que ce que leur compte permet; vérifier aussi une permission refusée et une fonction/licence indisponible.                                                                                                                                                                                    |
| P1       | Tableau de bord technicien                                 | Cartes reliées aux données analytics du dépôt; erreurs, chargements et valeurs nulles ont des états UI dédiés selon les lots précédents.                                                                                                                                                                                                                                                                                                     | Compter les WO de test depuis l’API et comparer chaque carte; `0`, « indisponible » et « chargement/erreur » doivent être distincts.                                                                                                                                                                                                                                   |
| P1       | Demande → qualification → ordre de travail                 | Listes, détails, création et décisions de demande sont présentes dans `mobile/screens/requests/`; WO créable et éditable dans `mobile/screens/workOrders/`.                                                                                                                                                                                                                                                                                  | Une demande liée au convoyeur est consultée par le responsable, qualifiée selon les options existantes, puis reliée à un WO sans doublon ni perte de contexte.                                                                                                                                                                                                         |
| P1       | Exécution et clôture d’un WO                               | Détail et tâches, temps, pièces, commentaires et fichiers sont présents. `WODetailsScreen.tsx` vérifie les champs configurés pour la clôture; feedback/signature sont conditionnels aux préférences et à la configuration de l’ordre. Les doubles envois sont verrouillés.                                                                                                                                                                   | Le technicien trouve son ordre, exécute les opérations permises, constate chaque erreur/succès, puis clôt une seule fois. Les champs obligatoires bloquent la clôture et indiquent quoi corriger; retour API en échec garde la possibilité de réessayer. Tester l’action finale avec puis sans feedback/signature obligatoire.                                         |
| P1       | Actif et emplacement                                       | Liste, hiérarchie, fiche Asset 360 mobile, relations, ordres et compteurs sont présents.                                                                                                                                                                                                                                                                                                                                                     | Retrouver le convoyeur par identifiant; vérifier emplacement, parent/enfant, WO liés et dernières valeurs de compteur contre l’enregistrement source. Un écran vide ne doit pas être confondu avec un échec réseau ou un refus d’accès.                                                                                                                                |
| P1       | Maintenance préventive côté terrain                        | `PreventiveMaintenancesScreen.tsx` et `PreventiveMaintenanceDetailsScreen.tsx` proposent consultation, registre paginé des appels et navigation vers les WO générés. La création/configuration avancée des plans se fait sur le Web existant.                                                                                                                                                                                                | Distinguer date planifiée et cible compteur; ouvrir l’appel et son WO; vérifier date, état et équipement. Ne pas présenter une estimation ou un seuil d’alarme comme une occurrence PM.                                                                                                                                                                                |
| P1       | Confirmation d’intervention                                | Suppressions/archivages ont des dialogues et protections contre double envoi; la clôture suit les exigences configurées dans les préférences et champs de WO.                                                                                                                                                                                                                                                                                | Avant le pilote, observer et documenter la confirmation effective à l’écran de clôture pour les deux configurations. Aucun nouveau statut ou champ métier n’est introduit par le MVP. Toute étape de confirmation supplémentaire reste une modification d’interaction à valider séparément.                                                                            |
| P2       | PDF WO, prévisualisation et impression                     | Mobile télécharge le PDF via le rapport WO. Dans le Web, le bouton `preview_print` appelle `/report/{id}/stream` puis déclenche un téléchargement du fichier; il n’affiche pas le PDF dans une visionneuse. L’action séparée `issue_archive_document` archive un document immuable avec SHA-256, version du modèle, locale et contexte instantané via `/report/issue`. Aucune garde ne vérifie qu’un aperçu a été consulté avant l’émission. | Vérifier le rendu réel sur téléphone et navigateur. Le prochain lot Web doit afficher le PDF configuré dans un aperçu avant impression et clarifier la distinction brouillon/émission; préserver le registre d’émission et les endpoints. Jusqu’à cette mise à jour, l’utilisateur peut télécharger puis ouvrir le document avant d’émettre, mais QPM ne l’impose pas. |
| P2       | Apparence, langues et ergonomie terrain                    | Thèmes Light/Dark/System, tokens QPM, cartes arrondies, états de chargement/erreur et plusieurs contrôles d’accessibilité sont présents.                                                                                                                                                                                                                                                                                                     | Vérifier visuellement Android et iOS en clair/sombre, clavier ouvert, petit téléphone et tablette; vérifier français/anglais et contraste des statuts/priorités.                                                                                                                                                                                                       |

## Frontières du MVP

Le MVP cible le technicien et son responsable sur une intervention corrective de bout en bout, plus la lecture des appels préventifs liés. Il ne comprend pas : fonctionnement hors ligne/synchronisation non documenté comme garanti; création de plans PM avancés sur mobile; nouvelle logique d’approbation; nouveaux statuts; nouveau circuit de sécurité/consignation; refonte des APIs; extension multi-entreprise; nouvel éditeur générique de modèles; ni nouvelles règles d’inventaire.

Les paramètres de maintenance, le stock et les autorisations restent ceux déjà validés par le backend et l’organisation. Les valeurs et seuils de sécurité doivent venir du site pilote, jamais d’une recommandation générique d’interface.

## Repères SAP EAM/PM à adapter

On reprend les repères qui améliorent la traçabilité, sans recopier la complexité des transactions SAP :

- Un objet technique clairement identifié et son emplacement restent visibles depuis l’intervention.
- La demande décrit le signalement; le WO porte la planification et l’exécution. Leur relation et l’historique doivent rester consultables.
- La confirmation d’exécution rend visibles intervenant, temps, opérations réalisées, constats, matériaux et relevés lorsqu’ils font partie du modèle QPM activé. SAP documente ces données comme contenu d’une confirmation d’ordre; QPM conserve ses propres champs, permissions et transitions existants.
- Les échéances PM prévues, les appels générés et les ordres résultants sont trois informations distinctes. Afficher leur date et état séparément aide le planificateur à préparer le terrain.
- L’Asset Overview SAP sert de repère pour hiérarchie, ordres et maintenance planifiée, mais QPM conserve ses onglets et API actuels.

Références officielles : [SAP — Completion Confirmation](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/a5084f96076a4471a9de6e00711ef55d/18f4b853dcfcb44ce10000000a174cb4.html), [SAP — Manage Maintenance Plans](https://help.sap.com/docs/SAP_S4HANA_CLOUD/2dfa044a255f49e89a3050daf3c61c11/f0e9632b0e654fbeae597bad6abb823c.html), [SAP — Maintenance Plan Scheduling Query](https://help.sap.com/docs/SAP_S4HANA_CLOUD/c0c54048d35849128be8e872df5bea6d/f6b4b3ea661d416aa6256d04b9580f0a.html), [SAP — Asset Overview](https://help.sap.com/docs/SAP_S4HANA_CLOUD/2dfa044a255f49e89a3050daf3c61c11/e967ad67b57b499f8c41b8039f9b4c8e.html).

## Backlog de finition et ordre de travail

1. **Valider environnement et données du pilote.** Obtenir un endpoint sain, un compte technicien et un compte responsable, droits/licence cohérents, convoyeur de test, demande et compteur de test. Bloquant si l’API échoue.
2. **Passer les parcours WO sur appareil.** Création/affectation, états, tâches, temps, pièces/fichiers, commentaire, clôture sans puis avec exigences de feedback/signature. Relever les doubles actions, retours d’erreur et données réellement créées.
3. **Passer Asset 360 et PM sur appareil.** Relations, appels, dates, unités, ordres générés, pagination, absence de données et erreurs réseau.
4. **Valider confirmation et reprise.** Vérifier que chaque action finale/destructive indique clairement l’objet touché, le résultat et la récupération si l’API échoue. Ajouter une confirmation seulement si le test montre un risque et après accord sur le parcours, sans altérer les règles métier.
5. **Compléter aperçu/émission de PDF.** Faire afficher le PDF résultant des options choisies avant impression/émission officielle. Garder la génération d’aperçu non archivée distincte de l’émission immuable; reprendre l’API `report/stream` et l’endpoint `report/issue` existants.
6. **QA visuelle Android/iOS.** Installer APK/IPA de test, thèmes, tailles, clavier, navigation retour, lecteurs d’écran et captures. Toute vérification iOS reste ouverte jusqu’à installation d’un IPA/TestFlight sur iPhone.
7. **Décider le gel mobile.** Aucun P0/P1 bloquant ouvert, parcours WO complet réussi, pas de mutation dupliquée, captures acceptées et journal des écarts signé. Ensuite seulement, cadrer le premier lot de refonte Web sur les mêmes règles UX.

## Critères de passage au Web

- Le service API utilisé par le test répond durablement aux routes requises; le navigateur et le téléphone utilisent la même instance.
- Un scénario de demande→WO→exécution→clôture réussit avec rôles réels et données vérifiées dans l’interface, et aucune donnée n’est perdue ou dupliquée.
- Un appel PM calendaire et un appel compteur sont présentés sans ambiguïté; la navigation vers le WO est validée.
- Les états chargement, vide, erreur, accès refusé et succès ont été vus au moins une fois.
- L’APK installé correspond au commit et aux sources du test; le rapport du test note les écarts iOS non encore levés.
- Le PDF est aperçu avant émission officielle, ou le risque est explicitement accepté comme hors MVP pilote.

La disponibilité d’écrans Web existants n’est pas un obstacle. Le jalon « passage au Web » signifie commencer leur harmonisation après cette acceptation mobile, en réutilisant les mêmes libellés, statuts, confirmations et composants sémantiques tout en conservant les API et permissions Web existantes.

## Éléments vérifiés et limites

Vérifié dans le dépôt le 12 octobre 2026 : Expo 53, React Native 0.79.6, React 19, React Native Paper 5; version mobile 1.0.58; flux de validation/clôture WO, téléchargement PDF mobile, configuration/émission de rapports et document archivé côté Web, PM mobile en lecture et registre des appels; tests de régression mobiles et vérifications TypeScript/export consignés dans `theme-harmonization/08-IMPLEMENTATION-PLAN.md`.

À vérifier en exécution : disponibilité actuelle de l’API de test (le dernier diagnostic historique partagé indiquait 502 et erreurs de validation de schéma), cohérence des données visibles avec le backend, rendu natif/iOS, flux de confirmation exact selon la configuration réelle du WO, aperçu imprimable avant émission, permissions/entitlements de l’organisation pilote et fonctionnement hors réseau. Les tests de compilation ne remplacent pas ces contrôles.

## Vérifications de livraison — 12 octobre 2026

- APK Android `1.0.58` reconstruit depuis les sources présentes, sans incrément de version; package `com.atlas.cmms`, `versionCode 41`. Taille : 101 Mio. Signature APK v2 vérifiée et identique à celle de `1.0.57`.
- `npm run test:mobile-regression` : 8 suites réussies; `npx tsc --noEmit --pretty false` : réussi.
- `npx expo export --platform ios` : bundle iOS exporté avec succès (2 171 modules). C’est une vérification JavaScript, pas un IPA installable.
- iOS reste à produire et tester avec EAS et une signature Apple. Le poste Linux ne dispose pas de Xcode; un jeton Expo et les credentials Apple du projet sont requis.
- API de test, affichage des données en direct et parcours sur appareils physiques restent à valider avec les comptes pilotes. Le parcours d’aperçu du PDF avant émission reste un critère MVP ouvert.

## Revalidation après le dernier lot mobile — 12 octobre 2026

- L’APK de production a été reconstruit après le lot d’accessibilité des interrupteurs partagés. `mobile/dist/QPM-1.0.58.apk` est daté du 12 octobre à 23:13, pèse 105 612 144 octets et son SHA-256 est `805bee88db9e6fe0dc0b203b8660f1c98c959eeec628a5edc5a93d4848050ab1`.
- L’archive est signée et vérifiée; package `com.atlas.cmms`, version `1.0.58`, `versionCode` 41. Son empreinte de certificat SHA-256 correspond à celle de l’APK 1.0.57, donc Android peut l’installer comme mise à jour signée.
- Après cette dernière modification, les huit suites de `npm run test:mobile-regression`, `npx tsc --noEmit --pretty false` et l’export Expo iOS (2 171 modules) réussissent. Le build Android release finit avec `BUILD SUCCESSFUL`.
- Un IPA signé n’a pas été produit : le poste courant est Linux et n’a pas Xcode. Il faut un projet EAS lié, un jeton Expo valide et les credentials Apple Developer pour exécuter le profil `preview`; l’installation et la recette iPhone restent ouvertes.
- La validation physique Android demeure nécessaire. L’émulateur/appareil ADB n’était pas connecté durant ce contrôle; le guide [`GUIDE-TEST-VISUEL-MOBILE.md`](GUIDE-TEST-VISUEL-MOBILE.md) détaille l’installation, les parcours, les captures attendues et les critères d’acceptation.
- Audit du PDF Web : `ReportConfigModal.tsx` appelle `getPDFReport` pour l’action `preview_print`; le thunk `frontend/src/slices/workOrder.ts#getPDFReport` crée un lien de téléchargement. Le bouton d’émission est indépendant. Il s’agit d’un écart UX Web confirmé à corriger dans son lot après validation mobile, sans confondre ce point avec une défaillance de l’API PDF.

## Derniers correctifs mobile — 12 octobre 2026

- Les fiches Actif et Emplacement affichent leur identifiant court dans l’en-tête; le nom complet reste dans le contenu. Les onglets restent défilables et utilisent moins d’espace horizontal sur les petits écrans.
- Le dialogue de rejet d’une demande conserve le motif pendant les rendus et après une erreur API, bloque les envois multiples et empêche sa fermeture pendant l’envoi. Endpoint, permission et paramètre `reason` inchangés.
- Revalidation après ces changements : huit suites mobiles réussies, TypeScript sans erreur, Prettier et `git diff --check` réussis; `expo export --platform android` a généré le bundle pour 2 202 modules.
- Ce contrôle de bundle ne remplace pas l’installation d’un APK et un test tactile. Restent à tester sur Android les scénarios de rejet avec erreur puis reprise, et les fiches Asset/Location à 360/390 dp avec défilement jusqu’au dernier onglet. Le test iOS nécessite encore une build/signature EAS et un appareil iOS.

## Garde des contrôles de formulaire — 12 octobre 2026

- Lorsqu’un formulaire envoie des fichiers ou attend la réponse API, les champs composés restent maintenant désactivés eux aussi; les callbacks arrivés en retard ne modifient pas l’état local. L’enregistrement audio doit être arrêté avant de soumettre le formulaire, et l’interface l’explique.
- Vérifications après ce lot : neuf suites de régression réussies, TypeScript, Prettier et `git diff --check`; exports Expo Android (2 203 modules) et iOS (2 172 modules) réussis. Cela valide les bundles JavaScript, pas la lecture tactile des contrôles sur appareils.
- Test d’acceptation appareil restant : soumettre un formulaire avec pièces jointes sur réseau lent; tenter de toucher dates, priorité, sélection, scan et signature pendant l’envoi; démarrer/arrêter l’audio et vérifier que l’envoi n’est possible qu’après arrêt. Vérifier une soumission normale et son réessai après erreur.

## Qualification d’une demande liée à un actif — 12 octobre 2026

- Le Web demande un nouvel état d’actif lorsqu’un superviseur approuve une demande associée à un équipement; l’application mobile omettait cette décision et envoyait un corps vide. L’API existante accepte `assetStatus` et met à jour l’actif si la valeur est fournie.
- Le mobile présente maintenant les mêmes options et la même valeur par défaut que le Web, puis envoie le choix à l’endpoint existant. Si la demande n’a pas d’actif, le payload demeure vide. L’accès mobile à l’action suit le gate UI Web existant, sans toucher aux contrôles serveur.
- Le test de contrat vérifie le payload avec un statut; l’approbation sans statut conserve le test précédent `{}`. Les neuf suites, TypeScript, formatage et exports Expo Android/iOS réussissent. Test physique restant : approbation avec/sans actif et confirmation que l’état effectivement appliqué correspond au choix sous les rôles SETTINGS et LIMITED_ADMIN, puis vérification du refus sans droit de création WO.

## Lisibilité du registre PM mobile — 12 octobre 2026

- La fiche d’un plan multi-compteurs présentait les règles `AND`/`OR` comme codes techniques. Elle explique maintenant, en français ou en anglais, si tous les seuils doivent être atteints ou si un seul seuil suffit à générer le WO. Les pastilles « généré/terminé » prennent la couleur de texte de succès du thème, y compris en mode sombre.
- Aucun état PM, règle de déclenchement ou API n’est modifié. TypeScript, neuf suites mobiles, Prettier et les exports Expo restent les portes de contrôle; le rendu final dans les deux thèmes/langues demande encore un contrôle sur appareil.

## Revalidation de l’APK — 13 octobre 2026

- L’APK `mobile/dist/QPM-1.0.58.apk` a été reconstruit après les lots les plus récents, sans incrément de version. Package `com.atlas.cmms`, version `1.0.58`, `versionCode` 41; taille 105 619 996 octets.
- SHA-256 APK avant le lot dashboard : `c752b09cf160bbfedc686031daf1e89a5c8fe3a13705f28c703d87cda8be5a60`. La release finale après le lot dashboard est documentée ci-dessous; les deux builds conservent le même certificat et la même version.
- TypeScript et neuf suites de régression passent. Les exports Expo Android (2 203 modules) et iOS (2 172 modules) passent aussi. Le build Android release s’est terminé avec `BUILD SUCCESSFUL`.
- L’IPA iOS n’a pas été produit et l’APK n’a pas été installé sur un appareil pendant cette vérification; Android physique, parcours API réels et rendu iOS restent donc à accepter avec le guide [`GUIDE-TEST-VISUEL-MOBILE.md`](GUIDE-TEST-VISUEL-MOBILE.md).
- Aucun changement Web n’a été effectué. L’harmonisation Web reste le jalon après validation/sortie du pilote mobile.

## Fiabilisation du choix de serveur — 13 octobre 2026

- Le formulaire de configuration du serveur localise désormais les erreurs de schéma/HTTPS en français et anglais. Une expiration de la vérification devient une erreur de serveur inaccessible compréhensible.
- Enregistrer, Réinitialiser et Annuler ne peuvent plus se chevaucher pendant une mutation. La réinitialisation montre son état occupé et rapporte les échecs au lieu de rester silencieuse. L’URL normalisée, le test de `instance-config`, le stockage local et l’API n’ont pas changé.
- TypeScript, neuf suites de régression, `git diff --check` et les exports Expo Android/iOS passent. L’APK 1.0.58 a été reconstruit et sa signature, son identité et son archive ont été contrôlées. Le test tactile du changement/réinitialisation de serveur reste à faire sur l’appareil.

## État d’erreur des statistiques du tableau de bord — 13 octobre 2026

- Si les préférences du dashboard ou `analytics/work-orders/mobile/overview` échouent, la vue affiche maintenant une bannière visible, localisée et relançable au-dessus des cartes. Le pull-to-refresh reste disponible; les nombres chargés précédemment sont conservés, et les zéros réels restent distincts des valeurs inconnues.
- Aucun appel, filtre `assignedToMe`, payload ou permission ne change. TypeScript, neuf suites, `git diff --check`, exports Expo Android (2 203 modules) et iOS (2 172 modules) passent.
- L’APK `mobile/dist/QPM-1.0.58.apk` contient ce lot. Taille 105 621 620 octets; SHA-256 `d95aadc062eb388f47d056e3533467aeb2d90d860f2f73198dc099b468443f2f`; signature v2 valide, certificat inchangé, package `com.atlas.cmms`, `versionCode` 41. Le test de panne puis relance réseau doit être fait sur appareil.

## Création partielle d’un WO avec tâches — 13 octobre 2026

- Le flux crée d’abord le WO, puis attache ses modèles de tâches via l’endpoint existant. Si l’attachement échouait, le formulaire pouvait signaler un échec générique alors que le WO était déjà persisté; un nouvel envoi risquait donc de produire un doublon.
- Le client distingue maintenant cet échec secondaire, indique que le WO existe déjà et ouvre sa fiche pour contrôler les tâches. L’identifiant issu de la première réponse est utilisé; aucun nouvel appel de création automatique n’est effectué. Le message recommande de vérifier la fiche, car une erreur réseau peut laisser le résultat de l’attachement incertain.
- Routes, payloads, permissions et séquence d’API restent inchangés. TypeScript, dix suites de régression et les exports Expo Web (1 890 modules), Android (2 204) et iOS (2 170) passent. APK 1.0.58 reconstruit après ce lot : 105 624 384 octets, SHA-256 `7e73b4bc14d610ecf06cea4a840cf899354c3c1c707ebdafce4de930a392db75`; archive valide, signature v2 valide, certificat inchangé, package `com.atlas.cmms`, `versionCode` 41. L’IPA iOS n’a pas été produite. Le scénario de coupure réseau après création reste à exercer sur instance de test avant acceptation terrain.

## Contrôle des données obligatoires de clôture WO — 13 octobre 2026

- La clôture d’un ordre ne se fie plus à des listes vides quand la lecture API des pièces, coûts ou commentaires échoue. Les données configurées comme obligatoires doivent avoir été chargées avant d’évaluer leur présence; un échec reste distinct d’une donnée manquante, affiche une relance et bloque la clôture jusqu’à récupération. Les exigences de champs, transitions, rôles, endpoints et payloads restent inchangés.
- Vérification locale : Prettier, TypeScript et les 11 suites mobiles passent; les exports Expo Web (1 890 modules), Android (2 204) et iOS (2 173) passent.
- APK reconstruit sans changement de version : [`mobile/dist/QPM-1.0.58.apk`](../mobile/dist/QPM-1.0.58.apk), 105 631 100 octets, SHA-256 `d51587720fa21c3cc15df74803037737fc715eed06d592ac5d291b71a7795809`. Signature v2 valide et certificat SHA-256 toujours `a31877eaf8a0490bae0af0915f9eeff8153fd00a322e40bfbdebcf84204cd4e5`; package `com.atlas.cmms`, version `1.0.58`, `versionCode` 41. Le bundle embarqué contient le nouveau message d’échec de chargement des données de clôture.
- Reste à vérifier sur une instance et un téléphone : provoquer un échec de lecture de chaque rubrique requise, confirmer blocage puis relance, et tester les branches de feedback/signature. Le test Expo iOS compile le bundle, mais ne remplace pas un IPA signé; EAS/identifiants Apple et appareil iOS sont requis.
- Aucun code Web n’a été changé dans ce lot. L’application Web existe déjà; elle sera le prochain périmètre de travail après l’acceptation des critères mobile encore ouverts, notamment la recette API/appareil et l’aperçu PDF avant émission.

## Erreur de chargement des commentaires WO — 13 octobre 2026

- Le thunk de commentaires conserve son rejet pour ses appelants explicites, en plus d’enregistrer l’état d’erreur par WO. L’effet d’ouverture de la fiche consomme maintenant ce rejet : l’écran continue d’utiliser l’état de chargement/erreur réessayable au lieu de créer une promesse non gérée. Aucun endpoint ou comportement d’API ne change.
- TypeScript, Prettier, `git diff --check`, les 11 suites mobiles et les exports Expo Android (2 204 modules) et iOS (2 173 modules) passent.
- APK reconstruit : [`mobile/dist/QPM-1.0.58.apk`](../mobile/dist/QPM-1.0.58.apk), 105 631 108 octets, SHA-256 `77ec0f016b3de8d42050e60b86836c4e4afc458dd9e8272569400b041116605a`. Build release réussi; archive valide, signature v2 valide, certificat inchangé, package `com.atlas.cmms`, `versionCode` 41. Le guide visuel correspond à cette empreinte.

## Reconciliation du splash clair/sombre — 13 octobre 2026

Le code courant contient les ressources de démarrage clair/sombre : `mobile/app.config.ts` active le style système et déclare une image/couleur `splash.dark`; Android embarque couleurs et logos `night`; iOS dispose des variantes de luminosité dans les assets nommés. L’APK release confirme les configurations Android `night` et les deux couleurs. Cela corrige les constats plus anciens de l’audit documentaire. À valider encore par lancement à froid sur Android et iOS; aucun appareil iOS n’est disponible dans cet environnement.

## Contraste de l’en-tête Accueil et reprise Expo — 13 octobre 2026

- La rangée contenant « QPM · Accueil » et la date est transparente dans la carte bleue, afin que le fond par défaut du composant `Themed.View` ne crée pas de bande claire. Les deux libellés utilisent `onBrandHeader`, blanc pur et opaque en thèmes clair et sombre. Contraste calculé avec les tokens : 5,12:1 en clair et 15,35:1 en sombre. Le guide visuel demande une vérification tactile et une capture dans les deux modes.
- TypeScript, Prettier, `git diff --check`, 11 suites de régression mobiles et export Expo Android (2 204 modules) et iOS (2 173 modules) passent. L’APK `1.0.58` a été reconstruit sans changer le `versionCode` 41; taille 105 631 132 octets, SHA-256 `701a48b030da01a6fc2c9f3f84b240b2ea4fa5f5153287642b6d2d2d59b00209`; signature v2 valide et certificat QPM conservé.
- Metro a été démarré sur `localhost:8099`; `/status` a répondu HTTP 200 `packager-status:running`, puis le serveur de vérification a été arrêté. Le cache `/tmp/metro-cache` existant était inaccessible (`EACCES`); démarrer avec `TMPDIR="$PWD/.build-tools/expo-tmp"` l’a contourné sans effacer le cache partagé. La procédure est ajoutée à `mobile/README.md`.
- Reste à tester l’en-tête sur un vrai Android en clair/sombre et à comparer les captures. Le contrôle Expo iOS compile le même écran, mais ne remplace pas un IPA signé ni un essai sur iPhone.

## Progression réelle des sous-tâches en exécution — 13 octobre 2026

- La jauge mobile et l’exigence de clôture « tâches terminées » classaient `OPEN`, `IN_PROGRESS` et `ON_HOLD` comme terminées dès qu’une valeur existait. La règle partage maintenant le critère du modèle QPM : une sous-tâche n’est terminée que lorsque sa valeur est `COMPLETE`. Les inspections restent renseignées par un résultat, et une lecture numérique valide de zéro reste acceptée.
- Aucun changement de valeur stockée, transition, API, rôle ou payload. Le test couvre chaque état de sous-tâche, les trois résultats d’inspection, les valeurs textuelles et numériques.
- TypeScript, Prettier, `git diff --check`, 11 suites et les bundles Expo Android (2 204 modules) / iOS (2 173 modules) passent. APK 1.0.58 non reconstruit pour ce lot; tester par rechargement de QPM Dev ou reconstruire avant recette production.
- Vérification API/appareil encore requise avec un WO de test contenant une tâche ouverte/en cours/en attente, puis terminée : comparer jauge, blocage de clôture et statut relu après sauvegarde. Le Web existant garde pour l’instant son contrôle actuel; son alignement doit être audité dans le périmètre Web.

## États accessibles de la pièce jointe de tâche — 13 octobre 2026

- L’action d’ajout de photo annonce maintenant `disabled` pour les mêmes motifs que ceux qui désactivent réellement le bouton : chargement, lecture seule ou entitlement absent. L’aide expliquant la licence n’est annoncée que si la licence est effectivement le blocage.
- TypeScript, Prettier, `git diff --check`, onze suites mobiles et exports Expo Android (2 204 modules) / iOS (2 173 modules) passent. Metro LAN est actif sur le port 8086 et `/status` répond `packager-status:running`; le test avec TalkBack/VoiceOver et l’accès réseau depuis le téléphone restent à faire.

## Retour visuel après lecture QR/NFC — 14 octobre 2026

- Après fermeture du lecteur, l’écran de scan affiche désormais un état de progression accessible pendant la résolution de l’identifiant auprès de l’API. Une garde empêche les callbacks répétés de lancer plusieurs recherches ou plusieurs navigations.
- Les règles existantes restent inchangées : seul un 404 confirmé peut proposer la création d’un équipement, et uniquement si l’utilisateur dispose du droit de création; les erreurs réseau et d’autorisation gardent leur traitement d’erreur.
- TypeScript, Prettier, les 13 suites de régression mobile et `git diff --check` passent. Test appareil QR/NFC et réseau lent restant à effectuer.

## Cadre de visée QR/code-barres — 14 octobre 2026

- L’aperçu caméra remplit désormais la zone disponible dans la modale au lieu d’utiliser la hauteur entière de la fenêtre. Un cadre de visée responsive et l’indication localisée « En train de scanner / Scanning » guident l’alignement du code; le lecteur expose également un nom et une aide d’accessibilité.
- Le traitement du premier scan, la permission caméra, le callback et la résolution serveur sont inchangés. Vérifications : TypeScript, Prettier, `test:mobile-regression` (14/14), export Expo Android (2 211 modules) et `git diff --check` passent. Caméra, dimensions de la modale et lecture TalkBack/VoiceOver restent à tester sur appareil.

## États d’erreur NFC — 14 octobre 2026

- Le modal contrôle la disponibilité matérielle (`isSupported`) et l’état activé (`isEnabled`) avant de lire. Un appareil sans NFC et un NFC désactivé reçoivent des messages distincts, localisés en français et anglais. Les autres erreurs natives utilisent le message générique traduit au lieu d’interpréter `error.message` comme clé i18n.
- L’écran indique maintenant comment positionner le téléphone, avec une couleur de texte issue du thème clair/sombre. Les retours asynchrones après fermeture sont ignorés afin d’éviter une alerte arrivée après avoir quitté le lecteur.
- Le résultat accepté reste l’identifiant renvoyé par `getTag().id`; aucune route, donnée métier ou permission ne change. Test sur téléphone Android et tag réel encore requis pour vérifier les états matériels, l’annulation et le format de l’identifiant.
- Vérifications : TypeScript, Prettier, `test:mobile-regression` (14/14), export Expo Android (2 211 modules) et `git diff --check` passent.

## Cohérence pagination/actualisation des notifications — 14 octobre 2026

- Les pages de notifications sont maintenant protégées par un identifiant de requête, sur le même modèle que les listes WO. Une page qui revient après un rafraîchissement est ignorée par Redux; une erreur de pagination devenue obsolète ne remplace pas l’état de la requête courante dans l’écran.
- Les routes, critères, pagination serveur, notifications et actions utilisateur ne changent pas. Un test différé prouve qu’une page ancienne ne peut pas s’ajouter après la réponse de rafraîchissement.
- Vérifications à enregistrer après exécution : TypeScript, suites mobiles, exports Expo Android/Web et `git diff --check`. La recette appareil doit inclure le scénario d’ordre de réponse décrit dans le guide visuel.

## Cohérence du rafraîchissement des plans préventifs — 14 octobre 2026

- Le geste de rafraîchissement du détail PM recharge la fiche, l’historique des appels et les WO générés. Son indicateur reste maintenant visible jusqu’à la fin des trois lectures, même si la fiche répond plus vite que les historiques.
- Aucun appel, état métier ni permission n’a changé. Vérifications : TypeScript, Prettier, 13 suites mobiles, exports Expo Web (1 895 modules), Android (2 209) et iOS (2 178), et `git diff --check`.

## Confirmation visible après clôture WO — 14 octobre 2026

- Les deux branches existantes de clôture (confirmation directe et collecte configurée de feedback/signature) affichent maintenant un message de succès localisé uniquement après la réponse réussie de l’API. Un échec conserve le comportement de reprise existant.
- Aucun statut, droit, endpoint ou payload n’a changé. Vérifications : TypeScript, Prettier, 13 suites mobiles, exports Expo Web (1 895 modules), Android (2 209) et iOS (2 178), et `git diff --check`.

## Masquage des WO liés sans permission — 14 octobre 2026

- Les onglets Asset 360 « Ordres de travail » et « Inspections » n’affichent plus les valeurs WO éventuellement déjà en cache si le rôle courant ne possède pas la permission de consultation WO. Ils n’appellent pas non plus la liste liée dans ce cas et présentent l’état d’accès refusé.
- Le filtrage d’accès a un test unitaire couvrant un cache non vide sans permission, le cas autorisé et une liste absente. TypeScript, Prettier, 13 suites mobiles, exports Expo Web (1 896 modules), Android (2 210) et iOS (2 179), et `git diff --check` passent. L’API et ses propres contrôles restent l’autorité.

## Actions de pièces jointes selon le droit d’édition — 14 octobre 2026

- Les vues des fichiers Asset, Part et Location consultent maintenant le droit `hasEditPermission` sur leur objet pour afficher ou masquer l’action de retrait. Les fichiers restent ouvrables en lecture; la suppression d’association n’est plus proposée aux utilisateurs en lecture seule.
- Le contrôle s’applique aussi au retrait d’une pièce associée à un Asset dans l’onglet Parts. Le bouton exige le droit d’édition de l’Asset; la navigation vers la fiche pièce reste disponible.
- Les permissions d’édition existantes restent utilisées; les PATCH et règles serveur ne changent pas. Vérifications : TypeScript, Prettier, 13 suites mobiles, exports Expo Web (1 896 modules), Android (2 210) et iOS (2 179), et `git diff --check`.

## Informations d’identification Asset 360 — 14 octobre 2026

- L’onglet Détails expose maintenant aussi fabricant et puissance, champs déjà présents dans `AssetDTO` et dans les traductions QPM. Ils utilisent le champ réutilisable `BasicField`, qui omet les valeurs absentes; aucun contenu ni KPI n’est inventé.
- Aucun endpoint, contrat, permission ou modèle ne change. Vérifications : TypeScript, Prettier, 13 suites mobiles, exports Expo Web (1 896 modules), Android (2 210) et iOS (2 179), et `git diff --check`.

## Annonce accessible des cartes de compteurs — 14 octobre 2026

- Dans Maintenance d’Equipment 360, le libellé d’accessibilité d’une carte compteur contient désormais aussi les dates de dernier et de prochain relevé lorsqu’elles existent. L’unité et le nom restent annoncés; aucune valeur mesurée n’est fabriquée.
- Aucun appel API, permission ou comportement de navigation ne change. Vérifications : TypeScript, Prettier, 13 suites mobiles, exports Expo Web (1 896 modules), Android (2 210) et iOS (2 179), et `git diff --check`.

## Retour d'action pour le rapport PDF WO — 14 octobre 2026

- Depuis le menu de la fiche WO, les sollicitations répétées de génération PDF sont maintenant ignorées tant que la précédente n'a pas fini. Après téléchargement/ouverture, un message de succès localisé informe l'utilisateur; les erreurs restent remontées par le snackbar et l'état occupé est toujours libéré en `finally`.
- Le lot ne modifie ni endpoint, ni configuration du PDF, ni permission. Il améliore seulement le retour Mobile de l'action existante.
- Vérifications : Prettier, TypeScript `tsc --noEmit`, 13 suites de régression mobiles, exports Expo Web (1 896 modules), Android (2 210), iOS (2 179) et `git diff --check`. Le téléchargement/ouverture réels restent à valider sur Android/iOS.

## Annonce accessible des périodes d'indisponibilité Asset 360 — 14 octobre 2026

- Chaque carte d'indisponibilité regroupe maintenant, pour les technologies d'assistance, la section, la date de début et soit l'état « en cours », soit la durée. Les valeurs proviennent des données déjà affichées; aucun motif ni statut n'est déduit.
- Aucun endpoint, droit, modèle ou règle métier n'a changé. Vérifications : Prettier, TypeScript `tsc --noEmit`, 13 suites mobiles, exports Expo Web (1 896 modules), Android (2 210), iOS (2 179) et `git diff --check` passent. Vérification par lecteur d'écran sur appareil réel restant à faire.

## Annonce accessible des résultats d'inspection Asset 360 — 14 octobre 2026

- Chaque résultat d'inspection regroupe maintenant le nom de la tâche, les remarques lorsqu'elles existent et le résultat traduit (ou « non renseigné ») dans son libellé accessible. L'affichage visuel et le chargement à la demande par WO restent inchangés.
- Aucun endpoint, permission, modèle ou statut d'inspection n'a changé. Vérifications : Prettier, TypeScript `tsc --noEmit`, 13 suites mobiles, export Expo Web (1 896 modules), Android (2 207 modules), iOS (2 179 modules) et `git diff --check` passent. Essai TalkBack/VoiceOver sur appareil restant requis.

## Erreur unique et relançable sur le tableau de bord — 14 octobre 2026

- Une erreur de chargement des préférences ou des statistiques affichait auparavant deux alertes et deux boutons « Réessayer ». L'Accueil affiche maintenant une seule bannière localisée en haut, avec le composant partagé `AsyncStateFeedback` et l'action de relance existante.
- Aucun chargement, contrat API, filtre, droit ni donnée de carte n'a changé. Vérifications : Prettier, TypeScript `tsc --noEmit`, 13 suites mobiles, export Expo Web (1 896 modules), Android (2 210 modules), iOS (2 179 modules) et `git diff --check` passent.

## Backlog — WO Complete, verrouillage et réouverture contrôlée

**Décision métier retenue; mise en œuvre en cours.** `COMPLETE` représente la fin opérationnelle du WO QPM, sans prétendre être une clôture financière SAP. Après clôture, les modifications ordinaires par le technicien ou le créateur sont interdites. Un superviseur explicitement habilité peut utiliser « Réouvrir pour correction » avec motif obligatoire; l’historique de la clôture et de la réouverture doit rester append-only. ISO 14224 guide les données de fiabilité/maintenance applicables, pas les rôles ni les transitions.

**État du code au 14 octobre 2026 — socle P0 écrit, validation d’exécution en attente.** L’API refuse les changements ordinaires de statut après `COMPLETE`, protège les mutations/effacements WO ordinaires contre le statut terminé et vérifie l’appartenance à l’entreprise, ajoute un endpoint de réouverture avec permission dédiée et motif obligatoire, sérialise les changements de statut/réouverture via verrou de ligne, et enregistre des événements de clôture/réouverture avec instantané de l’acteur. Les données de signature et de commentaire ne sont conservées que si la requête les omet; les paramètres obligatoires de complétion configurés sont vérifiés côté serveur. La migration ajoute le droit de réouverture aux rôles administrateurs existants et empêche les suppressions qui effaceraient le WO référencé par son journal. La matrice de rôles expose le nouveau droit.

**Avancement P1 au 14 octobre 2026 — parcours mobile et consultation du journal ajoutés.** La fiche mobile masque les transitions ordinaires pour un WO terminé et présente l’action de réouverture uniquement avec le droit dédié. Le motif est obligatoire dans un dialogue, les doubles appuis sont bloqués côté client, les erreurs gardent le formulaire ouvert et le succès actualise l’état et l’historique. Une route de lecture du journal est protégée par l’accès existant à la fiche; la liste chronologique affiche transition, date, acteur et motif. Traductions françaises et anglaises ajoutées. Les tests Java unitaires passent; Android/iOS réel, intégration API/base et accessibilité restent à vérifier.

La validation Java des tests API a depuis été exécutée dans une copie temporaire du module : 304 tests de `WorkOrderServiceTest` et `WorkOrderControllerTest` passent, puis les 6 tests ciblant `Reopen` et `WorkOrderLifecycleEvents` passent après l'ajout du cas interentreprise. Le code et la migration n'ont toujours pas été démarrés contre une base : le socket Docker de cet environnement n'est pas accessible. Le journal métier est protégé contre les mises à jour JPA; l'accès au journal suit les droits de lecture du WO, et l'écran mobile présente les transitions. La vérification d'intégration, le schéma réel et les essais sur appareils restent ouverts.

| Priorité              | Tâche                                                                                                                                                                                                               | Critères d’acceptation                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 — intégrité        | **Écrit, à valider** : transition de réouverture dédiée côté API; refus des transitions ordinaires depuis `COMPLETE`; événements de cycle append-only et suppression du WO avec journal refusée.                    | À tester en intégration : seul le droit superviseur dédié peut rouvrir; motif obligatoire; acteur/date/états/motif conservés; doubles soumissions sûres et événements sans perte.             |
| P0 — droits           | **Écrit partiellement, à valider** : vérification stricte de l’entreprise dans `WorkOrder.canBeEditedBy` / `canBeDeletedBy`; droit dédié exposé dans la matrice de rôles et attribué par migration aux rôles admin. | Tests à exécuter/compléter pour assigné, créateur, demandeur, superviseur autorisé/non autorisé et entreprise étrangère; auditer chaque endpoint de mutation et les rôles historiques.        |
| P0 — clôture          | **Écrit partiellement, à valider** : l’API vérifie les champs de complétion configurés pour fichiers, tâches, temps, pièces et coûts, en plus de la signature requise déjà contrôlée par l’API.                     | Vérifier les mêmes cas que le client et compléter les tests; réponses localisées/actionnables; ne pas perdre feedback/signature existants quand les champs sont omis.                         |
| P1 — Mobile           | **UI réalisée, vérification appareil en attente** : action de réouverture réservée au droit dédié, motif obligatoire, état occupé/erreur/succès et statut ordinaire désactivé sur WO terminé.                       | Vérifier le flux sur Android/iOS, TalkBack/VoiceOver, perte réseau, reprise après erreur; confirmer que le dialogue rend le motif et la validation accessibles.                               |
| P1 — audit métier     | **Lecture API et affichage mobile réalisés, tests unitaires passés; intégration en attente** : journal chronologique des clôtures/réouvertures limité aux utilisateurs autorisés à consulter le WO.                 | Vérifier sur une instance l’isolation entreprise, plusieurs cycles avec acteur/date/motif, ordre chronologique et comportement de chargement/erreur; aucune clôture précédente n’est écrasée. |
| P2 — clôture business | N’introduire une clôture financière qu’après mise en place du règlement des coûts et du contrôle des engagements ouverts.                                                                                           | Critères comptables validés, droit distinct, stratégie de migration/API rétrocompatible et tests de verrouillage financier. Hors MVP mobile courant.                                          |

**Conservation de la preuve :** à la réouverture, les champs actifs `completedBy` et `completedOn` sont réinitialisés afin que le WO ouvert ne compte plus comme terminé; la signature et le feedback restent sur le WO. `WorkOrder` est annoté `@Audited`, et Envers conserve les valeurs précédentes de signature, feedback, statut, date et auteur dans `work_order_aud`; le journal append-only garde en plus chaque transition, l'acteur et le motif. Le test de service vérifie la conservation de signature/feedback et l'ajout de l'événement. La lecture des révisions Envers par l'utilisateur n'est pas dans ce lot.

**Dépendances / précautions restantes :** valider migration/schema et mapping Envers sur une base jetable; tester endpoint et contrôles d’accès en intégration; confirmer compatibilité de la permission ordinale dans les rôles existants; auditer endpoints liés au WO et protections de fichiers/commentaires; vérifier les erreurs localisées et le rendu PDF/aperçu. Fichiers concernés : `api/src/main/java/com/grash/service/WorkOrderService.java`, `api/src/main/java/com/grash/model/WorkOrder.java`, `api/src/main/java/com/grash/model/WorkOrderLifecycleEvent.java`, `api/src/main/resources/db/changelog/2026_10_14_00000000001_work_order_lifecycle_event.xml`, `frontend/src/content/own/Settings/Roles/PermissionsMatrix.tsx`. Références et comparaison détaillées : [`WORK-ORDER-COMPLETION-AND-PRINT-ASSESSMENT.md`](WORK-ORDER-COMPLETION-AND-PRINT-ASSESSMENT.md).

**Suite de tests API ajoutée et exécutée le 14 octobre 2026 :** couverture de contrôleur pour la validation du motif de réouverture, le passage du motif/utilisateur au service et la réponse de l’historique; couverture de service pour l’accès au journal d’événements et le refus avant lecture si le WO n’est pas visible; réouverture d’un WO étranger refusée en 404 sans événement. `WorkOrderServiceTest` et `WorkOrderControllerTest` : 304 tests, 0 échec/erreur; après ajout du cas interentreprise, les 6 tests ciblés `Reopen` et `WorkOrderLifecycleEvents` passent. Les tests ont compilé et tourné dans une copie temporaire `/tmp` car `api/target/classes` du dépôt est non modifiable par l’utilisateur courant. La migration, le mapping JPA et le comportement transactionnel restent à valider sur une base de test.

## Valeur des tâches annoncée dans le parcours WO — 14 octobre 2026

- Les sélecteurs de sous-tâche, d'inspection et d'options annoncent maintenant le nom de la tâche et la valeur actuellement sélectionnée. Une valeur vide est annoncée comme telle; l'écran et le menu déroulant partagent la même liste d'options calculée, y compris en aperçu.
- Les options, sauvegardes, payloads, règles d'exécution et contrats API sont inchangés. Vérifications : Prettier, `tsc --noEmit`, 13 suites de régression mobile, exports Expo Web (1 896 modules), Android (2 210 modules), iOS (2 179 modules) et `git diff --check` passent. TalkBack/VoiceOver sur appareils restent à vérifier.

## Priorité et navigation annoncées dans la liste WO — 14 octobre 2026

- La carte de WO annonce maintenant l’état d’échéance visible (« en retard » ou « échéance imminente ») pour les ordres actifs, et son indice d’accessibilité indique qu’elle ouvre la fiche WO. Le statut COMPLETE n’est jamais annoncé en retard.
- Le même seuil que l’indicateur visuel existant est utilisé; aucune requête, donnée, permission ou règle de tri/filtrage ne change. Vérifications : Prettier, TypeScript `tsc --noEmit`, 13 suites de régression mobile, exports Expo Web (1 896 modules), Android (2 210 modules), iOS (2 179 modules) et `git diff --check` passent. Test lecteur d’écran réel reste à faire.

## État des filtres annoncé dans la liste WO — 14 octobre 2026

- Le bouton de filtres annonce maintenant « Filtres appliqués » lorsque les critères courants diffèrent du jeu de filtres par défaut. L’ouverture, la réinitialisation et les critères transmis restent inchangés.
- Vérifications : Prettier, TypeScript `tsc --noEmit`, 13 suites de régression mobile, exports Expo Web (1 896 modules), Android (2 210 modules), iOS (2 179 modules) et `git diff --check` passent.

## Hiérarchie du formulaire de filtres WO — 14 octobre 2026

- Le formulaire mobile distingue désormais les critères principaux (type, équipement, catégorie, équipe et emplacement) des sections Personnes et Dates, avec un titre de section localisé en français et en anglais.
- La valeur initiale `archived` retombe sur `false` si le champ n’est pas fourni, au lieu de déréférencer une entrée absente. Aucun critère, payload, endpoint ou comportement API n’a changé. Vérifications : Prettier, TypeScript `tsc --noEmit`, 13 suites de régression mobile, exports Expo Web (1 896 modules), Android (2 210 modules), iOS (2 179 modules) et `git diff --check` passent.

## Identification accessible des cartes équipement — 14 octobre 2026

- Le lecteur d’écran annonce maintenant sur chaque carte le nom, le code, l’emplacement lorsqu’il existe et l’état visible de l’équipement. L’indice annonce que l’action ouvre sa fiche, ce qui aide à distinguer des équipements aux noms proches.
- Les informations viennent des champs déjà rendus; aucun appel, endpoint, droit ou donnée n’a changé. Vérifications : Prettier, TypeScript `tsc --noEmit`, 13 suites mobiles, exports Expo Web (1 896 modules), Android (2 210), iOS (2 179) et `git diff --check`. Vérification TalkBack/VoiceOver sur appareil réel restant à faire.

## Navigation accessible dans la hiérarchie équipement — 14 octobre 2026

- Le bouton « Voir les enfants » annonce maintenant le code et le nom de l’équipement parent concerné, puis précise qu’il ouvre la liste des équipements enfants. Les boutons des cartes de la hiérarchie sont ainsi distinguables au lecteur d’écran.
- La navigation et les permissions existantes sont inchangées. Vérifications : Prettier, TypeScript `tsc --noEmit`, 13 suites de régression mobile, exports Expo Web (1 896 modules), Android (2 210 modules), iOS (2 179 modules) et `git diff --check`. Contrôle TalkBack/VoiceOver sur appareil réel restant à faire.

## Formulaires de demande structurés — 14 octobre 2026

- Les formulaires mobiles de création et de modification d’une demande regroupent maintenant les champs visibles en sections : détails, équipement, dates, personnes et informations supplémentaires. Les champs restent filtrés selon la configuration de l’entreprise; les champs personnalisés sont conservés dans leur propre section.
- L’ordre des champs au sein des sections est stable. Aucun champ, validation métier, permission, payload ou contrat API n’a été modifié. Vérifications : Prettier, TypeScript `tsc --noEmit`, 14 suites de régression mobiles et exports Expo Web, Android et iOS réussis. Contrôle visuel sur appareil réel restant à faire.

## Liste de notifications virtualisée — 14 octobre 2026

- La liste paginée utilise maintenant `FlatList`, qui virtualise les notifications au lieu de garder tous les éléments chargés dans un `ScrollView`. Le chargement de page suivante se déclenche en fin de liste; actualisation, pagination, marquage lu, navigation vers la ressource et états vide/erreur restent raccordés aux mêmes actions existantes.
- Aucun endpoint, critère, permission, payload, action de lecture ou règle métier n’a changé. Vérifications terminées : Prettier; `tsc --noEmit`; `test:mobile-regression` (14/14); exports Expo Web (1 897 modules), Android (2 211) et iOS (2 180); `git diff --check` — tous réussis. Les exports temporaires ont été supprimés après vérification. Le comportement visuel, la pagination au défilement et TalkBack/VoiceOver restent à confirmer sur appareil réel.

## Hiérarchie des actifs virtualisée — 14 octobre 2026

- La vue hiérarchique des actifs utilise maintenant `FlatList` comme la vue de recherche/liste déjà existante. Elle continue à consommer la pagination actuelle `GET assets/children/{id}/paginated` via le même thunk et les mêmes pages; les cartes hors écran ne sont plus toutes montées. Un verrou local empêche les appels répétés d’une page lors de déclenchements rapprochés de `onEndReached`.
- L’actualisation, navigation vers les enfants, permission refusée, vide, chargement, erreur initiale, erreur de page et nouvelle tentative restent raccordés aux mêmes données et actions. Aucun endpoint, filtre, payload, droit, modèle ou règle métier n’a changé.
- Vérifications terminées : Prettier; `tsc --noEmit`; `test:mobile-regression` (14/14); exports Expo Web (1 897 modules), Android (2 211) et iOS (2 180); `git diff --check` — tous réussis. Essais de défilement, pagination et lecteur d’écran sur appareil réel restent à faire.

## Répertoires personnes, équipes, fournisseurs et clients virtualisés — 14 octobre 2026

- Les listes paginées People, Teams, Vendors et Customers rendent maintenant leurs cartes avec `FlatList`. Elles conservent les critères de recherche, le chargement page par page existant (10 éléments), les actions d’appel/navigation, le rafraîchissement et les états de permission, chargement, vide, erreur et relance. Un verrou local prévient les chargements de page dupliqués par `onEndReached`.
- Aucun endpoint, paramètre de recherche, payload, droit, filtre ou règle métier n’a changé.
- Vérifications : TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14), Prettier, `git diff --check` et exports Expo Web (1 897 modules), Android (2 211) et iOS (2 180) réussis. Les exports vérifient la compilation ciblée des plateformes, pas la pagination sur appareil. Tests de défilement, pagination et accessibilité réels restent requis.

## Pagination de la hiérarchie des emplacements — 14 octobre 2026

- La vue hiérarchique des emplacements virtualise désormais les cartes avec `FlatList` et demande la page suivante en fin de liste, en réutilisant le thunk, l'ID parent, la hiérarchie, les numéros de page et les données déjà fournis par l'API. Le rafraîchissement, les sous-emplacements, les états de chargement et l'accès refusé sont conservés; un verrou empêche une même page d'être demandée simultanément deux fois.
- Le parcours liste existant reste inchangé. Aucun endpoint, payload, droit ou règle métier ne change.
- Vérifications du lot : TypeScript, Prettier, `test:mobile-regression` (14/14), `git diff --check`, exports Expo Web (1 897 modules) et Android (2 211 modules) réussis. L'export iOS a été interrompu après être resté bloqué à « Starting Metro Bundler » sans produire d'erreur exploitable; la validation du bundle iOS est donc en attente. Pagination sur appareil, VoiceOver et TalkBack restent à tester.

## Détail d'équipe virtualisé — 14 octobre 2026

- L'écran détail d'une équipe rend maintenant sa liste de membres avec `FlatList`, en évitant de monter toutes les cartes utilisateur d'un coup. L'en-tête conserve le nom, la description et le nombre de membres; les actions d'appel et l'ouverture du profil gardent leur comportement. La confirmation de suppression reste montée hors de la liste.
- Aucune donnée d'équipe n'est paginée ou retravaillée côté API. Aucun endpoint, payload, droit, filtre ou règle métier n'a changé.
- Vérifications : Prettier, TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14) et `git diff --check` passent. Les deux essais d'export Expo Web (workers par défaut puis un seul worker) sont restés à « Starting Metro Bundler » sans fichier produit ni diagnostic; exports Android/iOS et validation de bundle pour ce lot restent en attente. Le défilement et l'accessibilité sur appareil restent à vérifier.

## Historique des relevés compteur virtualisé et exports Expo fiabilisés — 14 octobre 2026

- La fiche compteur utilise maintenant `FlatList` pour afficher l'historique par lignes virtualisées; le résumé du compteur, les détails, les déclencheurs WO, les formulaires de lecture, l'édition/suppression selon les droits, le pull-to-refresh, les états de chargement/erreur/vide et l'ordre du plus récent au plus ancien sont conservés. L'endpoint existant retourne toujours la collection complète : seule la création des vues est virtualisée, sans pagination serveur ni nouvelle règle.
- Les répertoires de validation `.expo-check-*` et `.expo-export-*` restaient dans le répertoire projet; Metro surveillait ces artefacts. `metro.config.js` les exclut maintenant explicitement du scan et `.gitignore` les ignore pour éviter qu'ils soient traités comme des fichiers du projet. Les anciens dossiers sont laissés intacts; seuls les trois répertoires temporaires créés pour ce lot ont été supprimés.
- Vérifications : Prettier, TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14), chargement/smoke test de la configuration Metro et `git diff --check` passent. Exports Expo effectués avec un worker, `NODE_OPTIONS=--max-old-space-size=512` et `--no-minify` : Web (1 897 modules), Android (2 211) et iOS (2 180) réussissent. Ils vérifient le bundle JavaScript/plateforme, pas les binaires optimisés/signés ni la navigation tactile. Un essai Web minifié avait été tué avec le code 137 sur l'hôte à court de mémoire; les exports non minifiés ont terminé.
- Aucun endpoint, payload, droit, donnée, statut ou règle métier n'a changé. Il reste à tester le défilement de nombreux relevés, les actions d'édition/suppression et VoiceOver/TalkBack sur appareil; un IPA iOS signé et un APK restent des étapes de build distinctes.

## Historique de maintenance préventive virtualisé — 14 octobre 2026

- La fiche de maintenance préventive utilise maintenant un `SectionList` pour les appels d’entretien et les ordres de travail associés. Le résumé du plan reste en tête; les sections conservent l’ordre, les cartes, les états vide/chargement/erreur, les liens vers les ordres, la reprise sur erreur et les commandes « Charger plus ». Les deux historiques restent paginés côté API par lots de dix et virtualisés côté interface même lorsque l’utilisateur charge plusieurs pages.
- Aucun endpoint, payload, droit, statut, règle métier ni version mobile n’a changé.
- Vérifications : Prettier, TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14) et `git diff --check` réussis. Exports Expo non minifiés à un worker réussis : Web (1 897 modules), Android (2 211 modules) et iOS (2 180 modules). Ils valident les bundles JavaScript, pas une IPA/APK ni le défilement tactile sur appareil.
- À valider visuellement sur appareil : chargement de plusieurs pages pour chaque historique, état vide/erreur séparé, action vers un ordre associé et actualisation par glissement.

## Asset 360 — listes Maintenance virtualisées — 14 octobre 2026

- L’onglet Maintenance de la fiche équipement utilise maintenant `SectionList` pour les compteurs, les plans préventifs et les temps d’arrêt récents. Les plans restent triés par prochaine échéance, les temps d’arrêt affichent toujours les dix plus récents, et les liens ouvrent les détails correspondants. Les états d’attente, d’erreur/réessai, vides, droits refusés et fonctionnalité/licence PM indisponible restent visibles dans leur section.
- Les lignes sont filtrées selon les droits avant leur passage à la liste; la logique de chargement, les endpoints existants, leurs paramètres, la limite de dix temps d’arrêt et les règles métier restent inchangés. La virtualisation limite les vues montées, tandis que les collections API déjà chargées restent en mémoire comme auparavant.
- Vérifications : Prettier, TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14) et `git diff --check` réussis. Exports Expo non minifiés à un worker réussis : Web (1 897 modules), Android (2 211 modules) et iOS (2 180 modules). Exports JavaScript seulement; l’installation et le défilement réel des trois sections restent à valider sur appareil.

## Priorité d’échéance des cartes WO — 14 octobre 2026

- Les cartes WO distinguent visuellement une échéance imminente d’un WO en retard : l’échéance imminente utilise le token sémantique `warning`; le retard garde le token `error` et affiche le badge traduit `past_due`. Les ordres terminés gardent leur date neutre. Le libellé d’accessibilité existant reste en place.
- Aucune date, transition, règle de clôture, API, permission ou requête n’a changé; le calcul de mise en évidence existant est conservé.
- Vérifications : Prettier sur le composant, TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14), `git diff --check` et exports Expo non minifiés Web (1 897 modules), Android (2 211 modules) et iOS (2 180 modules) réussis. Les exports valident les bundles JS, pas les APK/IPA ni le rendu tactile; la vérification visuelle sur Android/iOS reste à faire.

## Accueil QPM et détails de pièces d’équipement — 14 octobre 2026

- L’Accueil rapproche ses cartes de statut de la référence `images/mobile/Home.png` : icône dans un disque teinté sémantiquement, compteur mis en évidence, libellé et affordance conservés. Le raccourci de scan affiche le libellé « Scanner » à côté de l’icône. Les six compteurs, leurs données, les filtres au toucher, les permissions, les routes et la carte de bienvenue gardent leur fonctionnement existant.
- La section des pièces liées dans Asset 360 virtualise ses lignes avec `FlatList` et présente un état vide explicite lorsqu’aucune pièce n’est liée. L’accès à la fiche et la suppression avec confirmation restent soumis aux mêmes permissions et actions.
- Vérifications réussies : Prettier, TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14), exports Expo Web (1 897 modules), Android (2 211 modules) et iOS (2 180 modules), build optimisé du prototype Web et `git diff --check`. Les exports vérifient les bundles, pas le rendu tactile sur appareils. Aucun endpoint, payload, donnée, permission ou règle métier n’a changé.

## Rayons des filtres rapides Work Orders — 14 octobre 2026

- Les filtres rapides et le déclencheur de filtres enum utilisent maintenant le token QPM `radius.pill`; les lignes de choix dans la boîte de dialogue utilisent `radius.control`. L’aspect s’aligne ainsi sur les autres contrôles arrondis sans modifier les critères, la sélection, les couleurs, les permissions ou les requêtes.
- Vérifications : Prettier, TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14), export Expo Android (2 211 modules) et `git diff --check` réussis. Un rendu natif sur écran étroit/thèmes clair et sombre reste à confirmer.

## Badge visible d’échéance imminente WO — 14 octobre 2026

- Les WO actifs dont l’échéance approche montrent maintenant le badge traduit « Échéance imminente »; les retards gardent le badge « En retard ». Les mêmes tokens sémantiques warning/error, seuil de deux jours, exclusion des WO terminés et annonce accessible déjà présente sont conservés.
- Aucun tri, filtre, donnée, permission, règle métier ou API n’a changé. Vérifications : Prettier, TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14), export Expo Android (2 211 modules) et `git diff --check` réussis. Le contraste et le retour à la ligne sont à contrôler en clair/sombre sur téléphone étroit.

## Cohérence des cartes de commentaire WO — 14 octobre 2026

- Les commentaires utilisent maintenant le rayon QPM de carte imbriquée (16 dp); les suggestions de mention, champs d’édition, vignettes et pièces jointes utilisent le rayon de contrôle (10 dp). La hiérarchie visuelle s’aligne sur le système QPM sans changer le contenu ou les actions.
- Édition, mentions, ajout/téléchargement/suppression de fichiers, permissions et services restent identiques. Vérifications : Prettier, TypeScript, `test:mobile-regression` (14/14), export Expo Android (2 211 modules) et `git diff --check` passent. Contrôle visuel sur téléphone reste à faire.

## Sélecteurs mobiles de répertoires et modèles virtualisés — 15 octobre 2026

- `SelectUsersModal`, `SelectTeamsModal`, `SelectVendorsModal`, `SelectCustomersModal`, `SelectMetersModal` et `SelectChecklistsModal` utilisent maintenant `FlatList` sur leurs résultats filtrés. Les vues hors écran ne sont donc plus toutes montées pour les annuaires de personnes/prestataires/clients, les compteurs ou les modèles de tâches.
- Recherche, sélection simple/multiple, identifiants affichés, cases accessibles, actualisation par glissement, états chargement/vide/aucun résultat, action d’invitation, reprise après erreur compteur/checklist et validation depuis l’en-tête restent inchangés. La sélection d’une checklist ajoute toujours ses tâches existantes dans le même ordre et revient au même écran. Aucun endpoint, payload, droit, permission ni comportement de sélection n’a changé.
- Vérifications : TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14), Prettier sur les six écrans, `git diff --check` et exports Expo Android/iOS réussis. Le rendu tactile avec grands annuaires, sélection multiple et lecteurs d’écran reste à valider sur appareils.

## Sélecteur de catégories recherché et virtualisé — 15 octobre 2026

- `SelectCategoryModal` rend maintenant les catégories filtrées avec `FlatList`, ajoute une recherche et actualise la liste par glissement. Le formulaire « Créer une catégorie » reste dans le pied de liste, y compris lorsque la liste est vide.
- Le chargement initial et l’actualisation affichent leur état; une erreur offre une nouvelle tentative et reste visible au-dessus de données précédemment chargées. Les états sans catégorie et sans résultat sont localisés. La création, l’API `getCategories`/`addCategory`, la sélection simple ou multiple et les paramètres de navigation restent inchangés.
- Vérifications du lot : Prettier, TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14), exports Expo Web (1 897 modules), Android (2 211) et iOS (2 180), et `git diff --check`. Recherche/actualisation, gros volume, création en liste vide et thème clair/sombre restent à contrôler visuellement sur appareil.

## État initial des filtres de statut — 15 octobre 2026

- Les boutons `EnumFilter` sont initialisés à partir des filtres reçus dès leur premier rendu. Les filtres par défaut ne sont donc plus brièvement annoncés/affichés comme sélectionnés avant l’effet de synchronisation; les compteurs et l’ouverture de la boîte de dialogue reflètent d’emblée les mêmes valeurs.
- Le calcul de requête, les options, les transitions, les routes et les couleurs sémantiques restent inchangés. Le test de régression couvre le vecteur initial sans sélection, les filtres scalaires et les cas de sélection partielle. Vérifications : Prettier, TypeScript `tsc --noEmit`, `test:mobile-regression` (14/14), export Expo Android non minifié (2 211 modules) et `git diff --check`. L’export confirme la compilation du bundle JavaScript Android, pas le rendu natif des pastilles; Web/iOS et essais visuels restent à valider.

## Messages français de validation complétés — 15 octobre 2026

- L’écran de connexion pouvait afficher la clé brute `id_required` dans le validateur du champ ID lorsque l’authentification par ID était activée. La traduction française est maintenant présente; le libellé de validation `match_at_least_column` manquant est également traduit.
- Aucun formulaire, règle de validation, fournisseur d’identité ou contrat d’authentification ne change. Les tests vérifient les deux libellés et que chaque clé anglaise possède une traduction française non vide. Vérifications : Prettier, TypeScript `tsc --noEmit`, `test:mobile-regression` (14 suites réussies), export Expo Android non minifié (2 211 modules) et `git diff --check`.

## Garde UI de réouverture WO testée — 15 octobre 2026

- La condition d’affichage « Rouvrir pour correction » est isolée dans `canReopenCompletedWorkOrder`, avec les mêmes exigences qu’avant : statut `COMPLETE`, rôle client, aucune relation de super-compte et permission `REOPEN_WORK_ORDERS` dans `editOtherPermissions`.
- Les tests couvrent le cas autorisé et le refus pour statut, rôle, relation ou permission incorrects/absents. Le contrôle UI ne remplace pas l’autorisation API; les endpoints et le motif obligatoire restent inchangés. Vérifications : Prettier, TypeScript `tsc --noEmit`, suites mobiles, export Expo Android et `git diff --check`.

## Libellé de retour traduit dans les formulaires — 15 octobre 2026

- Le champ générique `feedback`, utilisé dans le formulaire de clôture WO et le rejet d’une demande, s’affiche maintenant « Commentaire » en français plutôt que « Feedback ». La description et les validations restent inchangées.
- Le test mobile vérifie le libellé attendu et qu’il ne retombe pas sur la chaîne anglaise. Vérifications : Prettier, TypeScript `tsc --noEmit`, suites mobiles et `git diff --check`.

## Aides de sélection de formulaire localisées — 15 octobre 2026

- Les champs d’équipement, d’emplacement et de pièces présentaient quelques aides en anglais ou sous forme de clé brute, par exemple `additional_workers_description`. Les sélecteurs utilisent désormais les clés localisées déjà présentes pour équipes, fournisseurs, clients, travailleurs et équipements; les aides de base de WO sont également traduites.
- Aucun champ, valeur, endpoint, payload, permission ou comportement de sélection n’a changé. Une régression appelle les générateurs de champs avec une fonction de traduction de test et vérifie que chaque aide passe par la traduction. TypeScript, Prettier, les 14 suites mobiles (81 tests dans la suite principale), l’export Expo Android (2 212 modules) et `git diff --check` passent.

## Production APK 1.0.58 — reconstruction vérifiée le 15 octobre 2026

- Après le lot de localisation des aides de formulaire et la correction des liens profonds, `mobile/dist/QPM-1.0.58.apk` a été reconstruit depuis l’arbre de travail courant avec `NODE_ENV=production npm run build:apk`; Metro a intégré 2 212 modules et Gradle a terminé `BUILD SUCCESSFUL` le 15 octobre (1124 tâches, 45 exécutées).
- L’artefact actuel fait 105 694 784 octets, SHA-256 `112046d3663fbedee30f29022fba3d077aeeba0c66095ea816370cf2a0a0a310`. `apksigner verify --verbose` confirme la signature APK v2; `aapt dump badging` confirme le package `com.atlas.cmms`, `versionName=1.0.58`, `versionCode=41`, min SDK 24 et target SDK 36. Le certificat reste `CN=QPM, O=QUOREICH`, SHA-256 `a31877eaf8a0490bae0af0915f9eeff8153fd00a322e40bfbdebcf84204cd4e5`.
- Les chemins profonds historiques `one` et `two` ciblent maintenant les vrais onglets QPM `Home` et `WorkOrders`, au lieu des écrans de démonstration Expo inexistants. La régression du mapping passe; l’ouverture d’un lien sur appareil reste à vérifier.
- Le numéro de version et le code de version n’ont pas été incrémentés. L’APK est prêt pour installation et recette visuelle; cette compilation ne remplace pas les essais terrain décrits dans `GUIDE-TEST-VISUEL-MOBILE.md`.

## Filtres WO résilients aux options manquantes — 15 octobre 2026

- Un filtre sauvegardé pouvait référencer un utilisateur, un actif ou une autre option qui ne figurait plus dans les options renvoyées au formulaire. La reconstruction de son libellé appelait alors le formateur avec `undefined`. Le formulaire affiche maintenant `#<id>` comme libellé de secours et garde l’identifiant dans le filtre.
- La requête et son contrat API ne changent pas. Un test couvre l’option disponible et l’ID absent, ainsi que la conservation de la liste d’IDs. Prettier, TypeScript, `test:mobile-regression` (14 suites), `git diff --check` et exports Expo Android (2 212 modules), iOS (2 181) et Web (1 898) passent. Les bundles confirment la compilation des cibles JS, pas le rendu sur téléphone. L’APK 1.0.58 présent dans `dist` précède ce correctif et doit être reconstruit pour le tester dans la version installée.

## Recherche multi-champs sans mutation des paramètres — 15 octobre 2026

- `onSearchQueryChange` modifiait le tableau `fieldsToSearch` avec `shift()`. Les vues actuelles construisent le plus souvent ce tableau à chaque frappe, mais tout appelant réutilisant la même liste aurait perdu le premier champ puis ses alternatives. Le helper est maintenant non mutant; le test enchaîne deux changements de requête avec le même tableau, vérifie toutes les alternatives et confirme que les autres filtres sont conservés.
- Aucun champ, endpoint, filtre émis ou règle métier ne change. Prettier, TypeScript, `test:mobile-regression` (14 suites), `git diff --check` et export Expo Android non minifié (2 212 modules) passent. L’APK 1.0.58 actuel précède ce lot et doit être reconstruit avant un test sur build native.

## Libellés accessibles des recherches mobiles — 15 octobre 2026

- Les champs de recherche des WO, actifs, emplacements, compteurs et des sélecteurs actifs/compteurs/fournisseurs/pièces/équipes/clients/utilisateurs/emplacements/checklists utilisent maintenant le libellé traduit `search` pour VoiceOver et TalkBack. Un test de régression parcourt tous les écrans mobiles et s’assure que chaque `Searchbar` expose un nom localisé.
- Les placeholders, filtres, permissions et comportements de recherche ne changent pas. Prettier, TypeScript, `test:mobile-regression` (14 suites), `git diff --check` et export Expo Android non minifié (2 212 modules) passent. L’annonce par lecteur d’écran reste à vérifier sur appareil. L’APK 1.0.58 actuel précède ce lot et doit être reconstruit pour le tester en natif.

## Requêtes concurrentes de la liste des compteurs — 15 octobre 2026

- Si deux recherches compteurs répondaient dans l’ordre inverse de leur lancement, l’ancienne réponse pouvait remplacer le résultat récent et son `finally` pouvait fermer le chargement trop tôt. La liste possède maintenant son propre état de chargement et ignore les réponses de recherche/pagination dont l’identifiant n’est plus actif. Le test reproduit deux recherches chevauchantes, résout la seconde d’abord, puis garantit que la première ne remplace pas ses résultats.
- Les URL, critères, paramètres de pagination, permissions et valeurs métier restent inchangés. Prettier, TypeScript, `test:mobile-regression` (14 suites), `git diff --check` et export Expo Android non minifié (2 212 modules) passent. L’APK 1.0.58 ne contient pas ce lot; il faut une nouvelle build installée pour le vérifier en natif.

## Requêtes concurrentes de la liste des actifs — 15 octobre 2026

- Les recherches et pages d’actifs périmées sont maintenant ignorées après un changement de filtre; l’état de chargement de la liste est isolé du chargement des détails et miniatures. Le test reproduit les réponses dans le désordre sur la première page et la pagination.
- Les appels d’API, paramètres, autorisations et données métier restent inchangés. `test:mobile-regression` (14 suites), TypeScript et exports Expo Android (2 212 modules) / Web (1 898 modules) passent. L’APK 1.0.58 actuel a été construit avant ce lot; reconstruire pour le test natif. Une recette sur appareil avec recherche/pagination et réseau ralenti reste à faire.

## APK 1.0.58 reconstruit — 15 octobre 2026

Après le lot de protection des réponses concurrentes des actifs, l’APK release a été recompilé depuis l’arbre courant. Build Expo/Hermes : 2 212 modules; Gradle : `BUILD SUCCESSFUL` (1124 tâches, 18 exécutées). Fichier `mobile/dist/QPM-1.0.58.apk` (101 Mio), package `com.atlas.cmms`, versionName `1.0.58`, versionCode `41`, signature v2 valide. SHA-256 : `8fdfc6c5ee798de7fe514698214222559d92625701b9995f4ee8afb6c568ad81`. L’installation et la vérification visuelle sur appareil restent à faire.

## États de chargement de la liste Emplacements — 15 octobre 2026

- La liste Emplacements distingue maintenant permission refusée, chargement, absence de résultat et erreur initiale. L’erreur propose une reprise traduite EN/FR; lorsqu’une recherche échoue avec des lignes déjà visibles, un bandeau permet de réessayer. Les lignes ne sont plus rendues lorsque le rôle n’a pas le droit de voir les emplacements.
- La liste a son propre indicateur de chargement et ignore les anciennes réponses de recherche/pagination; les chargements de hiérarchie et de fiche restent indépendants. Aucun endpoint, filtre ni contrôle d’autorisation serveur ne change. Deux nouveaux tests couvrent réponses hors ordre et libération du chargement après erreur. 14 suites, TypeScript, Prettier, `git diff --check` et Expo Android (2 212 modules) / Web (1 898 modules) passent. Le rendu et le changement de permission restent à tester sur appareil; APK 1.0.58 antérieur à ce lot.

## Listes Personnes et Équipes — pagination virtualisée et réponses ordonnées — 15 octobre 2026

- Les annuaires Personnes et Équipes utilisent maintenant `FlatList`, ce qui évite de monter chaque carte lorsque plusieurs pages sont chargées. Les réponses d’une recherche ou d’une page devenue obsolète après un filtre récent sont ignorées; l’indicateur de liste reste indépendant du chargement des fiches.
- Les droits d’accès, recherches, critères, pagination, routes, actions d’appel et endpoints existants sont conservés. Les régressions simulent des recherches concurrentes résolues dans le désordre et le retour tardif d’une ancienne page. Vérifications : `test:mobile-regression` (14 suites), TypeScript, Prettier, `git diff --check` et export Expo Web (1 898 modules) réussis. L’export Android de production inclut ces changements : build Gradle `BUILD SUCCESSFUL`, version `1.0.58`, code `41`, signature v2 valide. Le défilement avec gros annuaires, réseau lent et lecteur d’écran reste à vérifier sur téléphone.

## APK 1.0.58 courant — 15 octobre 2026

`mobile/dist/QPM-1.0.58.apk` a été reconstruit après les corrections des listes Personnes/Équipes. Package `com.atlas.cmms`, `versionName=1.0.58`, `versionCode=41`, empreinte SHA-256 `9c2ef90652c25989543e6e4a2e3c5479b0dd1632c49b8dca13be4b54c59e91bd`; signature vérifiée avec le certificat QPM attendu. Cette build ne comprend pas le correctif Notifications décrit ci-dessous; elle devra être reconstruite pour tester ce correctif dans un APK. Une installation et une recette visuelle restent nécessaires.

## Notifications — fins de requêtes concurrentes — 15 octobre 2026

- Un rafraîchissement plus ancien ne peut plus masquer l’indicateur d’un geste de rafraîchissement plus récent. Quand une actualisation démarre, elle invalide aussi les indicateurs locaux et erreurs d’une pagination en cours; le `finally` tardif de cette pagination ne peut plus effacer l’état du chargement courant.
- Les appels, critères, notifications, navigation et API ne changent pas. Un test vérifie l’invalidation des identifiants de rafraîchissement et de pagination. `test:mobile-regression` (14 suites), TypeScript, Prettier et `git diff --check` passent; exports Expo non minifiés Android (2 213 modules), iOS (2 182) et Web (1 899) réussis. Un test du geste de rafraîchissement et de la pagination sous réseau ralenti reste à faire sur appareil. L’APK 1.0.58 devra être reconstruit pour contenir ce correctif.

## Maintenance préventive — actualisation prioritaire sur la pagination — 15 octobre 2026

- La liste des plans préventifs accepte maintenant un rafraîchissement même si une page supplémentaire est en cours. Le rafraîchissement invalide l’ancienne page; sa réponse, son erreur et son `finally` ne peuvent plus remplacer les données ou indicateurs de la requête récente. Les chargements d’une page en double restent bloqués.
- Le point d’accès `preventive-maintenances/search`, ses critères, le format des pages, les droits et l’ouverture des fiches restent inchangés. Un test vérifie qu’une réponse de page arrivée après un rafraîchissement n’ajoute pas ses résultats. Vérifications : `test:mobile-regression` (14 suites), TypeScript, Prettier, `git diff --check` et exports Expo Android (2 213 modules), iOS (2 182) et Web (1 899). Le geste de rafraîchissement pendant la pagination reste à tester sur téléphone; l’APK 1.0.58 devra être rebâti pour inclure cette correction.

## Ordres de travail — rafraîchissements concurrents — 15 octobre 2026

- Un rafraîchissement WO invalide maintenant le verrou et les retours d’une pagination lancée sous l’état précédent. Le `finally` tardif de cette page ne peut pas libérer le verrou d’une nouvelle requête. Deux gestes de rafraîchissement chevauchants gardent l’indicateur jusqu’à la fin du plus récent; un chargement de première page hors geste de refresh invalide le spinner d’un refresh antérieur.
- Les paramètres de recherche, le endpoint `work-orders/search`, les autorisations, statuts et règles métier ne changent pas. Le test couvre le comportement des séquences de pagination et de rafraîchissement lorsque des réponses deviennent obsolètes. `test:mobile-regression` (14 suites), TypeScript, Prettier, `git diff --check` et exports Expo Android (2 213 modules), iOS (2 182) et Web (1 899) réussissent. Le spinner et le flux sous réseau ralenti restent à vérifier sur appareil; l’APK 1.0.58 doit être rebâti pour contenir le lot.

## Demandes — actualisation et pagination concurrentes — 15 octobre 2026

Le démarrage d’une première page invalide maintenant le verrou et les retours d’une pagination précédente. Une ancienne page ne peut plus effacer le verrou d’une nouvelle pagination, afficher une erreur périmée ou perturber la liste après actualisation. Deux gestes de rafraîchissement chevauchants gardent l’indicateur actif jusqu’à la fin du plus récent; une recherche ou un filtre lancé entre-temps annule l’indicateur de rafraîchissement précédent.

La recherche, les critères, le endpoint `requests/search`, les permissions, les statuts et le flux de qualification restent inchangés. Un test vérifie les séquences d’invalidation; le test existant de la slice confirme que les réponses de recherche et pagination obsolètes ne remplacent pas la liste courante. `test:mobile-regression` (14 suites), TypeScript, Prettier, `git diff --check` et exports Expo Android (2 213 modules), iOS (2 182) et Web (1 899) réussissent. Le geste sur appareil avec réseau ralenti reste à vérifier. L’APK 1.0.58 devra être rebâti pour inclure ce lot.

Build APK 1.0.58 après le lot Demandes — 15 octobre 2026 : `mobile/dist/QPM-1.0.58.apk`, package `com.atlas.cmms`, versionName `1.0.58`, versionCode `41`, 105 701 580 octets. Build Gradle `BUILD SUCCESSFUL`; signature v2 valide et certificat QPM inchangé. SHA-256 : `4c47a81f57f5ed443f40027a29a06db6ef1279e79771f467d8585c3555cfba29`. Le geste reste à vérifier sur appareil avec une connexion ralentie.

## Stock de pièces — réponses concurrentes et chargement de liste — 15 octobre 2026

- Les recherches et pages de stock portent maintenant un identifiant de requête : une réponse plus ancienne ne peut pas écraser la recherche courante ni concaténer une page devenue obsolète. Le chargement de la liste a son propre état Redux, dissocié des chargements de fiche et de sélecteur de pièces; l’écran garde son spinner, ses erreurs, son retry et son pull-to-refresh.
- Le endpoint `parts/search`, critères, pagination, droits, seuils de stock, fiches et sélecteurs ne changent pas. Un test résout les recherches dans l’ordre inverse puis retourne une page périmée après rafraîchissement, et vérifie l’état de chargement distinct. `test:mobile-regression` (14 suites), TypeScript, Prettier, `git diff --check` et exports Expo Android (2 213 modules), iOS (2 182) et Web (1 899) passent. La recherche/actualisation et les grands inventaires restent à vérifier sur appareil. L’APK 1.0.58 doit être reconstruit pour embarquer ce lot.

## Sélecteur de pièces — erreurs récupérables — 15 octobre 2026

Le sélecteur des pièces et jeux de pièces affiche maintenant une erreur localisée et une action Réessayer si le mini-catalogue réseau échoue, au lieu de laisser une liste vide ou un chargement sans fin. Le chargement du mini-catalogue des pièces est isolé de celui des fiches; il est toujours terminé après un succès comme après un rejet.

Le bouton, les données sélectionnées, les opérations du WO, les endpoints `/parts/mini` et `/multi-parts/mini` et les règles métier ne changent pas. Une régression couvre la remise à zéro du chargement du mini-catalogue en cas d’erreur; les 14 suites, TypeScript, Prettier, `git diff --check` et les exports Expo Android (2 213), iOS (2 182), Web (1 899) passent. Le comportement erreur/reprise reste à confirmer sur appareil. L’APK 1.0.58 doit être reconstruit pour contenir ces améliorations d’inventaire.

## Fiche d’une pièce — erreur initiale récupérable — 15 octobre 2026

Si la récupération d’une pièce échoue avant qu’une fiche soit disponible, l’écran sort maintenant du chargement permanent et affiche une erreur localisée avec action Réessayer. Si une fiche en cache ou transmise par la navigation existe déjà, elle reste visible avec un bandeau d’erreur relançable. Le `finally` existant de `getPartDetails` libère son indicateur Redux même après rejet; un test cible ce rejet et la présence de l’état de reprise dans l’écran.

La route `GET parts/{id}`, les permissions, le modèle et les actions de la fiche restent inchangés. Vérifications de ce lot : 15 suites de régression, TypeScript, Prettier, `git diff --check` et exports Expo Android (2 213 modules), iOS (2 182) et Web (1 899); la navigation après erreur et le rendu clair/sombre restent à confirmer sur appareil. APK 1.0.58 reconstruit après ce lot; bundle Android inclus. SHA-256 `5532dd6f6c34dbda48714d67b0660852c8ac5c2f8c9274658b01158675b4cea9`.

## Scanner équipement — attente de la vérification de licence — 15 octobre 2026

Le lecteur QR/NFC n’affiche plus ses actions tant que l’état de licence n’a pas été récupéré. Cela évite qu’un appui pendant la requête initiale soit interprété à tort comme une absence de droit. Si la vérification réseau échoue, le scanner présente une erreur traduite et une reprise; les appels QR/NFC restent indisponibles jusqu’à une réponse valide.

Le point d’accès `GET license/state`, l’entitlement `NFC_BARCODE`, les permissions d’équipement, la résolution du tag/code et le flux de création après un 404 confirmé ne changent pas. Les 15 suites de régression, TypeScript, Prettier, `git diff --check` et exports Expo Android (2 213 modules), iOS (2 182) et Web (1 899) passent. APK 1.0.58 reconstruit et signature v2 vérifiée; package `com.atlas.cmms`, code 41. SHA-256 `dc7016e9410c339c8388c68d8c206c651f33d52deb30a2de66eeb52b39579f42`. Essais scanner, licence refusée/active et reprise restent à réaliser sur appareil.

## Statistiques WO — taux sans données — 15 octobre 2026

Quand aucune WO n'est clôturée, l'API fournit un taux de conformité de repli à `1.0`; la statistique mobile n'affiche plus ce repli comme un faux `100.00%` et présente `—`, avec un libellé accessible indiquant l'absence de WO clôturée. Dès qu'il existe des WO clôturées, le taux reste affiché comme avant. Aucun endpoint, donnée, droit ou calcul backend n'est modifié. Test de régression, 15 suites mobiles, TypeScript, Prettier, `git diff --check`, exports Expo Android/iOS/Web et reconstruction APK 1.0.58 réussis; les détails du build suivent.

APK 1.0.58 reconstruit après le correctif du taux sans données — 15 octobre 2026 : `mobile/dist/QPM-1.0.58.apk`, package `com.atlas.cmms`, `versionCode=41`, Gradle `BUILD SUCCESSFUL`, signature APK v2 vérifiée. Taille : 101 Mio. SHA-256 : `44d5ff313d9cd74061fedc8962a35084747dd5b1a3fd8c897e1cf156ba394edb`. Exports Expo Android (2 213 modules), iOS (2 182) et Web (1 899) réussis; 15 suites mobiles, TypeScript, Prettier et `git diff --check` réussis. Contrôle visuel du nouveau build sur appareil restant à faire.

## Accueil — périmètre des statistiques selon les droits WO — 15 octobre 2026

L'Accueil n'affiche et ne charge plus les compteurs, le résumé ni l'accès Statistiques si le rôle n'a pas `WORK_ORDERS` dans ses droits de consultation. Pour un rôle limité aux ordres qui lui sont assignés, le chargement des compteurs, l'ouverture de la liste depuis le hero et les filtres de cartes utilisent le périmètre assigné, indépendamment d'une préférence utilisateur enregistrée antérieurement. L'écran Statistiques vérifie également le droit avant son appel et affiche l'état d'accès refusé. Un test couvre les combinaisons de droits/préférence, l'ajout non mutant du filtre et les gardes des deux écrans. API, endpoints, payloads, rôles et permissions serveur n'ont pas été changés. Vérifications : 15 suites, TypeScript, Prettier, `git diff --check`, exports Expo Android (2 213 modules) et Web (1 899 modules). L'APK 1.0.58 courant ne comprend pas ce lot; Expo peut servir à sa recette sans nouvelle compilation APK. Tester avec des comptes sans accès WO, accès WO propres et accès équipe. Note sécurité : le endpoint existant `GET /analytics/work-orders/mobile/overview` ne vérifie dans son contrôleur que le rôle global; cette garde client réduit les appels de l'application mais ne remplace pas une autorisation granulaire backend pour tout client API.

## Formulaires partagés — zone de saisie multiligne — 15 octobre 2026

Les champs texte multilignes (descriptions WO/Demande et champs personnalisés longs) disposent maintenant d'une hauteur minimale de 112 dp et d'une cible de quatre lignes, plutôt que de commencer dans la hauteur standard d'un champ simple. La zone demeure défilable dans le formulaire et conserve le comportement de clavier, la validation et la sauvegarde existants. Un test de régression vérifie la configuration commune. API, données, règles de validation et permissions inchangées. `test:mobile-regression` (15 suites), TypeScript, Prettier, `git diff --check` et exports Expo Android (2 213 modules), iOS (2 182) et Web (1 899) réussis. L'APK 1.0.58 n'embarque pas ce lot; contrôle de saisie et de clavier sur appareil encore à faire via le Dev Client Expo.

## Asset 360 — message de permission Compteurs — 15 octobre 2026

La section Compteurs affichait le refus d’accès aux Actifs lorsque l’utilisateur n’avait pas la permission Compteurs. Elle utilise maintenant la traduction déjà disponible `no_access_meters` en anglais et en français; les autres sections gardent leur propre message. Les contrôles de permission, données et API n’ont pas changé. Une régression ciblée protège ce libellé; l’essai avec un compte réellement privé de permission reste à faire sur téléphone.

Vérifications : `test:mobile-regression` (15 suites), `tsc --noEmit`, Prettier, `git diff --check` et export Expo Android (2 213 modules) réussis. L’APK 1.0.58 actuel, reconstruit avant ce correctif, ne l’inclut pas encore; le Dev Client Expo peut servir à la recette.

## Asset 360 — accès aux pièces liées — 15 octobre 2026

L’onglet Pièces d’un actif affichait les références de pièces à tout utilisateur pouvant consulter l’actif, même sans droit de consultation `PARTS_AND_MULTIPARTS`. La liste reste maintenant vide et indique l’accès refusé dans ce cas; le retrait d’une association exige aussi le droit de consulter les pièces et le droit existant d’éditer l’actif. Aucune permission serveur, donnée d’actif, endpoint ou règle métier ne change. Régression ciblée ajoutée; vérifier avec un rôle autorisé et un rôle sans accès Inventaire sur l’APK/Expo.

Vérifications de ce lot : `test:mobile-regression` (15 suites), TypeScript, Prettier, `git diff --check` et export Expo Android (2 213 modules) réussis. L’APK 1.0.58 actuel ne comprend pas ce changement; le test mobile peut être fait avec le Dev Client. La restriction visuelle n’est pas un remplacement du contrôle API, qui reste l’autorité.

## Scanner QR — callback unique par lecture — 15 octobre 2026

Le lecteur QR/code-barres bloquait une lecture supplémentaire avec l’état React `scanned`, qui ne se met à jour qu’après le callback. Des callbacks caméra rapprochés pouvaient donc transmettre plusieurs valeurs au formulaire avant le rendu suivant. Un verrou `ref` synchrone accepte désormais seulement la première lecture. Format de valeur, navigation et API inchangés. Régression ajoutée; la cadence réelle des événements caméra reste à vérifier sur Android.

Vérifications QR : 15 suites mobiles, TypeScript, Prettier, `git diff --check` et export Expo Android (2 213 modules) réussis. Les événements multiples avec caméra réelle et la reprise après fermeture restent à tester sur appareil. APK 1.0.58 antérieur au lot; l’export Expo sert au test avec Dev Client.

## Caméra des formulaires — erreur d’initialisation récupérable — 15 octobre 2026

La caméra intégrée aux formulaires ne gérait pas `CameraView.onMountError`; après autorisation, l’écran pouvait rester noir si la prévisualisation ne démarrait pas. La modal affiche désormais une explication localisée EN/FR, propose une nouvelle tentative qui remonte la caméra et garde l’action de retour. Capture, traitement des fichiers et permission existante ne changent pas. Test ciblé ajouté; vérifier panne/réessai et capture sur appareil Android/iOS.

Vérifications : 15 suites mobiles, TypeScript, Prettier, `git diff --check` et export Expo Android (2 213 modules) réussis. L’APK 1.0.58 n’inclut pas encore ce lot; le Dev Client peut le tester. Une erreur native réelle et la capture après reprise restent à exercer sur appareil.

## Scanner QR — reprise caméra partagée — 15 octobre 2026

La modal de scan QR/code-barres gère maintenant l’échec de montage de `CameraView`. Les deux parcours caméra mobiles réutilisent `CameraPreviewError`, avec la palette claire/sombre, le message FR/EN et des actions Réessayer/Retour cohérentes. Le verrou anti-double scan reste appliqué. Aucun endpoint ou format de code ne change. Tests et export Expo à exécuter; le cas de panne native demeure à vérifier sur téléphone.

Vérifications : 15 suites mobiles, TypeScript, Prettier, `git diff --check` et export Expo Android (2 214 modules) réussis. Le test sur caméra réelle reste nécessaire; l’APK 1.0.58 est antérieur au composant partagé.

## Asset 360 — bouton d’actions vide masqué — 15 octobre 2026

La fiche Asset affichait toujours « Plus d’options », même si le rôle ne pouvait ni modifier/supprimer l’actif ni créer de WO ou d’actif enfant. Le menu était alors vide. La visibilité du bouton et des lignes de menu partage maintenant le même calcul à partir des permissions existantes; aucune action ni règle serveur ne change. Test de rôle sans action et rôle avec action ajouté. Vérifier les différents comptes de test sur appareil.

Vérifications pour le menu Asset 360 : 15 suites mobiles, TypeScript, Prettier, `git diff --check` et export Expo Android (2 215 modules) réussis. APK 1.0.58 antérieur au lot; tester rôles lecture seule et autorisés avec le Dev Client.

## Tableau de bord — sauvegarde du filtre assigné protégée contre les doubles pressions — 15 octobre 2026

Le commutateur « ordres assignés à moi » désactive visuellement l’action pendant la sauvegarde, mais deux événements très rapprochés pouvaient survenir avant le prochain rendu React. Une référence synchrone bloque maintenant la seconde mutation dès le premier appui et est libérée dans `finally`, y compris après erreur. La valeur envoyée, les droits, l’API et le comportement de reprise restent inchangés.

Vérifications : verrou partagé `createAsyncActionLock` couvert par le test concurrent existant; `test:mobile-regression` (15 suites), TypeScript `tsc --noEmit`, Prettier, `git diff --check` et export Expo Android non minifié (2 215 modules) passent. L’APK 1.0.58 a été produit avant ce lot; le Dev Client permet de valider le commutateur sans rebuild natif. Les essais rapides sur appareil et sauvegarde après erreur restent à faire.

## NFC Android — lecture des tags sans enregistrement NDEF — 15 octobre 2026

Le lecteur demandait uniquement `NfcTech.Ndef`, ce qui excluait les étiquettes Android non formatées NDEF alors que le flux d’identification QPM ne consomme que l’UID exposé par le tag. Il demande maintenant les technologies Android prises en charge (NDEF, A/B/F/V, ISO-DEP, MIFARE et NDEF formatable) avec NDEF en premier; le module natif parcourt la liste et se connecte à la première technologie du tag. À cette date, le lecteur iOS n’était pas encore activé; il l’est depuis la correction « Scanner équipement — NFC natif Android/iOS » ci-dessous. L’identifiant transmis à `GET /assets/nfc` et le contrôle d’accès côté API ne changent pas.

Vérifications : test du mapping des technologies, `test:mobile-regression` (15 suites), TypeScript `tsc --noEmit`, Prettier, `git diff --check` et export Expo Android (2 216 modules) passent. Les tags physiques et modèles de téléphone disponibles ne sont pas vérifiés ici; tester au moins un tag NDEF et un tag UID non NDEF avant validation terrain. Le rebuild APK 1.0.58 ci-dessous inclut ce changement.

## Rebuild APK 1.0.58 — 15 octobre 2026

L’APK Release a été reconstruit depuis l’arbre de travail courant après les lots mobiles présents, sans incrémenter la version. Bundle Android Expo : 2 216 modules; Gradle : `BUILD SUCCESSFUL`; package `com.atlas.cmms`, `versionName=1.0.58`, `versionCode=41`. Signature v2 vérifiée avec le certificat QPM attendu. Fichier `mobile/dist/QPM-1.0.58.apk`, 105 713 072 octets; SHA-256 `2918eeafbf1f6a65986198e592db076b645ad9ca43a77494846527488314d49e`.

`test:mobile-regression` (15 suites), TypeScript, Prettier sur les fichiers mobiles modifiés et `git diff --check` réussissent. Des exports Expo iOS (2 185 modules) et Web (1 902 modules) réussissent également; ils valident le bundle JavaScript, pas une archive iOS signée. L’APK n’a pas été installé sur un appareil dans cet environnement; scanner caméra/NFC, rendu tactile, contrastes et lecteurs d’écran restent à vérifier avec la recette de [`GUIDE-TEST-VISUEL-MOBILE.md`](GUIDE-TEST-VISUEL-MOBILE.md). Aucun appareil ADB n’est connecté ici.

## Clients et Fournisseurs — recherche/pagination protégées contre les réponses tardives — 15 octobre 2026

Les listes Clients et Fournisseurs acceptaient auparavant les réponses réseau dans l’ordre d’arrivée : une recherche ancienne ou une pagination terminée après l’actualisation pouvait remplacer/compléter les résultats courants. Les thunks et reducers vérifient désormais un identifiant de requête courant; l’état de chargement de liste est séparé du chargement des fiches et mini-fiches. L’écran ignore aussi les erreurs et fins de chargement obsolètes. Endpoints, paramètres, filtres, permissions et règles métier inchangés.

Régression différée ajoutée pour les deux annuaires : réponse de recherche ancienne ignorée et pagination démarrée avant actualisation non ajoutée à la nouvelle première page. `test:mobile-regression` (16 suites), TypeScript, Prettier et `git diff --check` passent. Export Expo Android (2 216 modules) réussi; la course réseau reste à reproduire manuellement avec le guide. L’APK 1.0.58 a été reconstruit après ce correctif; installation sur téléphone encore à faire.

## Rebuild APK 1.0.58 après correction Clients/Fournisseurs — 15 octobre 2026

Build Release réussi après inclusion des protections contre les réponses réseau tardives des annuaires Clients/Fournisseurs. Version conservée : `1.0.58`, code `41`; bundle Android : 2 216 modules. APK : `mobile/dist/QPM-1.0.58.apk`, 105 714 600 octets, SHA-256 `16bc0319414950cc17ed8e6900c24144a39a4f90c128fa0500d1cac37237b4e3`. Signature v2 vérifiée avec le certificat de signature QPM (`CN=QPM, O=QUOREICH`). `test:mobile-regression` (16 suites), TypeScript, Prettier et `git diff --check` passent. L’APK n’a pas été installé sur un appareil; valider notamment recherche/pagination en réseau ralenti ainsi que scan et thèmes via le guide.

## Envoi d’avis — double appui neutralisé — 15 octobre 2026

L’écran Feedback désactivait le bouton pendant la requête, mais un second appui avant le rendu React pouvait envoyer deux fois le même avis. L’envoi est maintenant coalescé par le verrou asynchrone partagé; la valeur `feedback.trim()`, le endpoint `reviews/feedback`, le retour succès/erreur et la navigation restent identiques. Test ajouté pour vérifier le verrou du formulaire et le maintien du contrat. `test:mobile-regression` (17 suites), TypeScript, Prettier, `git diff --check` et export Expo Android (2 216 modules) passent. Un essai sur le téléphone avec deux appuis rapides reste à faire. L’APK 1.0.58 a été construit avant ce lot; utiliser Expo ou rebâtir pour le tester en natif.

## Pièces jointes — confirmation de suppression contre double appui — 15 octobre 2026

`AttachmentList`, partagé par les fiches Actif, Emplacement et Pièce, vérifie maintenant un verrou synchrone avant d’appeler le callback de suppression. Le bouton annonce aussi son état occupé/désactivé au lecteur d’écran. La confirmation reste ouverte en cas d’erreur et se ferme seulement après réussite; permissions, callbacks, endpoint et contenu restent inchangés. Test de régression ciblé ajouté. `test:mobile-regression` (18 suites), TypeScript, Prettier, `git diff --check` et export Expo Android (2 216 modules) passent. L’APK 1.0.58 courant précède ce correctif.

## Scanner équipement — NFC natif Android/iOS, QR multiplateforme — 15 octobre 2026

Le scanner et les formulaires proposent NFC dans les builds natifs Android et iOS; l’écran de lecture choisit les technologies natives Android ou les technologies MIFARE/ISO 15693 sur iOS. Le QR/code-barres reste disponible sur iOS, Android et Web. Cette correction remplace la restriction iOS antérieure, qui était trop large malgré le module, l’usage NFC et l’entitlement TAG déjà présents dans le projet. L’entitlement de licence existant continue de contrôler l’accès; aucune permission métier, route, API ou résolution d’identifiant ne change.

Vérifié par test de mapping Android/iOS, 18 suites de régression, TypeScript, Prettier et `git diff --check`. Le build physique iOS et la lecture NFC sur iPhone ne sont pas vérifiés; tester avec un iPhone compatible et un tag pris en charge avant déploiement. L’APK Android 1.0.58 a été reconstruit depuis cette source avec le bundle de 2 216 modules; signature v2 vérifiée, package `com.atlas.cmms`, versionCode 41, taille 105 715 116 octets, SHA-256 `dddc4e9deeae74b7355aa53fa0d501c28670ec12533c19f852c91023c3972984`.

## Accueil — libellés des cartes de statut non tronqués — 15 octobre 2026

Les libellés des cartes du tableau de bord ne sont plus forcés sur une ligne. Les traductions longues et le texte agrandi par les réglages d’accessibilité peuvent se répartir sur plusieurs lignes; les traductions courtes gardent leur présentation compacte. Le texte complet reste également présent dans le nom accessible de chaque carte. Seule la mise en page change; compteurs, filtres de navigation, permissions et API restent inchangés. Vérifications : 18 suites mobiles, TypeScript, Prettier et `git diff --check`. Vérifier l’accueil avec « Priorité élevée » en français, et plusieurs tailles de police, dans le Dev Client Expo; le build APK 1.0.58 n’inclut pas ce dernier ajustement visuel.

## Champ NFC du formulaire d’actif — iOS réactivé — 15 octobre 2026

La relecture du parcours iOS a révélé que le scanner natif était visible depuis l’écran Scanner, mais que `getAssetFields` excluait encore `nfcId` sur iOS. Cette exclusion historique est supprimée : le champ d’identification NFC est maintenant proposé dans les formulaires d’actif natifs Android/iOS. Le formulaire partagé continue à le masquer sur Web via le contrôle de plateforme et l’entitlement de licence reste appliqué au déclenchement du lecteur. Aucune donnée, API, permission métier ni règle d’identification n’a changé. Régression NFC, 18 suites, TypeScript, Prettier, export Expo Web et `git diff --check` réussissent. Le guide de test couvre maintenant la vérification du champ; lecture réelle sur iPhone à confirmer. L’APK 1.0.58 n’inclut pas cette modification.

## Formulaire d’actif — actions de scan explicites — 15 octobre 2026

Les contrôles NFC et code-barres/QR du formulaire partagé étaient de simples libellés tactiles, sans icône ni annonce explicite de l’action. Ils utilisent maintenant `ScanIdentifierField`, un bouton encadré avec icône, une cible tactile de 44 dp minimum, le type et la valeur dans son nom accessible, une aide localisée et l’identifiant lu affiché sous le bouton. Ils restent désactivés pendant la soumission. Les routes `SelectNfc`/`SelectBarcode`, les valeurs Formik et le payload d’actif ne changent pas. Vérifications : tests ciblés et 18 suites mobiles, TypeScript, Prettier, `git diff --check`, exports Expo Web (1 881 modules), Android (2 217) et iOS (2 208). Vérifier taille/contraste et annonces TalkBack/VoiceOver avec appareil; APK 1.0.58 antérieur à ce lot.

## Détail WO — affectations techniciens et prestataires — 15 octobre 2026

La section des affectations dépendait uniquement de `assignedTo` : un ordre avec prestataire(s) mais sans technicien cachait les prestataires. Les deux groupes sont désormais affichés indépendamment sous `assigned_to` et `assigned_customers`. Leurs noms n’étaient associés à aucune action malgré leur wrapper tactile; ils sont maintenant exposés comme texte plutôt que comme boutons sans action. Aucun rattachement, permission ou payload ne change. Régression dédiée, 18 suites mobiles, TypeScript, Prettier et `git diff --check` passent. Tester à l’écran un WO avec technicien+prestataire et un WO prestataire seul, puis vérifier VoiceOver/TalkBack; bundles Expo et APK 1.0.58 antérieurs à ce correctif.

## Asset 360 — liens du technicien principal et de l’emplacement — 15 octobre 2026

Les liens de la fiche vers le technicien principal et l’emplacement s’appuyaient sur un texte finement tactile sans rôle ni nom d’accessibilité. Ils annoncent maintenant leur destination comme des liens et une étiquette qui combine le type de relation et le nom; leur cible offre une hauteur minimale de 44 dp. Les routes `UserDetails` et `LocationDetails` restent inchangées. Test de régression ajouté; `test:mobile-regression` (18 suites), TypeScript, Prettier, `git diff --check` et export Expo Android (2 217 modules) passent. Vérifier navigation et lecture VoiceOver/TalkBack sur appareil; APK 1.0.58 antérieur à ce changement.

## Hiérarchie des emplacements — bouton enfant nommé — 15 octobre 2026

Le bouton « Voir les enfants » d’une carte Emplacement n’exposait que le libellé générique; le bouton équivalent d’un actif nomme son parent. Le bouton d’emplacement annonce maintenant l’emplacement concerné, incluant son code si disponible, et une aide localisée; la navigation et les paramètres restent identiques. Régression ciblée ajoutée. `test:mobile-regression` (18 suites), TypeScript et Prettier passent. Vérifier l’annonce réelle VoiceOver/TalkBack; bundle Expo et APK 1.0.58 antérieurs à ce correctif.

## Scanner équipement — choix NFC/QR plus explicites — 15 octobre 2026

Les deux choix de scan sont désormais illustrés par une icône, accompagnés d’une instruction courte et exposés comme boutons avec une aide explicite pour VoiceOver/TalkBack. Le parcours QR/NFC, les permissions, l’entitlement et les appels API restent identiques. Le même lot corrige les rapports Equipment 360 obsolètes qui décrivaient le NFC iOS comme masqué; le code natif iOS est configuré, mais le matériel iPhone n’a pas été testé. `test:mobile-regression` (18 suites), TypeScript, Prettier, `git diff --check` et export Expo Web (1 881 modules) passent. Vérifier visuellement les lignes et les annonces d’accessibilité sur téléphone; APK 1.0.58 antérieur à cette amélioration.

## Demandes — badge Notifications actualisé et action accessible — 15 octobre 2026

Le badge de la barre Demandes capturait le nombre de notifications au premier rendu et pouvait rester bloqué à cette valeur. Son action de navigation est maintenant recalculée lorsque la liste Redux change; son nom VoiceOver/TalkBack annonce le nombre non lu. Le badge visuel ne forme plus une cible imbriquée dans un autre bouton, et Paramètres garde son action indépendante. Les routes et le chargement des notifications restent inchangés. Test de régression ajouté; 18 suites mobiles, TypeScript, Prettier, `git diff --check` et export Expo Web (1 881 modules) réussissent. Vérifier le compteur et les annonces sur appareil avec un compte Demandeur; APK 1.0.58 antérieur à ce correctif.

## Fiches Pièce et Compteur — menus d’action accessibles et utiles — 15 octobre 2026

Les menus d’action des fiches Pièce et Compteur enveloppaient un `IconButton` dans un second bouton et restaient visibles pour les rôles sans droit d’édition ou de suppression, ce qui pouvait créer une cible d’accessibilité en double et une feuille vide. Le bouton est maintenant unique et son menu est masqué lorsque l’objet n’est pas chargé ou que le rôle n’a aucune des deux actions existantes. Les feuilles continuent à filtrer chaque action avec les mêmes permissions, et la navigation/mutation ne change pas. Test statique ajouté; 18 suites mobiles, TypeScript, Prettier, `git diff --check`, export Expo Web (1 881 modules) et Android (2 217 modules) réussissent. La recette avec rôles lecture seule et modifiables reste à exécuter sur téléphone; APK 1.0.58 antérieur.

## Fiches Actif, Emplacement, Fournisseur et Client — menus conditionnels et cible unique — 15 octobre 2026

Les menus de ces quatre fiches enveloppaient un `IconButton` dans un second bouton. Ceux des Fournisseurs et Clients pouvaient être vides en lecture seule; celui de l’Emplacement restait présent avant le chargement et sans droit d’action. Ils utilisent maintenant une cible accessible unique et ne s’affichent qu’avec au moins une action réellement permise, selon les mêmes permissions déjà appliquées dans les feuilles. La navigation, les actions, les règles métier et l’API sont inchangées. Test de régression statique couvrant ces fiches avec Pièce et Compteur; 18 suites mobiles, TypeScript, Prettier et `git diff --check` passent. Recette des rôles en lecture seule/modifiables et annonces VoiceOver/TalkBack à faire sur appareils; APK 1.0.58 antérieur à ce lot.

## Création WO — association du compteur aux tâches de relevé — 15 octobre 2026

Le formulaire mobile de tâche de type `METER` obligeait à choisir un compteur mais ne le copiait pas dans la tâche créée; l’API ne pouvait donc pas associer le relevé au compteur sélectionné. Le payload mobile transmet maintenant l’objet compteur sélectionné, conformément au DTO existant et au formulaire Web. Le modèle local reflète cette association. Le choix du type utilise également une seule ligne radio accessible; changer vers un type autre que `METER` efface le compteur, comme dans le formulaire Web. Endpoints, DTO serveur, règles d’exécution et permissions inchangés.

Régressions ajoutées pour la conservation de l’association dans le payload et pour le contrôle radio. Vérifications : `test:mobile-regression` (18 suites), TypeScript `tsc --noEmit`, Prettier, `git diff --check` et export Expo Android (2 217 modules) réussis. Tester la création puis la consultation d’un WO avec une tâche `METER` dans Expo/Android natif, et vérifier que le compteur associé persiste après rechargement; les essais appareil et les autres plateformes restent à faire. APK 1.0.59 antérieur à ce lot.

## Exécution des tâches WO — mode lecture seule aligné sur les droits — 15 octobre 2026

La fiche WO empêchait déjà les transitions ordinaires lorsque l’ordre était terminé ou que l’utilisateur n’avait pas le droit de le modifier, mais l’écran Tâches laissait encore toucher les champs; l’API rejetait alors les écritures. La fiche transmet maintenant le mode lecture seule, et l’écran de tâches le recalcule aussi depuis le WO Redux courant lorsqu’il est disponible. Un WO terminé ou non modifiable conserve la consultation de ses tâches, mais désactive les valeurs, notes, photos et actions de réessai avec un message explicite. Le contrôle existant d’affectation individuelle reste appliqué. Les droits backend, transitions, payloads et endpoints ne changent pas.

Régression ajoutée pour la combinaison statut terminé/droit d’édition, l’absence de permission, et l’affichage/propagation du mode lecture seule. `test:mobile-regression` (18 suites), TypeScript, Prettier, `git diff --check` et export Expo Android (2 218 modules) réussissent. Sur appareil, vérifier un WO ouvert modifiable, un WO terminé et un WO ouvert en lecture seule; confirmer que seul le premier accepte les saisies et que les deux autres restent consultables. L’APK 1.0.59 précède ce lot; le Dev Client Expo peut le tester.

## Pièces jointes — icône de l’état vide non interactive — 15 octobre 2026

Dans l’état vide des pièces jointes partagé par les fiches Actif, Emplacement et Pièce, le pictogramme était rendu comme un `IconButton` sans action. Il est maintenant décoratif et exclu de l’arbre d’accessibilité; le texte explicatif de l’état vide reste annoncé. Aucun comportement de fichier, droit ou appel API ne change. Test de régression ciblé ajouté. `test:mobile-regression` (18 suites), TypeScript, Prettier, `git diff --check` et exports Expo Web (1 882 modules), iOS (2 209) et Android (2 218) réussissent. Contrôle TalkBack/VoiceOver sur appareil restant à faire; APK 1.0.59 antérieur.

## Scanner NFC — suspendre la lecture en arrière-plan — 15 octobre 2026

Le lecteur NFC démarrait une lecture au montage de l’écran et l’annulait seulement à sa fermeture. Il écoute maintenant le cycle de vie de l’application : passage en arrière-plan annule la requête native; retour au premier plan reprend la lecture après résolution de l’annulation précédente. Une génération de lecture empêche une réponse tardive de l’ancienne session de remonter un tag ou une erreur, et le verrou d’activité évite deux sessions concurrentes. Fermeture de l’écran retire l’écouteur et annule également la lecture. La résolution d’identifiant, les endpoints, permissions et payloads ne changent pas.

Régression ajoutée sur l’annulation arrière-plan, la reprise après terminaison de la lecture en cours et le retrait de l’écouteur. Vérifications : `npm run test:mobile-regression` (18 suites), `npx tsc --noEmit`, Prettier, `git diff --check`, export Expo Android (2 218 modules) et iOS (2 209 modules) réussissent. La reprise NFC doit encore être vérifiée sur Android et iOS physiques avec un tag compatible; les exports JavaScript ne valident pas le matériel ni les événements natifs AppState. L’APK 1.0.59 précède ce lot; tester par Dev Client ou reconstruire l’APK.

## Scanner QR — récupération après refus caméra — 15 octobre 2026

L’écran de refus caméra affichait un bouton « Caméra », sans expliquer pourquoi la permission est nécessaire. Il présente désormais un état centré, adapté aux thèmes, avec icône, explication localisée et actions explicites **Réessayer**, **Ouvrir les paramètres** et **Retour**. Les actions empêchent les demandes permission concurrentes; un échec d’ouverture des paramètres affiche un message au lieu d’une promesse rejetée non gérée. Le lecteur et la résolution QR/code-barres restent inchangés.

Vérifications : régression de l’état refusé dans `mobile-regression.test.cjs`, `test:mobile-regression` (18 fichiers de tests, tous réussis), TypeScript, Prettier, export Expo Web (1 883 modules) et `git diff --check`. Contrôler sur Android et iOS les états permission initiale, refus temporaire, refus permanent, retour depuis les paramètres et lecteur d’écran. L’export Web vérifie le bundling Expo, pas la permission caméra native. Le build de production 1.0.59 est antérieur à ce lot; vérifier le comportement dans le Dev Client Expo ou reconstruire l’APK.

### Scanner QR — actualisation de la permission caméra au retour des paramètres

Après **Ouvrir les paramètres**, le scanner écoute maintenant le retour de l’application au premier plan et relit la permission caméra. Si l’utilisateur l’a accordée, le lecteur QR s’ouvre sans étape supplémentaire; si elle reste refusée ou si la lecture du statut échoue, l’écran d’aide reste visible. L’écouteur est retiré à la fermeture. Le test de régression couvre l’abonnement AppState et la relecture; aucune permission système, API QPM ou règle métier n’a changé.

Vérifications réussies : `test:mobile-regression` (18 fichiers de tests), `npx tsc --noEmit --pretty false`, Prettier, export Expo Android (2 219 modules) et `git diff --check`. Le retour depuis les paramètres et l’activation native de la caméra restent à vérifier physiquement sur Android et iOS; l’export valide le bundle JS natif, pas la permission réelle du système.

## Scanner NFC — état de lecture annoncé aux lecteurs d’écran

L’indicateur affiché pendant la lecture NFC expose désormais le rôle accessible `progressbar` et le libellé localisé « En train de scanner / Scanning ». Les instructions visibles restent inchangées; la lecture du tag, les permissions, l’identifiant transmis et la résolution API ne changent pas.

Vérifications : `npm run test:mobile-regression` (18 suites de fichiers, toutes réussies), `npx tsc --noEmit`, Prettier, `git diff --check` et export Expo Android non minifié (2 219 modules). L’annonce réelle par TalkBack et VoiceOver reste à vérifier sur téléphone; l’export n’évalue pas le lecteur d’écran natif. L’APK 1.0.59 précède ce changement; test possible via Dev Client Expo ou après reconstruction.

## Scanner QR — suppression de l’alerte caméra redondante

Le helper de permission affichait une alerte système après refus, puis le modal QR montrait déjà l’écran d’aide avec les actions Réessayer, Ouvrir les paramètres et Retour. Le parcours scanner n’affiche maintenant que son écran de récupération intégré; les autres parcours caméra et galerie gardent leurs alertes par défaut. Une erreur native de demande permission revient également vers cet écran au lieu d’empiler deux messages.

Le changement ne modifie que le feedback de permission, sans changer la demande système, la permission requise ou le scan/résolution API. Vérifications réussies : `npm run test:mobile-regression` (19 suites de fichiers), dont un test isolé confirmant que le scanner ne déclenche aucune alerte redondante et que les autres flux conservent leur alerte, `npx tsc --noEmit`, Prettier, `git diff --check` et export Expo Android non minifié (2 219 modules). Le refus temporaire/permanent et les autres parcours média sont à confirmer sur appareil. L’APK 1.0.59 devra être reconstruit pour le test natif.

## Accueil — erreur de chargement des notifications récupérable

L’accueil déclenchait le chargement des notifications sans intercepter le rejet de l’API. Une panne réseau pouvait donc laisser un compteur de cloche périmé ou à zéro sans explication et produire un rejet non géré. Le chargement est maintenant capturé, le problème est signalé dans une bannière localisée avec une action Réessayer, et le geste d’actualisation relance aussi les notifications. L’indicateur de rafraîchissement couvre leur chargement.

Les notifications, leur pagination, le calcul local du badge, les droits et les routes restent inchangés. La régression vérifie l’interception, la bannière, la relance et les traductions EN/FR. Vérifications réussies : `npm run test:mobile-regression` (19 suites de fichiers), TypeScript, Prettier et `git diff --check`. L’export Expo Android a été tenté deux fois et tué par le système pendant Metro; la mémoire hôte observée était à environ 1,5 Gio disponible sans swap. Ce lot n’a donc pas de bundle Expo vérifié et l’APK 1.0.59 ne l’inclut pas. Contrôler sur appareil une réponse réussie, une panne réseau, puis une relance réussie; la bannière devrait disparaître après le rechargement. Refaire l’export quand la mémoire système est disponible.

## Scanner caméra — cibles tactiles des états de récupération — 15 octobre 2026

Les écrans d’erreur permission et prévisualisation garantissent maintenant une hauteur tactile minimale de 48 dp sur toutes leurs actions, y compris **Retour**. Les dimensions utilisent le token partagé QPM. Dans le scanner QR, l’interface annonce le démarrage de l’aperçu; si `CameraView` ne devient pas prêt après 12 secondes, elle bascule vers l’écran explicite de récupération au lieu de rester sur un aperçu noir sans indication. Le lecteur est démonté lorsque l’application passe en arrière-plan, puis remonté au retour au premier plan sur Android et iOS; un événement tardif ne marque pas la caméra prête en arrière-plan. Une erreur native conserve les actions Réessayer/Retour. Permissions, format des identifiants et résolution API ne changent pas. Une régression vérifie les cibles tactiles, l’initialisation caméra et la gestion du cycle de vie.

Vérifications : Prettier, TypeScript, `npm run test:mobile-regression` (20 suites, toutes réussies), `git diff --check` et export Expo Android non minifié (2 219 modules) passent. La prévisualisation caméra, le délai de démarrage et les cibles tactiles restent à vérifier sur appareils Android/iOS avec le Dev Client; l’APK 1.0.59 ne contient pas ces changements.

## Couleurs sémantiques des statuts WO — 15 octobre 2026

Le tableau de bord et les badges réutilisent maintenant les rôles métier pour éviter trois associations trompeuses : **En cours** était vert comme un succès, **Clôturé** gris, et les WO de priorité haute rouges comme un retard critique. Le thème mobile ajoute un rôle violet `inProgress` avec surface claire/sombre dédiée; les helpers communs affichent **En cours** en violet, **Clôturé** en vert, **Haute** et les WO à priorité haute en orange, et conservent **En retard** en rouge. Les fonds des tuiles de statut sont calculés par le même helper centralisé. Les valeurs d’énumération, les données analytics, les libellés, l’API et les règles métier ne changent pas.

Les contrôles de contraste automatisés vérifient les couples texte/fond en clair et sombre : violet sur bouton 6,62:1 / 9,55:1; contenu violet sur sa surface 7,26:1 / 10,14:1; succès 5,38:1 / 10,02:1; avertissement 6,10:1 / 12,05:1. `npm run test:mobile-regression` (20 suites), TypeScript, Prettier, `git diff --check` et l’export Expo Android non minifié (2 219 modules) réussissent. Confirmer l’aspect des badges, tuiles et filtres en thèmes clair/sombre dans le Dev Client; aucun APK n’a été reconstruit.

## Clôture WO — conséquence explicitée avant confirmation — 15 octobre 2026

La confirmation simple de clôture et le formulaire de clôture (commentaire/signature obligatoires) expliquent maintenant le même effet : le WO devient consultable en lecture seule après clôture; une réouverture exige le droit dédié et un motif, conservé dans l’historique. La confirmation simple affiche aussi l’identifiant, le titre et l’équipement lié, comme le formulaire détaillé, pour que le technicien vérifie l’objet avant de confirmer. Le texte est localisé en français/anglais et reprend la règle d’accès déjà appliquée dans l’écran de réouverture. Aucun nouveau statut, validation métier, permission, endpoint ou payload n’est ajouté.

Régressions ajoutées pour les deux chemins, l’identification du WO dans la confirmation simple et les messages FR/EN. `npm run test:mobile-regression` (20 suites) et TypeScript réussissent; formatage et export Expo Android à valider après le changement. Tester la confirmation avec et sans équipement, ainsi que le rendu du formulaire détaillé sur petit écran clair/sombre; aucun APK n’a été reconstruit.

## Formulaires mobiles — hauteur de l’action principale — 15 octobre 2026

Le bouton d’envoi du composant Form partagé avait une hauteur minimale de 50 dp alors que le token QPM réserve 56 dp aux actions principales mobiles. Il utilise maintenant `qpmLayoutTokens.touchTarget.prominent`, ce qui s’applique aussi au formulaire de clôture avec commentaire/signature obligatoires. Les champs, validations, appels API, permissions et comportements de soumission restent inchangés. La régression vérifie l’usage du token partagé. Vérifications réussies : `npm run test:mobile-regression` (20 suites), TypeScript, Prettier, `git diff --check` et export Expo Android non minifié (2 219 modules). Le défilement avec clavier ouvert, petits écrans et grandes polices reste à confirmer sur appareil; aucun APK n’a été reconstruit.

## Appareil photo des pièces jointes — aperçu et cycle de vie — 15 octobre 2026

Le composant `InAppCamera` plaçait ses contrôles comme enfants de `CameraView`, alors que `expo-camera` 16.1.11 indique que cet usage n’est pas pris en charge et peut causer un rendu incohérent. Les commandes sont maintenant superposées comme sœurs du flux vidéo. La caméra n’est montée que lorsque la modale est visible et l’app active; elle est démontée en arrière-plan et réouverte au retour. L’interface annonce l’attente de l’aperçu, interdit la prise avant `onCameraReady`, récupère une erreur de montage après 12 secondes et propose une nouvelle tentative. Le retour Android ferme la modale, et un retour des paramètres actualise la permission. Le contenu capturé, les callbacks, les pièces jointes, les permissions et les API QPM ne changent pas. Un test de régression vérifie la structure Expo et le cycle de vie; vérifier le démarrage et la reprise réelle sur Android/iOS avec l’appareil avant livraison. L’APK n’a pas été reconstruit.

### Scanner QR — initialisation explicite de la caméra

Le lecteur de `SelectBarcodeModal` utilise maintenant explicitement la caméra arrière et déclare les formats QR et codes-barres pris en charge par `expo-camera`. Une erreur native de montage mène à l’écran Réessayer / Ouvrir les paramètres / Retour; au retour des paramètres, la permission est relue et le lecteur se remonte si elle est accordée. Si l’aperçu ne devient pas prêt sous 12 secondes, le même état évite de laisser l’utilisateur devant un écran noir indéfini. Les callbacks tardifs en arrière-plan ne déclenchent pas de résolution d’identifiant. Vérification reconduite le 15 octobre : `npm run test:mobile-regression` (20 suites), TypeScript, export Expo Android non minifié (2 221 modules) et `git diff --check` réussissent. La visibilité effective du flux caméra et le décodage des QR restent à vérifier sur un téléphone avec le Dev Client; aucune APK n’a été reconstruite.

## Accueil — navigation KPI après échec des préférences — 15 octobre 2026

Les KPI de WO étaient désactivés dès que les préférences utilisateur manquaient, même pour un technicien dont le périmètre « mes ordres » est déterminé par son rôle et dont les compteurs avaient déjà été chargés. Leur navigation est maintenant activée lorsque le périmètre peut être construit sans ambiguïté; pour un rôle dont l’étendue dépend de la préférence non chargée, les cartes restent bloquées jusqu’à sa résolution. Un identifiant utilisateur est exigé pour construire le filtre technicien. Endpoints, filtres serveur, permissions et calculs analytics ne changent pas. Test ciblé du périmètre et du cas sans identifiant ajouté; `npm run test:mobile-regression` (20 suites), TypeScript, Prettier et `git diff --check` passent. Vérifier le comportement avec un compte technicien sur l’instance pilote et une panne de chargement des préférences; l’APK 1.0.59 est antérieure à ce correctif.

## Clôture avec feedback ou signature — contexte du WO — 15 octobre 2026

Le formulaire de clôture affichait les champs de feedback et/ou de signature sans rappeler l’ordre traité. Il présente maintenant son identifiant, son titre et le nom de l’équipement lorsqu’il existe, afin que la confirmation reste vérifiable après navigation vers ce formulaire. Les champs requis, validation, callback de clôture, transitions, permissions et endpoints ne changent pas. Test de régression vérifiant le passage et l’affichage du contexte ajouté; tester sur un WO avec équipement et un WO sans équipement, en petit écran et avec clavier ouvert. APK 1.0.59 antérieure à ce lot.

## Listes WO et Demandes — recherche réactivée après effacement — 15 octobre 2026

Dans les listes WO et Demandes, l’action « Effacer recherche et filtres » désactivait aussi le déclenchement de recherche, alors que le champ restait focalisé. Le texte saisi ensuite n’était donc plus appliqué tant que l’utilisateur ne quittait pas puis ne reprenait pas le champ. L’effacement garde maintenant la recherche active tout en vidant bien le texte et les filtres. Critères, délai de recherche, endpoint et règles de filtre ne changent pas. Régression ciblée ajoutée pour les deux listes; `npm run test:mobile-regression` (20 suites), TypeScript, Prettier, `git diff --check` et export Expo Android non minifié (2 219 modules) réussissent. Rejouer le cas clavier ouvert sur appareil; APK 1.0.59 antérieure au correctif.

## Accueil — annonce unique du badge Notifications — 15 octobre 2026

Le nom accessible de la cloche de l’Accueil annonce déjà le nombre non lu. Le badge visible est maintenant décoratif (`accessible={false}` et `pointerEvents="none"`) afin que TalkBack/VoiceOver ne répète pas le compte comme un second élément. Le nombre et l’action de navigation vers Notifications ne changent pas. Régression statique ajoutée; vérifier l’annonce sur téléphone avec notifications non lues et avec compteur à zéro.

## Scan QR — garde de création sur réponse de recherche — 15 octobre 2026

La décision d’afficher la proposition « créer cet actif » après un échec de lecture QR/NFC est maintenant isolée dans `mobile/utils/assetScan.ts` et testée comme règle exécutable : il faut simultanément un statut HTTP numérique `404` et le droit Assets de création déjà présent. Un refus `401/403`, une erreur serveur/réseau, une absence de statut ou une valeur mal typée telle que la chaîne `"404"` ne peuvent pas déclencher le parcours de création. `ScanAssetScreen` applique cette garde avant d’afficher la confirmation. Les appels API, permissions serveur, données scannées et règles métier restent inchangés.

Vérifications : `npm run test:mobile-regression` (20 suites, toutes réussies), TypeScript sans erreur, Prettier et `git diff --check`. Export Expo Android non minifié (2 219 modules) réussi pendant ce lot. Le test appareil doit confirmer les cas connu, inconnu autorisé, inconnu sans droit, 403 et réseau coupé; l’APK 1.0.59 ne contient pas ce changement.

## Accueil — navigation des KPI avec préférences indisponibles — 15 octobre 2026

Le chemin du bouton « Ordres de travail » et des KPI restait incohérent avec le périmètre analytique : lorsque les préférences ne chargeaient pas, certaines cartes étaient déclarées ouvrables pour le technicien, mais le gestionnaire ignorait le toucher à cause d’une garde résiduelle `userSettings`. Le bouton général pouvait aussi ouvrir une liste sans périmètre déterminé. Les deux contrôles suivent maintenant `canOpenWorkOrderList` : la navigation technicien reste disponible avec son filtre « assignés à moi »; pour un utilisateur dont le périmètre dépend de la préférence manquante, les actions sont désactivées et leur état l’est aussi annoncé à l’accessibilité. Les filtres de liste, endpoints, permissions et analytics ne changent pas.

Régression étendue sur le garde-fou d’accès et l’absence de navigation résiduelle conditionnée par `userSettings`. Vérifications : `npm run test:mobile-regression` (20 suites), TypeScript sans erreur, Prettier, `git diff --check` et export Expo Android non minifié (2 220 modules). Tester sur appareil un compte technicien et un compte superviseur avec une erreur de chargement des préférences; l’APK 1.0.59 ne contient pas ce correctif.

## Formulaires d’actif — retour du lecteur QR/NFC sans fermer le parent — 15 octobre 2026

Les callbacks de scan utilisés par les formulaires Active appelaient `goBack()` après la fermeture du lecteur. Les modales QR et NFC ferment déjà leur propre écran avant de renvoyer l’identifiant; la navigation répétée pouvait donc dépiler le formulaire parent lui aussi. Les callbacks des deux champs mettent maintenant à jour Formik sans navigation supplémentaire. Le lecteur ferme toujours sa modale, la valeur continue d’être injectée dans le champ et les règles d’identification restent inchangées.

Régression ajoutée : vérifie que les callbacks des formulaires ne rappellent pas `goBack()` et que les lecteurs gardent leur fermeture avant le retour de valeur. Les 20 suites mobiles, TypeScript, Prettier et `git diff --check` passent; export Expo Android non minifié (2 220 modules) réussi. Tester sur appareil un formulaire d’actif avec QR connu puis NFC compatible et confirmer que le formulaire reste ouvert avec sa valeur renseignée. L’APK 1.0.59 ne contient pas ce correctif.

## Accueil — disponibilité du scanner pendant la détection réseau — 15 octobre 2026

NetInfo rapporte `null` pendant qu’il détermine la connectivité; l’Accueil traitait cette valeur inconnue comme une panne et bloquait le scanner. L’action reste maintenant disponible pendant cette détection et n’est bloquée que sur un état explicitement déconnecté ou sans accès Internet. Le retour d’erreur de résolution API reste inchangé et continue d’expliquer les erreurs réelles après scan. Aucun endpoint, filtre, droit ou logique de résolution n’a changé.

Test unitaire ajouté pour les états connectés, inconnus et déconnectés. `npm run test:mobile-regression` (20 suites), TypeScript, Prettier, `git diff --check` et export Expo Android non minifié (2 221 modules) passent. Sur appareil, tester l’ouverture du scanner immédiatement après lancement puis en mode avion; l’APK 1.0.59 ne contient pas ce changement.

## Badges Notifications — total non lu provenant du serveur — 15 octobre 2026

L’Accueil et l’en-tête Demandes comptaient les notifications non lues dans la première page locale (maximum 15), ce qui sous-estimait le total réel dès que l’utilisateur en avait plus. Les deux badges utilisent maintenant le thunk existant `getUnreadNotificationCount`, qui appelle l’endpoint `/notifications/search` avec un décompte agrégé. L’Accueil reprend aussi son indicateur de chargement et son bandeau de réessai depuis l’état d’erreur du thunk; l’étiquette accessible ne présente pas un total zéro quand le comptage n’a pas abouti. Demandes rafraîchit le nombre au retour sur l’onglet. Aucun endpoint, payload, permission ni règle de lecture n’a changé.

Régressions ajoutées pour valider l’endpoint, le total supérieur à 15, l’état d’échec et l’usage dans les deux écrans. Vérifications réussies : `npm run test:mobile-regression` (20 suites), `npx tsc --noEmit --pretty false`, Prettier, `git diff --check` et export Expo Android non minifié (2 221 modules). Sur appareil, créer plus de 15 notifications non lues, vérifier le total sur Accueil/Demandes, puis marquer des notifications lues et confirmer le recalcul au retour. L’APK 1.0.59 ne contient pas ce changement.

## Filtres des listes WO et Demandes — contraste et affordance — 16 octobre 2026

Les filtres inactifs des listes d’ordres de travail et de demandes étaient dessinés sur le fond sans contour visible, ce qui rendait leur forme de commande peu évidente selon le thème et l’écran. Le composant partagé de filtre utilise maintenant une surface distincte et le token `controlOutline`; les filtres sélectionnés gardent le remplissage de marque. Les commandes de filtre/réinitialisation exposent aussi un contour et une cible de 48 dp; l’état actif de la commande principale WO est annoncé par l’accessibilité. Les statuts, critères, permissions, filtres envoyés et appels API n’ont pas changé.

Vérifications : régression ciblée, `npm run test:mobile-regression` (20/20), TypeScript, Prettier, `git diff --check` et export Expo `--platform all` réussis : Web (1 885 modules), Android/Hermes (2 221) et iOS/Hermes (2 212). Ces exports ne prouvent pas le rendu sur appareil; vérifier contraste, sélection/désélection et cibles tactiles en thèmes clair/sombre sur téléphone étroit et grand téléphone. L’APK 1.0.59 n’inclut pas ce lot; aucun APK n’a été reconstruit.

## Aperçu Expo Web rétabli — cache local — 16 octobre 2026

Le lancement documenté d’Expo Web échouait dans l’environnement avec `EACCES` sur `/tmp/metro-cache`, car ce cache appartenait à un autre utilisateur. En donnant à Metro le répertoire temporaire local ignoré `.build-tools/expo-tmp`, Expo démarre sur `localhost:8082`; la page et le bundle JavaScript répondent HTTP 200, et Metro confirme le bundle Web (1 918 modules). Le README contient maintenant la commande de reprise exacte. Cela vérifie le démarrage et la compilation Web, pas le rendu visuel dans un navigateur ni les fonctions natives caméra/NFC. L’aperçu Expo reste actif sur le port 8082 pour le test visuel; `adb` n’est pas installé dans l’environnement, donc aucune vérification Android physique n’a été faite.

## Notifications — cible tactile de l’action d’en-tête — 16 octobre 2026

L’action « Tout marquer comme lu » dans l’en-tête de Notifications n’avait pas de hauteur minimale explicite; son padding seul pouvait produire une cible inférieure au standard mobile QPM. Elle utilise maintenant les 48 dp du token partagé, avec alignement centré et rayon de contrôle. Le libellé, l’état occupé, la condition d’affichage, l’action et l’endpoint restent inchangés. Régression ciblée ajoutée; `npm run test:mobile-regression` (20 suites), TypeScript, Prettier, `git diff --check` et export Expo Web (1 885 modules) passent. Vérifier la cible au toucher et le rendu du texte localisé sur écran étroit et avec grande police; l’APK 1.0.59 ne contient pas ce changement.

## Notifications — action globale fondée sur le total non lu — 16 octobre 2026

La commande « Tout marquer comme lu » dépendait auparavant des éléments de la première page (15 lignes) et pouvait disparaître si les notifications récentes étaient déjà lues alors qu’une notification plus ancienne restait non lue. L’écran consulte maintenant le total agrégé via le thunk existant `/notifications/search`, conserve les éléments de la page comme secours en cas de compte non disponible et recalcule le total après lecture individuelle, lecture globale et actualisation manuelle. En cas d’échec du comptage, il affiche la bannière localisée et relançable déjà disponible. Les endpoints, critères, permissions et traitement serveur ne changent pas. Une régression protège l’usage du total, son échec et ses rafraîchissements.

Vérifications : `npm run test:mobile-regression` (20 suites), TypeScript, Prettier, `git diff --check` et export Expo `--platform all` réussis : Web (1 885 modules), Android/Hermes (2 221) et iOS/Hermes (2 212). Vérifier sur téléphone avec plus de 15 notifications, dont une non lue hors première page, ainsi que la remise à jour après lecture globale; aucune APK n’a été reconstruite et l’APK 1.0.59 ne contient pas ce correctif.

## États d’erreur mobiles — cible tactile de Réessayer — 16 octobre 2026

Le composant partagé `AsyncStateFeedback` utilisait un bouton compact pour relancer une erreur en bannière, sans hauteur tactile minimale explicite. Les deux variantes de Réessayer (bannière et erreur plein écran) utilisent maintenant le token QPM de 48 dp, avec le contenu centré. Les messages, callbacks, états, appels API et règles d’accès ne changent pas.

Une régression vérifie que les deux variantes partagent la cible du token. Vérifications : `npm run test:mobile-regression` (20 suites), TypeScript, Prettier, `git diff --check` et export Expo `--platform all` réussis : Web (1 886 modules), Android/Hermes (2 222) et iOS/Hermes (2 213). Le toucher réel sur petit écran et avec grande police reste à vérifier sur appareil; aucun APK n’a été reconstruit.

## Listes OT et Demandes — cible tactile des actions Réessayer — 16 octobre 2026

Les trois états de relance des listes (erreur de chargement avec résultats, erreur initiale sans résultats, erreur de pagination) n’avaient pas tous une hauteur tactile minimale explicite. Les six actions Réessayer des listes OT et Demandes utilisent maintenant un style commun à chaque écran, avec une hauteur minimale de 48 dp du token QPM et un contenu centré. Le chargement, les messages, les callbacks, les critères, les permissions et les appels API restent inchangés.

Une régression vérifie les trois boutons de chaque écran et leur style tokenisé. `npm run test:mobile-regression` passe (20 suites), `npx tsc --noEmit --pretty false`, Prettier et le contrôle `git diff --check` ciblé passent. L’export Expo `--platform all` réussit : Web (1 886 modules), Android/Hermes (2 222) et iOS/Hermes (2 213). Cet export confirme la compilation des bundles, pas le toucher ni leur rendu natif. Aucun APK n’a été généré; vérifier les cibles tactiles et le rendu en thème clair/sombre sur appareil.

## Exécution des tâches WO — cible tactile pour la reprise — 16 octobre 2026

Après un échec d’enregistrement d’une tâche, l’action « Réessayer » était compacte et n’avait pas de hauteur tactile minimale explicite. Elle utilise maintenant les 48 dp du token QPM et reste désactivée si la tâche est en lecture seule. La sauvegarde, la file d’attente, la valeur mémorisée pour la reprise et les appels API ne changent pas.

Une régression vérifie la présence de l’action dans l’état d’échec et son style tokenisé. `npm run test:mobile-regression` (20 suites), TypeScript, Prettier et `git diff --check` ciblé passent; l’export Expo Android compile 2 222 modules. L’APK 1.0.59 ne contient pas ce changement. Vérifier sur téléphone avec une erreur réseau puis une reprise réussie, notamment en écran étroit; aucun APK n’a été reconstruit.

## Exécution des tâches WO — action Enregistrer les notes — 16 octobre 2026

Le bouton qui enregistre les notes d’une tâche n’exposait pas explicitement son état occupé aux technologies d’assistance et sa hauteur minimale ne suivait pas les 56 dp réservés aux actions principales mobiles. Il utilise maintenant le token prominent (56 dp) et annonce `busy` ainsi que `disabled` pendant la sauvegarde et en lecture seule. Les champs, le verrou anti-double-tap, la sauvegarde, les erreurs, les permissions et l’API restent inchangés.

Une régression vérifie la cible tokenisée et les états accessibles. `npm run test:mobile-regression` (20 suites), TypeScript, Prettier, `git diff --check` ciblé et export Expo Web (1 886 modules) réussissent. Le rendu natif et l’annonce VoiceOver/TalkBack restent à vérifier sur téléphone; l’APK 1.0.59 ne contient pas le changement et aucune nouvelle build n’a été générée.

## Accueil — taille de l’action Scanner — 16 octobre 2026

Le bouton Scanner, principal raccourci terrain de l’accueil et déjà identifié par son libellé, héritait de la hauteur par défaut de React Native Paper. Il atteint maintenant la hauteur de 56 dp du token QPM des actions principales, avec le même rayon et la même navigation. La permission Assets, le contrôle de connectivité et l’ouverture du scanner restent inchangés.

Une régression vérifie l’usage du token prominent. `npm run test:mobile-regression` (20 suites), TypeScript, Prettier, `git diff --check` ciblé et export Expo Web (1 886 modules) passent. Vérifier l’espace disponible en français/anglais sur petit téléphone et l’ergonomie au toucher en clair/sombre sur appareil; l’APK 1.0.59 ne contient pas ce changement.

## Paramètres — cibles tactiles du choix d’apparence — 16 octobre 2026

Dans Paramètres, chaque option Clair, Sombre et Système du sélecteur d’apparence utilise maintenant au moins 48 dp, avec son contenu centré. La sélection, l’application immédiate du thème, la persistance locale et le comportement « Système » restent inchangés.

Le test d’apparence vérifie les trois options et leur token. `npm run test:mobile-regression` (20 suites), TypeScript, Prettier, `git diff --check` ciblé et export Expo Web (1 886 modules) passent. Le toucher, le contraste et le retour visuel de sélection restent à contrôler sur Android/iOS; aucune APK n’a été reconstruite.

## Serveur personnalisé — réinitialisation de session à l’origine par défaut — 16 octobre 2026

L’action « Réinitialiser » supprimait l’URL personnalisée, mais conservait les jetons et l’état Redux persisté de l’entreprise du serveur précédent. Cela pouvait laisser une session incohérente après le retour au serveur par défaut. Le chemin de réinitialisation efface désormais d’abord les jetons et l’identifiant d’entreprise, réinitialise puis vide l’état persisté, et retire ensuite l’URL personnalisée; le changement vers une autre URL réutilise le même helper. La configuration de l’instance est ensuite rechargée comme avant. Aucun endpoint, contrat API, permission ou donnée serveur n’est modifié.

Régression dédiée vérifie l’ordre effacement des jetons → reset Redux → flush persistance et les deux call sites. Vérifications : `npm run test:mobile-regression` passe (21/21), les tests ciblés après formatage passent (2/2), Prettier et `git diff --check` ciblé passent. `tsc --noEmit --pretty false` s’est terminé sans diagnostic (code 0). `npx expo export --platform web --no-minify --output-dir .expo-check-server-reset` a réussi : bundle Web de 1 887 modules, dont `CustomServerScreen`. Aucun APK ni test sur téléphone n’a été fait. À valider dans Expo : configurer un serveur personnalisé, réinitialiser, confirmer le retour à l’URL par défaut et vérifier qu’aucune session ni donnée du serveur précédent ne reste affichée.

## Serveur personnalisé — validation URL immédiate — 16 octobre 2026

Le formulaire n’indiquait un format d’URL invalide qu’après la soumission, sous forme de notification. Le champ valide maintenant à la perte de focus/changement avec le même normaliseur et les mêmes règles qu’à l’enregistrement; l’erreur localisée apparaît dans le champ, et le clavier URL désactive la correction automatique. Les URL sans schéma et HTTP vers un hôte public restent refusées; HTTPS et HTTP localhost restent acceptés. Aucun changement de comportement serveur, d’API ou de permission.

Test Yup couvre ces quatre cas et une régression confirme le branchement au champ. `npm run test:mobile-regression` passe (21/21), `tsc --noEmit --pretty false`, Prettier et `git diff --check` passent. L’export Expo `--platform all --no-minify` réussit : Web (1 888 modules), Android (2 224), iOS (2 215). Aucun build APK ni test tactile réel n’a été fait; vérifier l’erreur sous le champ en français/anglais sur petit écran, puis l’enregistrement d’un serveur HTTPS et de localhost.

## Avis mobile — formulaire accessible avec le clavier — 16 octobre 2026

L’écran d’envoi d’avis utilisait une vue fixe : avec le clavier ouvert sur un petit appareil, le bouton pouvait être masqué sans moyen de faire défiler le contenu. Le formulaire utilise maintenant un `ScrollView` qui grandit pour remplir l’écran, garde les taps sur les champs et utilise le mode de fermeture du clavier adapté à iOS/Android. Le texte du champ reste visible comme libellé flottant pendant et après la saisie, au lieu de disparaître comme un simple placeholder. Le bouton principal suit le token 56 dp et annonce son état désactivé/occupé aux technologies d’assistance. Validation, verrou anti-double-envoi, endpoint `reviews/feedback` et payload `{ value }` restent inchangés.

La régression vérifie le libellé persistant, le défilement, les interactions clavier, le token du bouton et les états accessibles; `npm run test:mobile-regression` passe (22/22 au 16 octobre), Prettier et `git diff --check` ciblé passent. L’export Expo `--platform all --no-minify --output-dir .expo-check-feedback-label` réussit : Web (1 888 modules), Android (2 224), iOS (2 215). Le contrôle TypeScript n’a pas produit de résultat vérifiable dans cette session. Le comportement réel clavier + défilement reste à vérifier sur téléphone étroit avec clavier ouvert; aucun APK n’a été reconstruit.

## Équipements — suppression hors de la page courante — 16 octobre 2026

Le reducer mobile supprimait l’équipement ciblé de la liste avec `splice(index, 1)`, même lorsque l’ID ne se trouvait pas dans la page chargée. Dans ce cas `findIndex` renvoie `-1` et JavaScript supprimait le dernier élément visible, créant un état local trompeur après une suppression réussie d’un autre équipement. Le reducer ne retire maintenant un élément que si l’ID existe dans la page. L’appel de suppression, le contrat API et les données serveur ne changent pas.

Deux tests couvrent l’ID absent (la liste reste intacte) et l’ID présent (seul l’équipement correspondant est retiré). `npm run test:mobile-regression` passe (22/22); Prettier et `git diff --check` ciblé passent. `npx expo export --platform all --no-minify --output-dir .expo-check-asset-delete` réussit : Web (1 888 modules), Android (2 224) et iOS (2 215). Le contrôle TypeScript et l’APK ne sont pas vérifiés dans ce lot; la liste doit aussi être vérifiée visuellement dans Expo après suppression depuis une page différente de celle du détail.

## Réducteurs de listes — suppression d’un identifiant absent — 16 octobre 2026

La même erreur `findIndex()` suivi sans garde par `splice()` existait dans douze listes supplémentaires : catégories, rôles, équipes, compteurs, fichiers, checklists, workflows, achats, composants, fournisseurs, utilisateurs et clients. Un identifiant absent de la page courante renvoyait `-1`, supprimant par erreur son dernier élément. Les reducers ne modifient maintenant la liste que si l’identifiant est présent; les appels API et règles métier restent identiques.

Une suite comportementale couvre pour les douze reducers la suppression d’un ID absent et la suppression d’un ID présent; les deux cas Asset sont également conservés. `npm run test:mobile-regression` passe (23 fichiers de test); Prettier passe. Exports Expo Web (1 888 modules) et Android/Hermes (2 224 modules) réussis. L’export iOS n’a pas produit d’artefacts et TypeScript n’a pas fourni de code de sortie exploitable; aucun APK n’a été généré. Vérifier dans Expo une suppression réussie d’un objet qui n’est pas dans la page actuellement affichée et confirmer que les autres lignes restent en place.

## Cohérence des caches après suppression — 16 octobre 2026

Les écrans de sélection réutilisent les listes mini Redux et les écrans de détail peuvent rester montés dans la navigation. Après suppression réussie, plusieurs reducers ne retiraient l’objet que de la page principale; un objet supprimé pouvait donc réapparaître dans les sélecteurs ou dans une fiche encore en mémoire. Les reducers Actif, Équipe, Compteur, Fournisseur, Utilisateur, Client, Pièce et Ensemble de pièces retirent maintenant l’ID de leurs caches mini, détails et listes liées pertinentes. Aucun appel API, permission ou comportement backend n’a changé.

Des assertions vérifient ces caches par reducer; `npm run test:mobile-regression` passe (**23/23 fichiers**), `npx tsc --noEmit --pretty false` termine avec code 0, les exports Expo Web et Android réussissent (1 888 et 2 224 modules), Prettier et `git diff --check` ciblés passent. Le contrôle visuel dans Expo et l’export iOS restent à faire; aucun APK n’a été généré.

## Sélecteurs d’annuaires — récupération après erreur réseau — 16 octobre 2026

Les sélecteurs de membres d’équipe, utilisateurs, clients et fournisseurs pouvaient rester en chargement infini après une panne du mini-catalogue. Leurs thunks libèrent maintenant toujours `loadingGet` en `finally`; chaque modal gère aussi son chargement propre, affiche une erreur relançable si rien n’est en cache, ou garde les anciennes options visibles avec une bannière Réessayer si la reprise échoue. Les paramètres, payloads, endpoints et permissions restent les mêmes.

Quatre tests font échouer les thunks, vérifient la libération du chargement et la conservation du cache, puis contrôlent le branchement des états d’erreur/reprise dans chaque modal. `npm run test:mobile-regression` passe (**24/24 suites**), `npx tsc --noEmit --pretty false`, Prettier et `git diff --check` ciblés passent. L’export Expo `--platform all --no-minify` réussit : Web (1 876 modules), Android (2 224) et iOS (2 215). Reste à vérifier visuellement l’erreur, le retry et les options en cache dans Expo; aucun APK n’a été généré.

## Sélecteur d’équipements — isolation de cache d’emplacement et reprise — 16 octobre 2026

- Le sélecteur (`SelectAssetsModal`) présente maintenant une erreur récupérable si la liste ne peut pas être chargée, avec bouton Réessayer. Lors d’une actualisation en échec, les équipements précédemment chargés pour le même emplacement restent visibles avec une bannière d’avertissement.
- Le slice conserve une mini-liste partagée alors que l’endpoint accepte `locationId`. Pour éviter d’afficher des résultats d’un emplacement précédent, le sélecteur n’utilise le cache que lorsqu’une réponse réussie correspond à l’emplacement courant. Les réponses locales obsolètes ne peuvent plus remplacer l’état d’un chargement plus récent.
- API, endpoint, permissions et sélection réussie inchangés. Tests : `asset-selector-load.test.cjs` vérifie l’échec réseau, l’arrêt du loader, la préservation du cache et la présence des états de reprise/filtrage de cache.
- Vérification : `npm run test:mobile-regression` — **25/25 suites**; `npx tsc --noEmit --pretty false`; Prettier et `git diff --check` ciblés réussis. `npx expo export --platform all --no-minify` bundle Web (1 888 modules), Android (2 224) et iOS (2 215). Le contrôle visuel sur téléphone/Expo reste à faire; aucun APK n’a été produit.

## Scanner QR — initialisation selon le cycle de vie de l’application — 16 octobre 2026

À l’ouverture du scanner, l’interface supposait que l’application était déjà active. Si l’écran était monté pendant une transition AppState, `CameraView` pouvait être démarré alors que l’application était en arrière-plan, avant que le listener ne rattrape l’état. Le scanner initialise maintenant son état UI et son verrou de callback depuis `AppState.currentState`; la prévisualisation reste masquée jusqu’au retour à l’état actif. Lecture du QR, permission, résolution de l’actif, droits et API ne changent pas.

La régression du cycle de vie est ajoutée au test caméra dans `mobile/scripts/mobile-regression.test.cjs`. Vérifications : `npm run test:mobile-regression` (**26/26 suites**), Prettier, export Expo Web (**1 888 modules**) et Android/Hermes (**2 224 modules**) réussis. Le typecheck a été tenté mais le processus s’est terminé sans code de sortie exploitable; il n’est pas déclaré réussi. iOS/Hermes, aperçu caméra réel, reprise après retour des réglages et lecture QR restent à vérifier sur appareil; aucun APK/IPA n’a été généré.

## Sélecteur pièces et jeux — états vides et reprise avec cache — 16 octobre 2026

Dans le sélecteur utilisé par l’exécution des WO, les onglets Pièces et Jeux de pièces laissaient une liste blanche sans explication si le catalogue était vide ou si la recherche ne trouvait rien. Une erreur de rafraîchissement s’affichait en superposition et rendait inutilisables les options déjà chargées. Les deux onglets distinguent maintenant chargement initial, erreur initiale avec Réessayer, liste vide, recherche sans résultat et erreur de rafraîchissement. Quand un cache existe, les lignes restent visibles et sélectionnables avec un bandeau d’avertissement et une action de reprise. Les champs de recherche ont un nom accessible explicite; les textes d’état sont localisés EN/FR.

API, payloads, droits, sélection, navigation vers les fiches et création de pièce restent inchangés. Vérifications : test ciblé et suite `npm run test:mobile-regression` (**27/27**), TypeScript, Prettier, `git diff --check` et export Expo Android/Hermes (**2 224 modules**) réussis. L’export Expo Web a écrit `metadata.json` et ses bundles après compilation (**1 888 modules**), mais le wrapper a atteint son délai de 90 secondes pendant la fermeture et renvoyé 124; je ne compte pas sa commande comme succès propre. Le rendu sur appareil et l’export iOS restent à vérifier; aucun APK/IPA n’a été généré.

## Sélecteur de compteurs — erreur réseau visible et reprise — 16 octobre 2026

Dans le sélecteur utilisé par les tâches Compteur, l’erreur de chargement se trouvait dans le pied de liste; avec de nombreux résultats, elle et Réessayer pouvaient rester hors écran. Une panne au premier chargement pouvait aussi ressembler à une absence de compteurs. Un message EN/FR spécifique distingue maintenant l’erreur d’une liste vide. Si un cache existe, les compteurs restent consultables et sélectionnables, avec un bandeau de reprise visible au-dessus de la liste; sans cache, un état d’erreur et l’action Réessayer occupent la zone de résultats. Le pull-to-refresh, la recherche, la sélection simple/multiple, les droits et les API restent inchangés.

Vérifications : `npm run test:meter-selector-states`, `npm run test:mobile-regression` (**28/28**), TypeScript, Prettier, `git diff --check` et export Expo Android/Hermes (**2 224 modules**) réussis. Le rendu et le toucher réel restent à vérifier sur appareil; aucun APK/IPA n’a été généré.

## Sélecteur de checklists — erreur réseau et chargement local — 16 octobre 2026

Le sélecteur de checklists utilisé pour composer les tâches d’un ordre de travail distingue maintenant le chargement initial, l’absence de checklists, l’absence de résultat de recherche et l’échec réseau. Une erreur sans cache affiche Réessayer dans la zone visible; si des checklists sont déjà chargées, elles restent accessibles avec une bannière de reprise au-dessus de la liste. Le rafraîchissement dépend d’un état local au modal et les appels rapprochés sont coalescés, au lieu d’utiliser le drapeau global partagé du slice.

La conversion des modèles de checklist en tâches, l’ajout à la sélection, la navigation de retour, les API et les permissions restent inchangés. Tests : `npm run test:checklist-selector-states` et `npm run test:mobile-regression` (**29 suites**); TypeScript, Prettier et l’export Expo `--platform all --no-minify` réussissent (Web **1 888**, Android **2 224**, iOS **2 215** modules). L’aperçu sur appareil n’a pas été vérifié; aucun APK/IPA n’a été généré.

## Formulaire de tâche manuelle — options stables et libellés accessibles — 16 octobre 2026

Dans la création d’une tâche de type choix multiple, les rangées d’options étaient rendues sans clé React stable. Après suppression d’une option, React pouvait réutiliser le champ voisin et déplacer le focus. Chaque option possède maintenant un identifiant local stable, indépendant de sa position; les champs de tâche et d’option, le bouton de suppression et l’action d’ajout sont nommés pour l’accessibilité et les libellés sont localisés en français et en anglais. Le formulaire évite aussi le clavier sur iOS et laisse les contrôles enfants répondre dès le premier tap lorsque le clavier est ouvert.

Le format de l’objet tâche envoyé à la fonction de sélection reste le même (`label` pour chaque option), et la navigation, les validations et les endpoints ne changent pas. `npm run test:task-options-accessibility`, `npm run test:mobile-regression` (**30 suites**), TypeScript et Prettier passent; l’export Expo `--platform all --no-minify` passe sur Web (**1 888**), Android (**2 224**) et iOS (**2 215** modules). Le test clavier/curseur doit encore être fait sur un téléphone; aucun APK/IPA n’a été produit.

## Actions de l’historique PM — cibles tactiles et libellés — 16 octobre 2026

Dans le détail d’un plan préventif, les boutons compacts d’ouverture du WO lié et de pagination des appels/WO n’assuraient pas le minimum QPM de 48 dp. Ils utilisent maintenant le token partagé de cible tactile; les deux commandes « Charger plus » annoncent aussi la section concernée aux lecteurs d’écran. Les routes vers les WO, la pagination, les appels API et les permissions restent inchangés.

La régression est intégrée à `mobile-regression.test.cjs`. Vérifications : `npm run test:mobile-regression` (**30 fichiers**), `npx tsc --noEmit --pretty false`, Prettier, `git diff --check` et export Expo Web (**1 888** modules), Android (**2 224**) et iOS (**2 215**) réussis. Les dimensions tactiles, VoiceOver/TalkBack et navigation avec le Dev Client restent à contrôler sur appareil; aucun APK/IPA n’a été reconstruit.

## Titres de sections annoncés aux lecteurs d’écran — 16 octobre 2026

Les titres de sections clés dans Accueil, détail WO, détail Demande, détail Actif et détail de maintenance préventive sont maintenant exposés comme en-têtes natifs (`accessibilityRole="header"`). Les titres de l’historique du cycle de vie WO et des descriptions audio sont également hiérarchisés. Le contenu, la navigation, les permissions, les données et les appels API restent inchangés.

Une régression vérifie ces repères sémantiques dans `mobile-regression.test.cjs`. Vérifications : `npm run test:mobile-regression` (**30 suites**), `npx tsc --noEmit --pretty false`, Prettier, `git diff --check` et export Expo `--platform all --no-minify` réussis : Web (**1 888 modules**), Android (**2 224**) et iOS (**2 215**). La navigation réelle par titres avec TalkBack/VoiceOver et le rendu sur appareil restent à vérifier; aucun APK/IPA n’a été généré.

## Paramètres — options d’apparence et icônes de ligne accessibles — 16 octobre 2026

Les choix Clair, Sombre et Système atteignent maintenant au moins 48 dp. Les icônes des lignes Compte, Déconnexion, Licence, Profil d’entreprise et Version utilisent des `List.Icon` décoratifs au lieu de boutons imbriqués dans des lignes déjà interactives; cela retire des cibles d’action doublées sans changer les destinations ni les actions. Le test vérifie les cinq icônes et l’absence d’`IconButton` dans l’écran.

La première version du contrôle de régression comptait uniquement les callbacks écrits sur plusieurs lignes; le test a été corrigé pour compter tous les `List.Icon`. Vérifications : `npm run test:mobile-regression` (**30/30 fichiers**), test d’apparence ciblé, TypeScript `tsc --noEmit --pretty false`, Prettier et `git diff --check` réussis. Export Expo `--platform all --no-minify` réussi : Web (**1 888 modules**), Android (**2 224**) et iOS (**2 215**). Les tailles tactiles, le focus et les annonces TalkBack/VoiceOver restent à vérifier sur appareils; aucune APK/IPA n’a été générée.

## Création d’ordre — choix Tâche ou Checklist — 16 octobre 2026

Le sélecteur de type de tâche affichait deux cartes avec un pictogramme rendu comme bouton sans action et un texte de 50 px, ce qui rendait le parcours disproportionné et créait des contrôles imbriqués. Il présente maintenant un titre de section et deux cartes compactes adaptées au thème clair/sombre, avec icônes décoratives, une cible accessible unique par choix et une hauteur tactile minimale issue des tokens QPM. Les clés stables évitent aussi les avertissements/réutilisations incorrectes lors du rendu.

Les destinations `SelectTasks` et `SelectChecklists`, ainsi que les paramètres `onChange` et `selected`, restent inchangés. Régression ajoutée dans `mobile-regression.test.cjs`. Vérifications : `npm run test:mobile-regression` (**30/30 fichiers**), TypeScript, Prettier et `git diff --check`; export Expo `--platform all --no-minify` réussi sur Web (**1 888 modules**), Android (**2 224**) et iOS (**2 215**). La mise en page et l’annonce par lecteur d’écran restent à vérifier sur téléphone; aucune APK/IPA n’a été générée.

## Revalidation Mobile — suites, TypeScript et bundles — 17 octobre 2026

- Recontrôle local : `npm run test:mobile-regression` passe **30/30**; `tsc --noEmit --pretty false` termine avec le code **0**. L’export Expo `--platform all --no-minify` réussit : Web (**1 888 modules**), Android/Hermes (**2 224**) et iOS/Hermes (**2 215**). Le dossier temporaire d’export a été supprimé après vérification. Aucun APK/IPA n’a été construit.
- Ces contrôles valident les tests unitaires, les types et les bundles JavaScript, pas le comportement natif en situation réelle. Restent : lecture QR/caméra et NFC sur appareils compatibles, permissions après retour des paramètres, accessibilité TalkBack/VoiceOver, vérification iOS native et parcours de clôture/réouverture sur une base d’intégration.
- Le point bloquant MVP le plus important reste l’intégration du cycle de vie WO `COMPLETE` avec la migration et les droits sur une base de test, puis les essais par rôle et sur téléphone. Le backlog correspondant décrit déjà les critères P0/P1; ne pas considérer la clôture comme validée par les seuls tests client.

## Formulaires — restaurer la sélection d’un seul élément — 18 octobre 2026

Les écrans de sélection attendent une liste d’identifiants, alors que les champs Formik simples (actif, équipe, personne, etc.) contiennent un seul objet `{ label, value }`. Le formulaire transformait uniquement les tableaux; lors de la réouverture d’un sélecteur depuis une fiche existante, la sélection n’était donc pas transmise. Une fonction commune normalise maintenant les valeurs simples et multiples, convertit les identifiants numériques sérialisés en nombres et conserve les tâches structurées. Le sélecteur d’actifs montre aussi une coche et un état sélectionné accessible pour l’actif déjà choisi.

Les valeurs soumises, routes, API, droits et règles métier ne changent pas. Une régression vérifie les sélections simples, multiples, tâches et valeurs absentes, ainsi que leur branchement au formulaire. Le contrôle visuel de cette restauration, le typecheck et les essais sur appareil restent à faire dans Expo; aucune APK/IPA n’a été générée pour ce lot.

## Scanner QR — sortie explicite du lecteur — 18 octobre 2026

Quand l’aperçu caméra était actif, le lecteur QR/barcode ne montrait aucune action pour le fermer. Le scanner présente maintenant un bouton de fermeture accessible, placé dans la zone sûre supérieure pour éviter les encoches et barres système. La navigation, la lecture et la résolution d’identifiant restent inchangées; aucun endpoint ni règle métier n’a été modifié.

Une régression vérifie l’action, son libellé lecteur d’écran et l’enveloppe safe-area. `npm run test:mobile-regression` passe (**30/30 fichiers**), Prettier et `git diff --check` ciblé passent. Le contrôle TypeScript a été interrompu par le système avec le code 137 (processus tué), donc il n’est pas déclaré réussi. Le placement et la cible tactile doivent encore être vérifiés dans le Dev Client sur iOS et Android; aucune APK/IPA n’a été générée.

## Sélecteur de catégorie — choix courant visible — 18 octobre 2026

Le sélecteur de catégories utilisait l’état sélectionné uniquement en mode multiple. En mode simple, le formulaire pouvait transmettre la catégorie existante mais aucune coche ni annonce d’état ne l’indiquait dans la liste. Le picker expose maintenant l’état « sélectionné » aux technologies d’assistance et affiche une coche QPM sur la catégorie choisie. La sélection, les listes d’options et les formulaires restent identiques.

Régression ajoutée dans `mobile/scripts/mobile-regression.test.cjs`. La suite Mobile passe (**30/30**), le typecheck `tsc --noEmit --pretty false` et Prettier passent aussi. API, permissions et logique métier inchangées. L’affichage et le parcours restent à contrôler dans Expo sur appareil; la même vérification UX reste à mener sur les autres sélecteurs à choix unique. Aucune APK/IPA n’a été générée.

## Sélecteur de personnes — choix courant visible — 18 octobre 2026

Le sélecteur de personnes utilisé pour affecter un responsable pouvait recevoir une personne déjà sélectionnée sans l’indiquer visuellement ni aux technologies d’assistance en mode choix unique. Il affiche maintenant une coche sur la personne courante et expose son état « sélectionné ». Le mode multiple conserve ses cases à cocher; les callbacks, données, permissions et API ne changent pas.

Régression ajoutée dans `mobile/scripts/mobile-regression.test.cjs`. Les sélecteurs clients et compteurs restent à auditer et traiter par lots ciblés. Aucun test sur appareil ni build APK/IPA n’est inclus dans ce lot.

## Sélecteur de localisation — choix courant visible — 18 octobre 2026

L’audit des sélecteurs d’équipes et de localisations a confirmé que les lignes en mode choix unique omettaient l’indicateur visuel et l’état d’accessibilité pour la valeur préchargée. Le composant de ligne de localisation, réutilisé par toute la liste, affiche maintenant une coche pour l’élément courant et annonce son état « sélectionné ». Les cases du mode multiple, le filtrage, les callbacks, les API et les règles de localisation restent inchangés. Le sélecteur d’équipes conserve ce défaut pour un prochain lot ciblé.

Régression ajoutée dans `mobile/scripts/mobile-regression.test.cjs`. Les sélecteurs de localisation et d’équipe ont depuis été corrigés dans leurs lots dédiés. Les tests Mobile, le typecheck, Prettier et `git diff --check` passent. TalkBack/VoiceOver et le rendu sur appareil restent à tester; aucune APK/IPA n’est générée.

## Sélecteur d’équipe — choix courant visible — 18 octobre 2026

Le sélecteur d’équipes n’indiquait pas la sélection préchargée en mode simple, alors que ce choix est notamment utilisé pour affecter des membres aux opérations. La ligne affiche maintenant une coche QPM et expose l’état « sélectionné » aux technologies d’assistance; les cases à cocher en mode multiple demeurent inchangées. Les callbacks, les données transmises, les API et les règles d’affectation sont préservés.

Régression ajoutée dans `mobile/scripts/mobile-regression.test.cjs`. Suite Mobile, TypeScript, Prettier et `git diff --check` validés sur ce lot. TalkBack/VoiceOver et le rendu sur appareil restent à vérifier; aucune APK/IPA n’est générée.

## Sélecteur de compteurs — choix courant visible — 18 octobre 2026

Le picker de compteurs affichait une case uniquement en mode multiple. En mode simple, une valeur déjà sélectionnée n’avait ni coche visible ni état accessible. La ligne de sélection montre maintenant une coche QPM pour le compteur courant et expose `selected` aux lecteurs d’écran; le mode multiple continue d’exposer `checked`. La recherche, les données, les callbacks, les API et le comportement de sélection ne changent pas.

Régression ajoutée dans `mobile/scripts/mobile-regression.test.cjs`. Vérifications sur ce lot : tests Mobile, TypeScript, Prettier et `git diff --check`. Les tests d’accessibilité sur téléphone restent à faire; aucune APK/IPA n’est produite.

## Sélecteur de fournisseurs — choix courant visible — 18 octobre 2026

L’audit des pickers fournisseur et client a confirmé la même lacune dans les deux implémentations : en choix unique, une valeur préchargée n’était pas marquée visuellement ni annoncée comme sélectionnée. Le picker fournisseur, utilisé dans les parcours d’approvisionnement, affiche maintenant une coche QPM et expose l’état `selected`; le contrôle `checked` des sélections multiples reste inchangé. Les valeurs, callbacks, endpoints et règles d’approbation ne changent pas. Le sélecteur client reste à traiter dans un lot ultérieur, car il ne partage pas de composant de ligne avec le picker fournisseur.

Régression ajoutée dans `mobile/scripts/mobile-regression.test.cjs`. La suite Mobile, TypeScript, Prettier et `git diff --check` passent. Le picker client a depuis été corrigé dans son lot dédié. La vérification TalkBack/VoiceOver sur appareil reste à faire; aucune APK/IPA n’est générée.

## Sélecteur de clients — choix courant visible — 18 octobre 2026

Le picker client était le dernier annuaire audité dont la sélection préchargée restait invisible en choix unique et sans annonce d’état. Il affiche maintenant une coche QPM pour le client sélectionné et expose `accessibilityState.selected`; les cases et l’état `checked` du mode multiple restent inchangés. La recherche, la valeur retournée, les callbacks et les contrats API ne changent pas.

Régression ajoutée dans `mobile/scripts/mobile-regression.test.cjs`. Suite Mobile, TypeScript, Prettier et `git diff --check` validés. TalkBack/VoiceOver et le rendu sur appareil restent à vérifier; aucune APK/IPA n’est générée.

## Sélecteur de pièces — action « Ajouter » accessible — 18 octobre 2026

Le bouton « Ajouter » en haut du sélecteur de pièces était désactivé tant qu’aucune pièce n’était sélectionnée, mais le `Pressable` n’exposait ni son rôle de bouton ni cet état désactivé aux technologies d’assistance. Il annonce maintenant le nombre de pièces sélectionnées et son état `disabled`; la condition de disponibilité, les valeurs retournées et la navigation restent identiques.

Une régression vérifie le rôle, le libellé avec le nombre et l’état désactivé. Aucun endpoint, droit, règle d’inventaire ou comportement d’ajout ne change. TalkBack/VoiceOver doivent encore être vérifiés sur téléphone; aucune APK/IPA n’est générée.

## Tâche avec compteur — sélection conservée à la réouverture — 18 octobre 2026

Lorsqu’on rouvrait le sélecteur de compteurs depuis la création d’une tâche de type « compteur », celui-ci recevait toujours une liste vide même si un compteur avait déjà été choisi. Le nom restait visible sur le formulaire, mais la coche et l’état sélectionné disparaissaient dans le picker. Le formulaire transmet désormais l’identifiant du compteur courant comme sélection initiale; une première ouverture continue de démarrer sans sélection. Les données enregistrées, callbacks, API et règles métier ne changent pas.

Une régression vérifie que le picker reçoit l’identifiant courant et garde le choix unique. Validation de l’interface sur appareil non effectuée dans ce lot; aucune APK/IPA n’est générée.

## Tâche avec équipement — sélection conservée à la réouverture — 18 octobre 2026

Dans l’ajout d’une tâche avec équipement associé, rouvrir le sélecteur d’équipements transmettait une sélection vide alors que l’équipement restait affiché sur le formulaire. La coche courante et l’état sélectionné n’étaient donc pas restaurés dans la liste. Le formulaire transmet maintenant l’identifiant de l’équipement choisi; à la première ouverture, aucune sélection n’est ajoutée. Le mode choix unique, les données enregistrées et les contrats API restent inchangés.

Une régression vérifie le préremplissage du sélecteur. Les interactions TalkBack/VoiceOver et le rendu sur appareil restent à valider; aucun build APK/IPA n’est effectué.

## Tâche — responsable conservé à la réouverture — 18 octobre 2026

Le formulaire de tâche conservait le responsable choisi dans son résumé, mais rouvrait le sélecteur de personnes avec une sélection vide. La personne courante n’était donc ni cochée ni exposée comme sélectionnée dans la liste. Le picker reçoit désormais l’identifiant du responsable courant; la première ouverture reste sans sélection. Le flux d’affectation, les données et l’API ne changent pas.

Une régression vérifie la valeur initiale transmise au sélecteur. Essai TalkBack/VoiceOver sur appareil restant; aucune APK/IPA n’est générée.

## Demandes — résultats obsolètes masqués après un filtre en échec — 18 octobre 2026

La liste conservait les demandes du filtre précédent pendant une nouvelle recherche; si la nouvelle requête échouait, ces anciennes lignes restaient sous les nouveaux filtres. La pagination pouvait aussi tenter de continuer sur cette liste obsolète. La vue affiche maintenant les lignes seulement lorsque leur filtre correspond au filtre courant, présente l’état de chargement ou l’erreur de la requête courante et bloque la pagination jusqu’au succès de la première page. Un rafraîchissement qui échoue avec les mêmes filtres conserve les résultats déjà pertinents et montre l’erreur. Les endpoints, critères transmis et règles métier ne changent pas.

Régression ciblée ajoutée dans `mobile/scripts/mobile-regression.test.cjs`. Essai réseau réel et rendu sur appareil non inclus; aucune APK/IPA n’est générée.

## Équipements — résultats obsolètes masqués lors d’une recherche — 21 octobre 2026

La vue liste réutilisait les lignes du chargement précédent pendant une nouvelle recherche, et après un échec réseau les équipements pouvaient rester affichés sous le nouveau terme de recherche. La pagination pouvait également démarrer avec ces lignes et l’ancien numéro de page. Les résultats sont maintenant liés aux critères et au texte de recherche ayant réussi; avant cela, l’écran montre un chargement ou l’erreur avec reprise, et la pagination reste inactive. Un rafraîchissement en échec pour la même recherche garde les lignes pertinentes et expose l’erreur. Aucun endpoint, filtre serveur ou règle d’accès n’a changé.

Une régression vérifie l’association critères/résultats, l’absence de pagination sur une liste obsolète et la protection contre les réponses de première page dépassées. Rendu/réseau réel non vérifiés; aucun APK/IPA n’est généré.

Suite après ce lot : `npm run test:mobile-regression` (**30/30**), `tsc --noEmit --pretty false`, Prettier et `git diff --check` passent. La sélection à la réouverture reste à confirmer visuellement sur téléphone.

## Liste des OT — résultats associés aux filtres et à la recherche — 18 octobre 2026

La liste pouvait continuer à afficher les OT précédents quand les filtres changeaient ou pendant le délai de recherche, puis les garder si la requête échouait. La pagination pouvait aussi partir depuis ces lignes périmées. Les résultats sont maintenant visibles uniquement si les filtres et le texte de recherche correspondent à la dernière première page chargée; les changements affichent un état de chargement et une erreur ne révèle plus les anciens OT. Une actualisation échouée avec la même recherche conserve les lignes valides et présente l’erreur relançable. Aucun endpoint, filtre, permission ou règle d’OT ne change.

Une régression est ajoutée à `mobile/scripts/mobile-regression.test.cjs`. Suite Mobile (**30/30**), TypeScript, Prettier et export Expo Web (**1 889 modules**) validés; essai réseau réel et rendu téléphone restent à faire.

## Liste des OT — erreur de pagination liée aux critères actifs — 21 octobre 2026

Pendant la saisie d’une nouvelle recherche, la liste masquait déjà les OT de l’ancienne recherche, mais le pied de liste pouvait conserver l’erreur et le bouton « Réessayer » de l’ancienne pagination pendant le délai de recherche. Cette reprise était inerte, car le chargement de page vérifie correctement que les critères sont à jour. Le message de pagination n’est désormais rendu que pour la recherche actuellement affichée. Les filtres, appels API et règles métier restent inchangés.

Régression ciblée ajoutée dans `mobile/scripts/work-order-load-errors.test.cjs`; vérification appareil non effectuée.

## Inventaire Mobile — recherche de pièces sans résultats périmés — 18 octobre 2026

La liste des pièces conservait les lignes précédentes pendant la recherche différée, sans vérifier qu’elles correspondaient au nouveau texte; un échec de rafraîchissement avec des lignes affichées ne présentait pas non plus d’avertissement relançable. Elle lie désormais les résultats à la recherche et aux critères chargés, empêche la pagination des anciennes lignes et affiche une bannière d’erreur quand des résultats valides restent visibles. Aucun contrat API ou calcul d’inventaire ne change.

Régression ajoutée dans `mobile/scripts/mobile-regression.test.cjs`. Suite Mobile (**30/30**), TypeScript, Prettier, export Expo Web (**1 889 modules**) et `git diff --check` réussis; validation sur téléphone non effectuée.

## Home — diagnostic des KPI affichés à zéro — 18 octobre 2026

Le code UI ne confirme pas un zéro artificiel : `HomeScreen` affiche `—` avant que `mobileOverviewLoaded` soit vrai, puis affiche les valeurs API reçues telles quelles, y compris un zéro réel. Le store ignore les réponses obsolètes et n’indique le chargement terminé qu’après un succès; un test distingue la valeur initiale du zéro renvoyé par l’API. L’endpoint `analytics/work-orders/mobile/overview` applique le scope société ou « assignés uniquement » demandé par la préférence `statsForAssignedWorkOrders`.

Pour expliquer le `00` observé sur le compte concerné, comparer les six cartes à la réponse JSON de cet endpoint avec la même valeur `assignedToMe`, puis répéter avec les deux préférences de scope et vérifier les WO clôturés/archivés. Vérifier également réseau interrompu/relance sur appareil. Point sécurité à traiter séparément : la méthode d’overview semble protégée par rôle Spring global, sans permission granulaire identifiée dans ce chemin; ne pas compenser cette lacune par le masquage UI. Aucun changement API ou permission n’a été fait dans cette passe.

## Home et Stats — réduction de la duplication — 18 octobre 2026

Home et Stats consommaient la même synthèse et affichaient six cartes de compteurs d’OT en double. Home conserve maintenant les deux signaux d’action de cette réponse — échéances du jour et priorité élevée — tandis que Stats garde la répartition analytique complète. Le résumé d’OT actif dans l’en-tête, les filtres, le scope assigné/global, les permissions, la navigation et l’API restent inchangés. L’endpoint ne fournissant pas de nombre d’OT en retard, Home n’en invente pas.

Régression ajoutée dans `mobile/scripts/mobile-regression.test.cjs`. Validation de ce lot : suite Mobile (**30/30**), TypeScript, Prettier, `git diff --check` et export Expo Web réussi (**1 889 modules**). L’export est temporaire et n’a pas produit d’APK/IPA; essai visuel sur appareil encore requis.

## Clôture WO — aperçu obligatoire avant enregistrement — 18 octobre 2026

Tous les parcours mobiles de clôture affichent maintenant un écran de récapitulatif après validation du formulaire et avant l’appel API. Il reprend le WO et l’équipement, les temps main-d’œuvre enregistrés par intervenant (avec estimation à l’instant présent pour un chronomètre encore actif), le commentaire et la présence de la signature. L’utilisateur peut revenir modifier ses saisies; seul « Confirmer et clôturer » envoie le statut `COMPLETE`.

Le récapitulatif distingue explicitement le total de main-d’œuvre en personnes-heures de la durée calendaire d’exécution du WO. Le commentaire et la signature restent conservés si l’utilisateur revient à la saisie. Le payload de clôture et les règles de droits/statut restent inchangés; la lecture de durée est exposée par un endpoint additionnel. Tests ciblés du parcours d’aperçu et Prettier réussis. Reste la recette visuelle Android/iOS, thème clair/sombre et gros caractères; aucun APK/IPA n’a été généré.

### Mesure de la durée active du WO

L’aperçu récupère maintenant le temps actif écoulé via `GET /work-orders/{id}/execution-time`. Le calcul additionne les intervalles où le WO est `IN_PROGRESS` et exclut les intervalles `ON_HOLD`; un chronomètre encore actif est arrêté à l’heure de consultation et signalé comme tel. Le journal existant des transitions est utilisé, avec contrôle d’accès par entreprise et visibilité du WO. Aucun changement de schéma, de statut ni de payload de clôture n’est requis; l’endpoint de lecture est rétrocompatible.

La mesure est déclarée indisponible si l’historique est absent, incomplet ou incohérent. Les anciens WO ne peuvent donc pas recevoir une durée exacte reconstruite après coup; seuls les changements de statut enregistrés à partir de cette mise à jour rendent le calcul fiable. Le temps de main-d’œuvre reste un indicateur distinct, cumulant les heures-personnes. Les tests Java ciblés du calcul, de l’accès au service, du contrôleur et de l’enregistrement d’une transition ont tous réussi (**7/7**, exécutés depuis une copie temporaire du backend avec Maven 3.8.6; le dépôt n’a pas de script `mvnw` exécutable). Nouvelle recette Mobile : suite complète **30/30**, TypeScript Mobile et Prettier passent. Côté Web, le test structurel ciblé et ESLint des fichiers de clôture passent; les avertissements de formatage des quatre fichiers ont ensuite été corrigés et `CI=true npm run build` réussit. Des avertissements de source maps tierces restent sans échec de compilation. Vérifier encore l’endpoint sur une API/base d’intégration et la présentation en navigateur, Android et iOS.

## Navigation mobile — pilule, Scan et création contextuelle — 18 octobre 2026

La barre du bas utilise maintenant les destinations Accueil, Ordres de travail, Scan, Stats et Plus (Requests prend la place d’Accueil pour Requester). Scan est l’action centrale surélevée et ouvre le scanner seulement après appui; la consultation d’équipements reste protégée par permission. Les demandes restent accessibles dans Plus si le droit de consultation et l’activation entreprise le permettent.

Le bouton Create est un FAB séparé, caché pendant la saisie clavier et affiché seulement si l’utilisateur a une permission de création. Il ouvre le formulaire de demande existant pour Requester ou la feuille de création existante pour les autres rôles. Tests dédiés et suite Mobile vérifient routes, permissions et déclenchement; l’essai visuel safe-area/lecteur d’écran sur Android et iOS reste à faire. Aucun changement d’API ou de règles métier.

## Harmonisation des cartes mobiles — 18 octobre 2026

Les cartes de Work Orders, Home, statistiques et répertoires partagent le token QPM `radius.cardLarge`, désormais fixé à **18 dp** (contre 20 dp); le rayon standard reste à 16 dp. L’audit statique des écrans principaux ne trouve pas de couleur d’interface codée en dur : surfaces, textes et badges de statut s’appuient sur le thème et les couleurs sémantiques existantes.

Le test d’apparence verrouille le rayon partagé à 18 dp. Suite Mobile (**31/31**), TypeScript et Prettier passent. Vérifier le rendu et le contraste clair/sombre avec texte agrandi sur Android et iOS; aucun APK/IPA n’a été généré.

## Messages d’expiration API localisés — 19 octobre 2026

Les requêtes réseau Mobile qui dépassent leur délai produisent maintenant `RequestTimeoutError` (`REQUEST_TIMEOUT`) au lieu d’une chaîne française générique. `getErrorMessage` utilise le singleton i18n pour afficher le texte dans la langue choisie : anglais, français, ou repli anglais pour les autres langues tant qu’une traduction dédiée n’existe pas. L’annulation demandée par un écran reste un `AbortError` silencieux et n’est pas présentée comme un timeout.

Le test couvre timeout, annulation, sélection de langue anglaise/française. Suite Mobile **31/31**, TypeScript Mobile et Prettier ciblé passent. Les délais réseau réels et le rendu sur appareil ne sont pas testés dans cette session; aucun APK/IPA n’a été généré.

## Rafraîchissement de session — conserver les jetons en cas de panne réseau — 19 octobre 2026

`performRefresh` supprimait auparavant access token et refresh token pour toute exception, y compris un timeout ou une panne réseau. Le nettoyage reste appliqué aux réponses explicites non autorisées et aux réponses invalides; une exception de transport renvoie `false` sans effacer les jetons, afin qu’une nouvelle tentative puisse les réutiliser. Les contrats API et le format des jetons ne changent pas.

Une régression vérifie que les deux jetons sont conservés après un échec réseau; les cas de refresh refusé gardent leurs tests existants. Suite Mobile **31/31**, TypeScript Mobile, Prettier du test et `git diff --check` passent. Limite à traiter : l’API de refresh reste booléenne, donc `AuthContext` peut afficher l’écran de connexion lors d’un démarrage hors réseau même si les jetons sont conservés; une erreur de refresh à trois états et une reprise après reconnexion restent à cadrer. Bundles Expo Android (**2 227 modules**) et iOS (**2 218 modules**) exportés avec succès; ce ne sont pas des APK/IPA et aucun build natif n’a été produit.

## Navigation basse — recontrôle des critères de layout — 19 octobre 2026

Le code et les régressions couvrent les cinq destinations conditionnelles selon le rôle, la réduction des libellés sous 440 dp, les noms accessibles des onglets, l’action Scan explicite et surélevée de 60 dp, les couleurs des tokens QPM, ainsi que le FAB Create séparé, permissionné et caché pendant le clavier. Les tests Navigation dédiés font partie de la suite Mobile (**31/31**); les exports Android/iOS réussissent. MOB-NAV-05 peut sortir de la file d’implémentation, mais reste en recette native : vérifier le tactile au-dessus de la pilule, les safe areas, l’accessibilité et le contenu non masqué sur téléphones/tablettes, clair/sombre et tailles de texte agrandies.

## Reprise de session après une panne réseau — 19 octobre 2026

Après la conservation des jetons lors d’un échec de transport, l’application ne retentait pas leur validation sans redémarrage. `AuthContext` relance maintenant l’initialisation si une connexion revient après une indisponibilité, ou au retour de l’application au premier plan. Un verrou empêche les tentatives simultanées; aucun jeton, contrat API ni règle d’authentification n’est modifié. La reprise reste conditionnée à la validité du refresh token auprès du serveur.

Régression structurelle ajoutée à `mobile/scripts/mobile-regression.test.cjs` et passée (**1/1**); la suite Mobile complète précédente passe **31/31**. TypeScript et Prettier passent après le changement. Simulation d’une vraie coupure réseau, tests sur appareil et build natif non effectués.

## Contrôle du démarrage de l’onboarding — 19 octobre 2026

Les tests Jest du garde de première connexion passent (**5/5**) : nouvel utilisateur, reprise à une version plus récente, non-répétition après « ignoré » ou « terminé », et repli sûr lorsque les champs ne sont pas renvoyés par un ancien serveur. Ce contrôle vérifie la décision de routage uniquement; le flux complet avec réponses serveur, rôle réel et présentation sur téléphone reste à valider visuellement.

## Revalidation des backlogs Web / Mobile — 20 octobre 2026

- La suite Mobile `npm run test:mobile-regression` passe (**32/32**) et `npx tsc --noEmit` passe. Ce sont des régressions JavaScript/structurelles; elles ne remplacent pas une recette sur appareil Android/iOS, notamment pour safe areas, NFC/caméra, onboarding et comportement hors réseau.
- Le contrôle backend ciblé a été exécuté dans une copie temporaire du code, car l’environnement refuse l’écriture dans `api/target` du dépôt. Une configuration Mockito `mock-maker-subclass` temporaire y évite le self-attach interdit; `SearchDateValueConverterTest` et `WrapperSpecificationTest` passent (**43/43**). Les attentes `JS_DATE` utilisent désormais `Instant.parse` : les valeurs ISO terminées par `Z` sont des instants UTC; l’ancien helper test traitait `Z` comme un caractère littéral et produisait un résultat dépendant du fuseau local. Aucun contrat API ni code de production n’a été modifié dans cette vérification.
- Le check Web simultané confirme **75/75** tests de scripts dédiés, le typecheck TypeScript et le build CRA de production (`GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=2048 npm run build`) réussissent.
- L’APK `1.0.59` précédemment généré est signé et identifié comme `com.atlas.cmms`, versionCode `42`; aucun nouveau build natif n’est généré dans cette passe. Test visuel réel et distribution restent à faire.
- `git diff --check` passe. La vérification Prettier de plusieurs scripts signale un formatage déjà présent dans `mobile/scripts/mobile-regression.test.cjs`; je l’ai laissé intact pour éviter une modification de style sans rapport avec la validation fonctionnelle.
- Résolution EAS/Expo revérifiée avec `npx expo config --type public --json` : projet QPM `fbfaa721-adb1-463a-8757-3e256cf7337a`, app `1.0.59`, bundle iOS `com.cmms.atlas`, runtime `1.0.59` et Android `com.atlas.cmms`/versionCode 42. La documentation Mobile est corrigée : le projet est déjà lié, il ne faut pas relancer `eas init`. Le build iOS signé reste bloqué par l’absence de credentials Apple vérifiés; pas d’IPA revendiquée.
- Points encore ouverts : recette visuelle Chromium connectée et contrôles de rôles/tenant Web; exécution des tests d’intégration backend avec profil CI sans agent Mockito inline; recette mobile sur matériel réel, vérification scanner/NFC et validation de reprise session en perte réseau.
- Tests métier backend complémentaires, toujours dans la copie temporaire : cycle WO (statut, réouverture, événements/audit, accès) **48/48**, contrôleur WO **45/45**, tenant API Key **5/5**, onboarding user settings + calcul d’exécution **7/7**. Ces tests n’incluent pas la migration sur une base PostgreSQL réelle. La suite large du service WO a encore **34 erreurs** dans le setup des cas PDF avec le mock maker sans agent; ne pas compter cette suite comme validée.

## NFC iOS — réactivation du support natif — 20 octobre 2026

- L’absence de NFC dans iOS venait d’une exclusion de `react-native-nfc-manager` dans `mobile/react-native.config.js`, ajoutée parce que le chemin natif iOS n’avait pas été validé. Le contrôle a confirmé que le projet possède déjà `NFCReaderUsageDescription`, le fichier d’entitlements Core NFC `TAG`, et la bibliothèque implémente MIFARE/ISO 15693.
- L’autolinking iOS est réactivé; le helper autorise maintenant Android/iOS, le modal charge le module natif sur les deux systèmes, et l’écran/formulaire réexposent le NFC iOS. QR/code-barres reste disponible sur Web et mobile. Aucun endpoint, identifiant, permission QPM ou règle métier ne change.
- Les tests structurels vérifient les technologies par plateforme et l’absence de blocage d’autolinking. La lecture native reste **non vérifiée** tant que CocoaPods n’a pas régénéré le lockfile sur macOS, qu’une build iOS signée avec le capability Core NFC n’est pas installée et qu’un iPhone compatible n’a pas lu un tag. Le build iOS et la recette physique n’ont pas été exécutés dans cette session.

### Garde de non-régression — configuration NFC iOS — 20 octobre 2026

La suite Mobile vérifie maintenant les prérequis natifs en plus de l’autolinking : `NFCReaderUsageDescription` non vide, entitlement Core NFC `TAG` présent, et `CODE_SIGN_ENTITLEMENTS` relié au fichier du target iOS. Elle vérifie aussi la permission NFC Android et que le matériel NFC reste facultatif (`required=false`) pour ne pas exclure les téléphones sans lecteur. Cela protège la configuration source contre une désactivation accidentelle; cela ne prouve pas que le profil Apple de distribution accorde le capability, ni que la lecture fonctionne sur un appareil.

Validation après ajout : `npm run test:mobile-regression` (**32/32**), TypeScript Mobile, Prettier ciblé et `git diff --check` réussis. L’export Expo iOS sans limite de workers s’est d’abord figé; la relance avec un seul worker a réussi et compilé **2 219 modules**. Cela valide le bundle JavaScript iOS seulement, pas CocoaPods, Xcode, la signature ou la lecture NFC physique. Le dossier d’export temporaire a été supprimé; aucun APK/IPA n’a été généré.

## Reprise de session Mobile — état explicite pendant panne temporaire — 20 octobre 2026

- Lors d’un refresh token en timeout/erreur réseau temporaire, les jetons étaient conservés et une nouvelle tentative programmée, mais l’état d’initialisation passait à « terminé non authentifié » : l’utilisateur voyait le formulaire de connexion pendant que l’app tentait déjà de récupérer sa session.
- L’état `AUTH_RECOVERY_PENDING` maintient maintenant le démarrage en attente sans publier l’identité précédente ni ouvrir le formulaire de connexion. L’écran de chargement annonce la reconnexion en français/anglais; une validation réussie restaure la navigation, tandis qu’un refus d’authentification définitif continue d’ouvrir l’écran de connexion et applique le nettoyage prévu.
- Cette présentation ne donne aucun accès aux données hors ligne et ne change ni les jetons, ni le contrat de refresh, ni les règles serveur. La suite Mobile passe (**32/32**), le test ciblé `auth-recovery.test.cjs` passe, TypeScript, Prettier ciblé et `git diff --check` passent. Le scénario réseau réel et le comportement de l’écran sur appareil restent à valider.

## Revalidation de la suite Mobile — 20 octobre 2026

La commande `npm run test:mobile-regression` réussit (**35/35**) et `npm run test:onboarding` réussit (**5/5**), y compris les gardes NFC iOS, le rebranding des textes localisés et la reprise de session. TypeScript Mobile passe. L’APK 1.0.59 a été reconstruit le 20 octobre sans incrément (versionCode 42), signature v2 vérifiée; SHA-256 `8142cbd1af1b4c69af387c50421861b9812bfbe94e221ee8b902987f3cc71b8c`. Il s’agit de tests automatisés locaux et d’une validation d’archive; ils ne remplacent pas l’installation visuelle sur Android/iOS, la lecture NFC physique, ni un essai contre le serveur de recette.

## Mes disponibilités — ignorer les réponses de chargement périmées — 21 octobre 2026

Le chargement de la disponibilité personnelle est relancé à l’ouverture de l’écran et lors d’un rafraîchissement. Si deux lectures se chevauchaient, une réponse plus ancienne pouvait arriver en dernier et remplacer l’horaire affiché; une réponse tardive après avoir quitté l’écran pouvait aussi modifier son état local. Chaque lecture possède maintenant une séquence : seul le dernier chargement encore valide met à jour horaires, erreur et indicateur de chargement, et le départ de l’écran invalide la requête en cours. Aucun endpoint, donnée, droit ou règle de disponibilité ne change.

Régression ciblée : ordre de réponses différées et présence des gardes de succès/erreur/finalisation/invalidation dans l’écran. Vérifications : test ciblé, suite Mobile (**44/44 scripts**), TypeScript, Prettier et `git diff --check` réussis; onboarding (**5/5**) et helpers de disponibilité (**5/5**) passent également. Le comportement API réel et le rafraîchissement sur téléphone restent à vérifier; aucun APK n’est généré par ce changement.

## Soumission des relevés compteur — éviter les doublons par appuis rapides — 21 octobre 2026

Le bouton « Ajouter » était désactivé après le rendu React suivant, mais deux appuis rapides avant ce rendu pouvaient démarrer deux POST de relevé et enregistrer deux lectures identiques. La soumission utilise maintenant le verrou asynchrone déjà partagé par d’autres formulaires : une requête en cours est coalescée, l’état de chargement et le toast ne sont gérés qu’une fois, et le verrou se libère aussi après échec pour permettre un nouvel essai. Validation, valeur, endpoint et règle métier du compteur restent inchangés.

Régression ciblée vérifie le verrouillage des appuis concurrents, la libération pour réessai, et son raccord au handler `createReading`. Vérifications : test ciblé, suite Mobile complète, TypeScript et Prettier réussis; recette de double appui et de reprise après erreur sur appareil/API de test reste à faire. Aucun APK n’est généré par ce changement.

## Changement de mot de passe — ignorer les soumissions simultanées — 21 octobre 2026

Le bouton du dialogue était désactivé après le rendu Formik suivant; deux appuis très rapprochés pouvaient donc lancer plusieurs demandes `auth/updatepwd`. Le handler utilise désormais le verrou asynchrone partagé pour envoyer une seule mise à jour pendant qu’elle est en cours. La confirmation de succès/échec et l’authentification existantes restent inchangées; une erreur ne bloque pas un nouvel essai.

Régression ciblée vérifie l’usage du verrou, l’appel d’authentification conservé, le coalescement des soumissions concurrentes et la libération après échec. Tests Mobile pertinents, TypeScript et formatage à exécuter pour ce lot; vérifier aussi le dialogue sur appareil. Aucun contrat API, règle d’authentification ou donnée serveur ne change; aucun APK n’est généré.

## Répertoires Personnes et Équipes — ne pas afficher la recherche précédente — 21 octobre 2026

La liste conservait ses lignes après modification du texte de recherche, pendant le délai de debounce d’une seconde; sa pagination pouvait également charger une page avec les anciens critères. Personnes et Équipes masquent maintenant le cache jusqu’à ce que recherche, critères appliqués et réponse chargée correspondent, puis n’autorisent la pagination que pour ces résultats. Une erreur de la requête courante conserve un état réessayable. Les endpoints, paramètres de recherche et règles d’accès restent inchangés.

Régression ciblée couvre les deux répertoires, le cache périmé, la garde de pagination et le renouvellement d’erreur à la saisie. Suite Mobile **47/47**, TypeScript, Prettier, onboarding **5/5**, disponibilités **5/5** et `git diff --check` réussis. La vérification tactile sur appareil reste à faire; aucun APK n’est généré.

## Hiérarchie des localisations — distinguer l’erreur d’un état vide — 21 octobre 2026

Le chargement des enfants d’une localisation absorbait les erreurs réseau/API et terminait comme une liste vide. Une panne pouvait donc être interprétée comme l’absence réelle de sous-localisations, sans action de reprise. L’écran distingue maintenant l’échec d’un résultat vide et propose une nouvelle tentative, y compris après une erreur de pagination lorsque des lignes sont déjà visibles. Une réponse réussie efface l’erreur propre au parent chargé. Les API, données, permissions et règles métier ne changent pas.

Régression ciblée vérifie l’enregistrement de l’échec sans bloquer le chargement, l’effacement de l’erreur après reprise réussie et la présence des deux états UI avec action de reprise. Test ciblé réussi; suite Mobile **48/48**, TypeScript, Prettier ciblé, onboarding **5/5**, disponibilité **5/5** et `git diff --check` réussis. Le comportement réseau réel et l’affichage sur appareil restent à vérifier; aucun APK n’est généré.

## Bons de commande Mobile — rendre le retry de pagination effectif — 21 octobre 2026

Après l’échec d’une page suivante, le bouton « Réessayer » effaçait l’état d’erreur puis appelait le callback qui capturait encore `loadMoreError = true`. Son garde bloquait donc la nouvelle requête jusqu’à une autre action, souvent un rafraîchissement complet. La pagination accepte maintenant un indicateur explicite de retry, qui contourne uniquement ce garde d’erreur précédent; toutes les gardes de permission, chargement concurrent et fin de pagination restent actives. Le retry efface l’erreur au démarrage et conserve le parcours de consultation en lecture seule.

Le test dédié vérifie que le retry explicite atteint le chargement malgré l’erreur précédente et que le callback UI le transmet. API, autorisations et règles d’approvisionnement restent inchangées. Test ciblé **3/3**, suite Mobile **48/48**, TypeScript, Prettier ciblé, onboarding **5/5**, disponibilité **5/5** et `git diff --check` réussis. Essai réseau réel et affichage sur appareil restent à faire; aucun APK n’est généré.

## Équipements Mobile — écarter les erreurs de pagination obsolètes — 21 octobre 2026

Lorsqu’une page suivante d’équipements était encore en vol au début d’une nouvelle recherche, son échec tardif pouvait réactiver le bandeau de reprise sur les résultats de la recherche actuelle. Son `finally` pouvait aussi libérer le verrou d’une pagination plus récente. Le début du chargement de la première page invalide maintenant la séquence de pagination précédente et réinitialise son verrou; les blocs `catch` et `finally` ne modifient l’interface que si la première page et la pagination sont toujours les requêtes courantes. Les réponses serveur obsolètes restent également écartées par la garde Redux existante.

La régression ciblée vérifie l’invalidation après une nouvelle première page et les gardes des deux sorties asynchrones. Test ciblé réussi; suite Mobile **51/51**, onboarding **5/5**, disponibilité **5/5**, TypeScript Mobile, Prettier ciblé et `git diff --check` réussis. Aucun endpoint, contrat, droit, règle métier, APK ou comportement d’export n’est modifié; la recette réseau et visuelle sur appareil reste distincte.

## Répertoires Fournisseurs et Clients — attendre les résultats de recherche courants — 21 octobre 2026

Pendant le debounce d’une seconde, les listes continuaient à présenter les anciennes lignes et permettaient la pagination avec les critères précédents. Les deux écrans ne montrent maintenant que les lignes dont le terme saisi et les filtres correspondent au dernier chargement réussi; pendant l’attente, ils affichent le chargement et bloquent la pagination. Une erreur après changement de critères mène à l’état d’erreur réessayable plutôt qu’à des résultats obsolètes. Effacer puis retaper le même terme peut réutiliser les résultats précédents seulement si le filtre et le texte correspondent exactement. Les endpoints, critères transmis, données et permissions restent inchangés.

Le test dédié couvre Fournisseurs et Clients ainsi que le changement de texte pendant le debounce, changement de filtres, effacement et retape. Test ciblé **3/3**, suite Mobile **49/49**, TypeScript, Prettier ciblé, onboarding **5/5**, disponibilité **5/5** et `git diff --check` réussis. Vérification réseau réelle et visuelle sur appareil restent à faire; aucun APK n’est généré.

## Équipements associés aux pièces — ignorer les réponses de chargement obsolètes — 21 octobre 2026

Dans l’onglet Équipements d’une fiche pièce, une actualisation pouvait se chevaucher avec le chargement initial. Si le chargement le plus récent échouait puis que l’ancien réussissait ou se terminait ensuite, son `finally` pouvait arrêter l’indicateur du chargement courant et masquer l’erreur affichée. Le résultat métier reste indexé par pièce dans Redux; l’état local de chargement et d’erreur est maintenant réservé à la requête la plus récente. Une sortie de l’onglet invalide également les réponses en vol. Aucun endpoint, permission ou règle d’inventaire ne change.

Test ciblé vérifie l’ordre « ancienne requête en attente, nouvelle requête échouée, ancienne requête terminée » et les gardes de succès/erreur/finalisation/nettoyage dans l’écran. Suite Mobile : **52/52 scripts**, tests onboarding **5/5**, disponibilités **5/5**, TypeScript et Prettier ciblé réussis. La reprise réseau réelle et la vérification visuelle sur appareil restent à faire; aucun APK n’est généré.

## Scan code-barres Mobile — ignorer les callbacks sans valeur — 21 octobre 2026

Le scanner QR/code-barres consommait son garde anti-double lecture et fermait l’écran même si la bibliothèque caméra émettait une chaîne vide ou composée d’espaces. Cela pouvait envoyer une recherche invalide et obliger l’utilisateur à rouvrir le scanner. Ces callbacks vides sont maintenant ignorés avant le garde; le scanner reste ouvert pour la lecture suivante. Toute valeur non vide est transmise à l’application exactement telle que reçue : le contenu du code et l’API ne changent pas.

Test ciblé vérifie les chaînes vides/blanches, des payloads valides y compris avec espaces conservés, l’ordre du garde et la transmission sans transformation. Tests natifs caméra et lecture sur appareil restent à effectuer.
