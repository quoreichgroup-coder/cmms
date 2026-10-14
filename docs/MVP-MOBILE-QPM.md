# Périmètre MVP mobile QPM — décision de passage au Web

**Révision :** 12 octobre 2026
**Cible :** pilote mobile de maintenance minière sur convoyeur
**Règle :** terminer et valider le pilote mobile avant d’ouvrir le lot de refonte UI/UX Web. Le Web existant reste utilisable pour les fonctions de planification et d’administration qui ne sont pas disponibles dans l’app mobile.

## Décision proposée

QPM a assez de fondations mobiles pour entrer en validation de bout en bout, mais le MVP n’est pas encore accepté comme prêt pour le terrain. Les sources montrent les écrans et interactions, et les tests automatisés couvrent plusieurs garde-fous; ils ne prouvent ni l’accès stable à l’API de test, ni le rendu Android/iOS réel, ni l’exactitude d’une intervention enregistrée dans une installation représentative.

Le prochain jalon est donc une validation opérationnelle sur l’APK 1.0.58, avec une entreprise, un utilisateur technicien et un utilisateur responsable de test. Le passage à la refonte Web commence après la réussite des critères de sortie ci-dessous ou après consignation explicite des écarts acceptés. Il ne nécessite pas de recréer le Web, déjà présent dans `frontend/`.

## Périmètre inclus

| Priorité | Parcours mobile                                            | État vérifié dans le dépôt                                                                                                                                                                                                                                                                                                                                   | Critère d’acceptation MVP                                                                                                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | Démarrage, choix/validation du serveur, connexion, session | Écrans Auth et service API présents; URL par défaut dans `mobile/apiConfig.ts`. Les derniers diagnostics transmis dans cette conversation montraient des 502 dus au démarrage API; l’état actuel du serveur n’est pas confirmé.                                                                                                                              | URL de l’instance de test validée; connexion/reconnexion fonctionne; erreurs de réseau visibles et relançables; aucun secret consigné dans les captures.                                                                                                                                                                                   |
| P0       | Autorisations et contexte d’entreprise                     | Les écrans utilisent les permissions existantes; l’API reste l’autorité.                                                                                                                                                                                                                                                                                     | Les rôles demandeur, responsable et technicien ne voient et ne modifient que ce que leur compte permet; vérifier aussi une permission refusée et une fonction/licence indisponible.                                                                                                                                                        |
| P1       | Tableau de bord technicien                                 | Cartes reliées aux données analytics du dépôt; erreurs, chargements et valeurs nulles ont des états UI dédiés selon les lots précédents.                                                                                                                                                                                                                     | Compter les WO de test depuis l’API et comparer chaque carte; `0`, « indisponible » et « chargement/erreur » doivent être distincts.                                                                                                                                                                                                       |
| P1       | Demande → qualification → ordre de travail                 | Listes, détails, création et décisions de demande sont présentes dans `mobile/screens/requests/`; WO créable et éditable dans `mobile/screens/workOrders/`.                                                                                                                                                                                                  | Une demande liée au convoyeur est consultée par le responsable, qualifiée selon les options existantes, puis reliée à un WO sans doublon ni perte de contexte.                                                                                                                                                                             |
| P1       | Exécution et clôture d’un WO                               | Détail et tâches, temps, pièces, commentaires et fichiers sont présents. `WODetailsScreen.tsx` vérifie les champs configurés pour la clôture; feedback/signature sont conditionnels aux préférences et à la configuration de l’ordre. Les doubles envois sont verrouillés.                                                                                   | Le technicien trouve son ordre, exécute les opérations permises, constate chaque erreur/succès, puis clôt une seule fois. Les champs obligatoires bloquent la clôture et indiquent quoi corriger; retour API en échec garde la possibilité de réessayer. Tester l’action finale avec puis sans feedback/signature obligatoire.             |
| P1       | Actif et emplacement                                       | Liste, hiérarchie, fiche Asset 360 mobile, relations, ordres et compteurs sont présents.                                                                                                                                                                                                                                                                     | Retrouver le convoyeur par identifiant; vérifier emplacement, parent/enfant, WO liés et dernières valeurs de compteur contre l’enregistrement source. Un écran vide ne doit pas être confondu avec un échec réseau ou un refus d’accès.                                                                                                    |
| P1       | Maintenance préventive côté terrain                        | `PreventiveMaintenancesScreen.tsx` et `PreventiveMaintenanceDetailsScreen.tsx` proposent consultation, registre paginé des appels et navigation vers les WO générés. La création/configuration avancée des plans se fait sur le Web existant.                                                                                                                | Distinguer date planifiée et cible compteur; ouvrir l’appel et son WO; vérifier date, état et équipement. Ne pas présenter une estimation ou un seuil d’alarme comme une occurrence PM.                                                                                                                                                    |
| P1       | Confirmation d’intervention                                | Suppressions/archivages ont des dialogues et protections contre double envoi; la clôture suit les exigences configurées dans les préférences et champs de WO.                                                                                                                                                                                                | Avant le pilote, observer et documenter la confirmation effective à l’écran de clôture pour les deux configurations. Aucun nouveau statut ou champ métier n’est introduit par le MVP. Toute étape de confirmation supplémentaire reste une modification d’interaction à valider séparément.                                                |
| P2       | PDF WO, prévisualisation et impression                     | Mobile télécharge le PDF via le rapport WO. Dans le Web, le bouton `preview_print` appelle `/report/{id}/stream` puis déclenche un téléchargement du fichier; il n’affiche pas le PDF dans une visionneuse. L’action séparée `issue_archive_document` archive un document immuable avec SHA-256, version du modèle, locale et contexte instantané via `/report/issue`. Aucune garde ne vérifie qu’un aperçu a été consulté avant l’émission. | Vérifier le rendu réel sur téléphone et navigateur. Le prochain lot Web doit afficher le PDF configuré dans un aperçu avant impression et clarifier la distinction brouillon/émission; préserver le registre d’émission et les endpoints. Jusqu’à cette mise à jour, l’utilisateur peut télécharger puis ouvrir le document avant d’émettre, mais QPM ne l’impose pas. |
| P2       | Apparence, langues et ergonomie terrain                    | Thèmes Light/Dark/System, tokens QPM, cartes arrondies, états de chargement/erreur et plusieurs contrôles d’accessibilité sont présents.                                                                                                                                                                                                                     | Vérifier visuellement Android et iOS en clair/sombre, clavier ouvert, petit téléphone et tablette; vérifier français/anglais et contraste des statuts/priorités.                                                                                                                                                                           |

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

**Avancement P1 au 14 octobre 2026 — parcours mobile et consultation du journal ajoutés, essais natifs/API encore requis.** La fiche mobile masque les transitions ordinaires pour un WO terminé et présente l’action de réouverture uniquement avec le droit dédié. Le motif est obligatoire dans un dialogue, les doubles appuis sont bloqués côté client, les erreurs gardent le formulaire ouvert et le succès actualise l’état et l’historique. Une route de lecture du journal est protégée par l’accès existant à la fiche; la liste chronologique affiche transition, date, acteur et motif. Traductions françaises et anglaises ajoutées. Android réel, API/base, accessibilité et tests Java restent à vérifier.

Ces changements n’ont pas été exécutés contre une base ni couverts par les tests Java dans l’environnement courant : Maven n’y est pas disponible et l’accès au socket Docker est refusé. Ils ne sont donc pas encore déclarés vérifiés ou déployés. Le journal métier est protégé contre les mises à jour JPA et la suppression du WO référencé; une politique d’accès et un écran de consultation des événements restent à définir/implémenter.

| Priorité | Tâche | Critères d’acceptation |
|---|---|---|
| P0 — intégrité | **Écrit, à valider** : transition de réouverture dédiée côté API; refus des transitions ordinaires depuis `COMPLETE`; événements de cycle append-only et suppression du WO avec journal refusée. | À tester en intégration : seul le droit superviseur dédié peut rouvrir; motif obligatoire; acteur/date/états/motif conservés; doubles soumissions sûres et événements sans perte. |
| P0 — droits | **Écrit partiellement, à valider** : vérification stricte de l’entreprise dans `WorkOrder.canBeEditedBy` / `canBeDeletedBy`; droit dédié exposé dans la matrice de rôles et attribué par migration aux rôles admin. | Tests à exécuter/compléter pour assigné, créateur, demandeur, superviseur autorisé/non autorisé et entreprise étrangère; auditer chaque endpoint de mutation et les rôles historiques. |
| P0 — clôture | **Écrit partiellement, à valider** : l’API vérifie les champs de complétion configurés pour fichiers, tâches, temps, pièces et coûts, en plus de la signature requise déjà contrôlée par l’API. | Vérifier les mêmes cas que le client et compléter les tests; réponses localisées/actionnables; ne pas perdre feedback/signature existants quand les champs sont omis. |
| P1 — Mobile | **UI réalisée, vérification appareil en attente** : action de réouverture réservée au droit dédié, motif obligatoire, état occupé/erreur/succès et statut ordinaire désactivé sur WO terminé. | Vérifier le flux sur Android/iOS, TalkBack/VoiceOver, perte réseau, reprise après erreur; confirmer que le dialogue rend le motif et la validation accessibles. |
| P1 — audit métier | **Lecture API et affichage mobile réalisés, tests API en attente** : journal chronologique des clôtures/réouvertures limité aux utilisateurs autorisés à consulter le WO. | Vérifier l’isolation entreprise, tous les cycles avec acteur/date/motif, ordre chronologique et comportement de chargement/erreur; aucune clôture précédente n’est écrasée. |
| P2 — clôture business | N’introduire une clôture financière qu’après mise en place du règlement des coûts et du contrôle des engagements ouverts. | Critères comptables validés, droit distinct, stratégie de migration/API rétrocompatible et tests de verrouillage financier. Hors MVP mobile courant. |

**Dépendances / précautions restantes :** valider migration/schema et mapping Envers; tester endpoint et contrôles d’accès sur base jetable; confirmer compatibilité de la permission ordinale dans les rôles existants; auditer endpoints liés au WO et protections de fichiers/commentaires; fournir la traduction des nouvelles erreurs. Fichiers concernés : `api/src/main/java/com/grash/service/WorkOrderService.java`, `api/src/main/java/com/grash/model/WorkOrder.java`, `api/src/main/java/com/grash/model/WorkOrderLifecycleEvent.java`, `api/src/main/resources/db/changelog/2026_10_14_00000000001_work_order_lifecycle_event.xml`, `frontend/src/content/own/Settings/Roles/PermissionsMatrix.tsx`. Références et comparaison détaillées : [`WORK-ORDER-COMPLETION-AND-PRINT-ASSESSMENT.md`](WORK-ORDER-COMPLETION-AND-PRINT-ASSESSMENT.md).

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
