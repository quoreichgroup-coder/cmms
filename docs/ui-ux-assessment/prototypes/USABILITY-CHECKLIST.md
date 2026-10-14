# Checklist d’évaluation de l’utilisabilité

## Conditions de séance

- [ ] Faire valider le vocabulaire par un superviseur et un technicien QPM.
- [ ] Expliquer que les enregistrements sont fictifs et qu’aucune action ne persiste.
- [ ] Tester au minimum un écran large, une tablette et un smartphone réel/émulé.
- [ ] Ne pas demander aux participants d’utiliser des données de production.
- [ ] Noter les hésitations sans guider, puis demander la raison du choix.

## Scénarios Web Operations (WEB-054/055)

- [ ] En moins de 30 secondes, repérer les éléments demandant un suivi aujourd’hui.
- [ ] Trouver WO-240866 et expliquer pourquoi il nécessite une attention prioritaire.
- [ ] Filtrer les ordres en cours puis retrouver WO-240871 via recherche.
- [ ] Ouvrir son détail sans perdre le contexte de la liste.
- [ ] Identifier l’équipement, l’assignataire, l’échéance et les tâches restantes.
- [ ] Distinguer clairement les actions simulées d’une action réellement enregistrée.
- [ ] Répéter avec état chargement, vide, erreur, refus et confirmation.

## Scénarios Mobile Dashboard et WO (MOB-001/002/003/005/073)

- [ ] À une main, trouver l’ordre prioritaire du jour.
- [ ] Lire l’identifiant, l’équipement, le statut et l’échéance sans troncature.
- [ ] Ouvrir le détail, cocher une tâche et expliquer l’effet visible.
- [ ] Comprendre quelles tâches restent à effectuer avant la confirmation simulée.
- [ ] Revenir à la liste depuis le détail sans chercher la navigation.
- [ ] Trouver une action de création et identifier les champs obligatoires.
- [ ] Refaire à 320 px, 375 px, 430 px et en orientation paysage.
- [ ] Vérifier zone tactile, clavier, focus visible, labels et contraste en extérieur.

## Scénarios Asset Details (WEB-062–069, MOB-030)

- [ ] Repérer CV-04 depuis son chemin de navigation et sa hiérarchie.
- [ ] Reformuler son identité et sa localisation hiérarchique.
- [ ] Trouver son WO actif et consulter ses onglets de maintenance, compteur et documents.
- [ ] Trouver l’historique récent et le dernier relevé de compteur.
- [ ] Distinguer les données fictives du registre métier réel.
- [ ] Tester le débordement des onglets sur tablette/mobile et leur accessibilité clavier.

## Observations et score (par tâche)

Noter : réussite sans aide / avec aide / échec; temps; erreurs; confiance perçue (1–5); commentaire verbatim; taille d’écran; rôle. Après chaque famille, demander : « Qu’attendiez-vous en cliquant ? », « Quel statut vous semble ambigu ? », « Quelle donnée manque pour prendre votre décision ? ».

## États et accessibilité

- [ ] Chaque état a un titre et une explication textuelle.
- [ ] Les badges associent texte et couleur.
- [ ] Les contrôles sont utilisables au clavier et focusables dans un ordre logique.
- [ ] Les libellés d’entrée persistent lorsque le champ reçoit une valeur.
- [ ] Le zoom navigateur à 200 % ne masque ni action principale ni contenu critique.
- [ ] Le contraste est vérifié avec un outil avant de conclure à la conformité WCAG.
- [ ] Le mouvement respecte la préférence de réduction.

## Décision après séance

- [ ] Consigner les points bloquants avant ajustements esthétiques.
- [ ] Valider les libellés avec les équipes avant implementation.
- [ ] Distinguer les changements purement visuels des modifications de workflow.
- [ ] Obtenir l’approbation UX finale avant portage dans Web/Mobile de production.

## Scénarios Maintenance Schedule (WEB-047/048/043)

- [ ] Repérer le PM01 CalBAse et sa prochaine occurrence dans le calendrier.
- [ ] Différencier visuellement une occurrence prévue, un WO généré et une occurrence clôturée.
- [ ] Retrouver la même date dans le registre d’appels PM.
- [ ] Utiliser le changement mois/semaine/liste simulé et les filtres pour expliquer la portée attendue.

## Scénarios de création WO (WEB-055 / MOB-005)

- [ ] Identifier les groupes « travail », « équipement et lieu », « planification ».
- [ ] Repérer les champs obligatoires et distinguer le contenu de démonstration d’une validation réelle.
- [ ] Sur Web, vérifier l’aperçu; sur mobile, compléter le formulaire au clavier sans perdre les actions.
- [ ] Confirmer que le feedback de soumission ne prétend pas persister dans QPM.
- [ ] Depuis `MOB-030`, lancer « Créer un ordre » et vérifier que CV-04 est prérempli sur `MOB-005`.
- [ ] Vérifier que la barre basse conserve les mêmes cinq destinations entre l’accueil, la fiche équipement et les PM.
