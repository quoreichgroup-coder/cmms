# QPM Document Designer — analyse comparative des modèles existants

**Date : 23 octobre 2026**
**Périmètre :** conception des mises en page, composants, données, tableaux et pagination. Cette étude ne propose ni remplacement du renderer QPM ni moteur tiers obligatoire.

Pour une analyse approfondie du modèle de Crystal Reports et de sa transposition à QPM, voir [REA — Crystal Reports comme référence](REA-CRYSTAL-REPORTS-REFERENCE.md).

## Synthèse

Les outils de rapports matures séparent quatre responsabilités : le **catalogue de données typées**, l’**arbre de mise en page**, les **règles de répétition/visibilité**, et le **rendu paginé**. Ils n’assimilent pas un rapport à une liste de champs. Crystal Reports organise les objets dans des sections d’impression; SSRS/Report Builder lie des régions de données à des datasets et à des hiérarchies de groupes; JasperReports sépare les bandes du rapport principal des sous-datasets des tableaux; Frappe donne un modèle no-code plus proche de QPM avec sections, colonnes, champs et sélection des colonnes de tableaux.

La meilleure direction pour QPM est hybride : garder le modèle JSON déclaratif V2 et les providers métier du backend, puis faire évoluer le designer vers des composants métier typés et des propriétés contextuelles. La prochaine progression utile n’est pas d’ajouter un champ « HTML » : c’est de rendre les tableaux configurables (colonnes visibles, ordre, libellé, largeur) et de clarifier la structure d’impression avec des zones d’en-tête, corps, répétition et pied de page.

## Comment les autres outils structurent un rapport

### SAP Crystal Reports — sections d’impression et objets liés

Crystal sépare le rapport en zones ayant des cycles d’impression différents : Report Header, Page Header, Group Header, Details, Group Footer, Page Footer et Report Footer. Les objets placés dans une zone sont liés aux données ou au contenu statique; le Field Explorer distingue notamment Database Fields, Formula Fields, Parameter Fields, Running Totals, Group Name Fields et Special Fields. Le Report Explorer fournit une arborescence miroir : rapport → sections → objets. La sélection dans l’arbre correspond à la sélection sur le canevas. ([SAP — sections et hauteurs](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS%2C_DEVELOPER_VERSION_FOR_MICROSOFT_VISUAL_STUDIO/0d6684e153174710b8b2eb114bb7f843/45b6a7ec6e041014910aba7db0e91070.html), [SAP — Report Explorer](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/4761b2236e041014910aba7db0e91070.html), [SAP — Field Explorer et objets](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/476208696e041014910aba7db0e91070.html)).

Les propriétés agissent à deux niveaux : objet (position, largeur, format, formule conditionnelle) et section (masquer/supprimer, conserver ensemble, imprimer en bas). Les pages disposent de zones header/footer distinctes; les groupes ajoutent des en-têtes et pieds de groupes et peuvent trier les données. ([SAP — propriétés d’objet](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/4774748d6e041014910aba7db0e91070.html), [SAP — sections et suppression](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/477eec3d6e041014910aba7db0e91070.html), [SAP — page header/footer](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS_FOR_ENTERPRISE/14191c53df3a4d13aeb24ea3bef63abd/478e1e176e041014910aba7db0e91070.html)).

**À reprendre dans QPM :** un arbre de document synchronisé avec le canevas; zones d’impression nommées et stables; réglages de page distincts du flux de contenu; suppression conditionnelle limitée à des conditions déclaratives autorisées; propriétés de l’objet sélectionné. **À ne pas reprendre tel quel :** formules libres, SQL expressions, accès direct aux tables et rendu au pixel absolu, qui ne cadrent pas avec les bindings allowlistés ni avec les données multi-tenant de QPM.

### Microsoft Report Builder / SSRS — régions de données, hiérarchies et pagination

SSRS distingue le dataset (lignes/colonnes et champs disponibles) de la région de données qui le présente. Une table répète une ligne Details pour chaque enregistrement; les groupes de lignes/colonnes ajoutent des niveaux hiérarchiques, tris, filtres et agrégats avec une portée définie. Les groupes de lignes et colonnes sont manipulés dans un panneau propre à la région sélectionnée. ([Microsoft — groupes](https://learn.microsoft.com/en-us/sql/reporting-services/report-design/understanding-groups-report-builder-and-ssrs?view=sql-server-2017), [Microsoft — panneau de groupes](https://learn.microsoft.com/en-us/sql/reporting-services/report-design/grouping-pane-report-builder?view=sql-server-ver17)).

Les propriétés sont propres à la région ou à ses cellules : formatage, tri, état vide, visibilité conditionnelle, position, expansion, sauts de page, répétition des en-têtes et comportement de lignes/colonnes. Les en-têtes peuvent être répétés sur chaque page où la région est coupée. ([Microsoft — affichage des régions](https://learn.microsoft.com/en-us/sql/reporting-services/report-design/controlling-the-tablix-data-region-display-on-a-report-page?view=sql-server-ver17)).

**À reprendre dans QPM :** ne pas mélanger les paramètres de la page, de la section, du tableau et d’une cellule; afficher les propriétés selon le type sélectionné; traiter les tables comme des régions répétées, pas comme du texte prérempli; état vide explicite; en-têtes répétés et pagination testés. **Phase ultérieure :** regroupement/tri au niveau des tableaux lorsque les providers exposent des datasets adaptés. Aucun tri ou regroupement ne doit changer silencieusement l’ordre historique d’un enregistrement de maintenance.

### JasperReports — bandes, éléments et sous-datasets typés

JasperReports exprime le document avec des bandes (titre, en-tête de page, détail, pied, résumé) et des éléments positionnés dans ces bandes. Un composant Table utilise un sous-dataset et un datasetRun; ses cellules s’évaluent dans le contexte de ce sous-dataset. Les colonnes peuvent être groupées hiérarchiquement, partager des en-têtes/pieds et être masquées selon une condition booléenne. ([JasperReports Ultimate Guide — Table et sous-datasets](https://jasperreports.sourceforge.net/JasperReports-Ultimate-Guide-3.pdf), pages 227–239).

Le moteur peut accepter une connexion JDBC et une requête SQL dans le rapport, mais ce modèle ne convient pas à QPM : les rapports doivent récupérer les données via les providers Spring autorisés, sous tenant et permission. Le motif architectural utile est la séparation **dataset typé → composant visuel → rendu**, et non l’exécution des requêtes de l’auteur du template.

### Frappe / ERPNext — éditeur no-code de blocs et propriétés métier

Frappe est le meilleur comparateur UX pour le niveau actuel de QPM : l’utilisateur glisse les champs du panneau gauche vers des sections/colonnes; le panneau droit n’expose que les propriétés adaptées au champ sélectionné; champs vides et labels sont traités au niveau du composant. Son éditeur de tableau permet de sélectionner les colonnes, de les réordonner et d’en régler la largeur. ([Frappe — Print Format Builder](https://docs.frappe.io/erpnext/print-format-builder), [Frappe — propriétés des champs](https://docs.frappe.io/framework/user/en/printing/print-format-editor/fields), [ERPNext — colonnes des tableaux](https://docs.frappe.io/erpnext/customise-your-items-tables-within-your-print-format-builder)).

Frappe distingue les formats visuels du mode HTML/Jinja personnalisé; les formats builder stockent une structure et génèrent le HTML, avec un moteur Chrome documenté pour ce parcours. Cela montre une frontière utile entre builder sécurisé et mode développeur, mais QPM doit conserver le premier et ne pas ouvrir le second aux administrateurs tenant. ([Frappe — modèles de format d’impression](https://docs.frappe.io/framework-git/desk/print-formats)).

## État de QPM observé dans le dépôt

- `ReportTemplateConfigurationValidator` valide un schéma JSON V2 fermé, des IDs, les propriétés, les types de composants et les bindings fournis par un `DocumentDataProvider`; le client ne définit ni source SQL ni code de rendu.
- `GeneratedDocumentService` résout les bindings par provider Work Order/Request, puis assemble des `ReportBlock` et `ReportTable`; le renderer Thymeleaf/iText met en page le PDF.
- Le designer React/MUI propose un arbre section → éléments, recherche des champs, glisser-déposer, propriétés de sections et propriétés d’éléments. Le canevas et l’aperçu PDF sont deux vues; seul le PDF backend est la sortie imprimable de référence.
- Les tableaux sont encore limités aux trois bindings métier statiques `executionTasks`, `laborTimeEntries`, `materialsUsed`. La tranche locale récente ajoute `columnWidths`, mais pas encore la visibilité ou l’ordre des colonnes. Elle n’ajoute pas une source de données libre ou un tableau générique.
- Le modèle ne possède pas encore des zones indépendantes `Page Header`, `Body`, `Page Footer`; le pied visible dans le canevas reste un exemple de visualisation. La répétition de l’en-tête de table existe au renderer, mais sa configuration doit rester explicitement cohérente avec le schéma et l’aperçu.

Ces constats sont des faits de code; ils ne prouvent pas l’expérience visuelle en navigateur ou la fidélité d’un PDF réel.

## Décisions d’amélioration proposées pour QPM

1. **Tables — priorité suivante :** modéliser chaque colonne via un identifiant stable allowlisté; proposer afficher/masquer, ordre, label imprimé et largeur. La validation serveur impose les colonnes autorisées pour chaque binding et refuse les doublons, les colonnes inconnues, les tables sans colonne et les largeurs invalides. Le provider conserve la propriété des valeurs de cellule.
2. **Arbre de document et zones d’impression :** distinguer en-tête de page, contenu principal et pied de page du simple flux de sections; chaque bloc appartient à une zone. Les zones répétées reçoivent seulement les données/special fields explicitement supportés. Les signatures et informations légales doivent être placées dans des blocs dédiés plutôt qu’injectées globalement par le renderer.
3. **Propriétés contextuelles :** une sélection FIELD expose label, format date/valeur, alignement, taille, visibilité vide; TABLE expose colonnes, en-têtes, largeur, répétition et comportement vide; SECTION expose colonnes, saut de page et garder-ensemble; PAGE expose format/orientation/marges. Ne pas afficher un gros panneau de paramètres qui ne s’appliquent pas au composant choisi.
4. **Data preview sûre :** le mode échantillon reste signalé comme fictif; l’aperçu réel utilise une ressource autorisée par l’API, sans archiver le document. Le catalogue montre label, type, source métier et statut facultatif/obligatoire, et une recherche ajoute le champ à la sélection. Aucun échantillon ne doit être confondu avec une donnée de production.
5. **Contrats versionnés :** évoluer le JSON par propriétés versionnées et compatibilité rétroactive; ne pas transformer les templates déjà publiés ni créer une migration DB pour les seuls réglages de présentation. Enregistrer des identifiants de colonnes plutôt que des indices afin de préserver l’ordre lors des changements de version.
6. **Gate de rendu :** aperçu et PDF doivent partager le schéma, les composants, les colonnes et les valeurs. Ajouter des tests portant sur les positions/largeurs de colonnes rendues et ouvrir les PDF de test courts/longs dans un lecteur avant de déclarer DOC-PDF-02 clos.

## Priorités backlog

- **P1 :** visibilité + ordre des colonnes pour les trois tableaux métier; largeurs liées aux identifiants de colonnes plutôt qu’aux indices; preview et PDF synchronisés; tests de schéma et de rendu.
- **P1 :** propriétés de table « afficher le titre », « message sans ligne », « répéter les en-têtes » avec valeurs par défaut compatibles.
- **P1 :** finir une arborescence de document accessible qui suit exactement l’ordre imprimé et permet sélection/repositionnement clavier.
- **P2 :** zones page header/footer personnalisables et blocs texte/diviseur/branding bornés; réutiliser le contexte d’entreprise déjà autorisé.
- **P2 :** date/formatage par champ, états conditionnels simples basés sur des opérateurs et champs allowlistés; pas de formule générique.
- **P3 / sur demande métier :** groupements, sous-totaux, datasets personnalisés, graphiques, sous-rapports et moteur Jasper/Crystal. Cadrer coût, sécurité, licence et formats avant d’entamer ces fonctions.

## Sources étudiées

- SAP, [Report Section Characteristics](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS%2C_DEVELOPER_VERSION_FOR_MICROSOFT_VISUAL_STUDIO/0d6684e153174710b8b2eb114bb7f843/45b6a7ec6e041014910aba7db0e91070.html)
- SAP, [Report Explorer](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/4761b2236e041014910aba7db0e91070.html), [Field Explorer](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/476208696e041014910aba7db0e91070.html), [Using other reporting features](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/4774748d6e041014910aba7db0e91070.html)
- Microsoft, [Groups in paginated reports](https://learn.microsoft.com/en-us/sql/reporting-services/report-design/understanding-groups-report-builder-and-ssrs?view=sql-server-2017), [Controlling tablix display and pagination](https://learn.microsoft.com/en-us/sql/reporting-services/report-design/controlling-the-tablix-data-region-display-on-a-report-page?view=sql-server-ver17)
- Jaspersoft, [JasperReports Ultimate Guide](https://jasperreports.sourceforge.net/JasperReports-Ultimate-Guide-3.pdf), table component/subdatasets, pages 227–239
- Frappe, [Print Format Builder](https://docs.frappe.io/erpnext/print-format-builder), [field properties](https://docs.frappe.io/framework/user/en/printing/print-format-editor/fields), [table column customization](https://docs.frappe.io/erpnext/customise-your-items-tables-within-your-print-format-builder), [print formats architecture](https://docs.frappe.io/framework-git/desk/print-formats)

**Limite de recherche :** les pages SAP et Jasper consultées décrivent les fonctionnalités des outils, pas leur compatibilité avec QPM. Aucune conclusion de remplacement de moteur ou de compatibilité `.rpt` n’est tirée. L’étude couvre des documents officiels accessibles; elle ne remplace pas un test produit des designers propriétaires.

## Recherche complémentaire — composition de l’interface

Cette section complète le REA Crystal avec des références d’interface. Les maquettes Dribbble sont des inspirations visuelles; leurs captures ne prouvent pas le comportement réel des produits. Pour les décisions de structure, je privilégie donc les documentations d’éditeurs réellement utilisés.

### Références observées

| Référence | Ce qu’elle apporte à la conception QPM | Limite |
|---|---|---|
| [Reporto — Dribbble](https://dribbble.com/shots/17043710-Reporto) | Langage visuel de feuille de rapport, tableaux et données denses. À retenir pour la lisibilité de la page imprimée. | Shot de portfolio; aucune preuve d’interactions ou de règles de pagination. |
| [Custom Chart Designer — Dribbble](https://dribbble.com/shots/17608587-Custom-Chart-Designer) | Configuration progressive d’un objet visuel et aperçu de ses dimensions. Utile comme inspiration pour les propriétés propres à un composant. | La formule personnalisée montrée n’est pas transposable telle quelle aux bindings sécurisés QPM. |
| [Report Builder — Jotform, Dribbble](https://dribbble.com/shots/26025236-Report-Builder-Jotform) | Panneau de configuration d’un rapport et choix d’apparence des graphiques. | Maquette de présentation, comportement produit non vérifié. |
| [Report Builder UI — Crowdfire, Dribbble](https://dribbble.com/shots/6670372-Report-Builder-UI-Crowdfire) | Regroupe métriques, plage de dates et actions de sauvegarde/téléchargement dans une tâche identifiable. | Maquette ancienne; référence visuelle uniquement. |
| [Éditeur de rapport Power BI](https://learn.microsoft.com/power-bi/create-reports/service-the-report-editor-take-a-tour) | Surface centrale, panneau de visualisations, panneau des données et filtres; les réglages répondent à la sélection et aux champs déposés. | Modèle d’analytique interactive, pas de mise en page paginée de document. |
| [Report Builder — vue de conception](https://learn.microsoft.com/en-us/sql/reporting-services/report-builder/report-design-view-report-builder?view=sql-server-ver17) | Surface de conception entourée de panneaux; propriétés et hiérarchies adaptées au document imprimable. | Interface plus complexe, à simplifier pour QPM. |
| [Grafana — édition depuis la barre latérale](https://docs.aws.amazon.com/grafana/latest/userguide/v13-dash-dynamic-sidebar.html) | Le tableau de bord reste visible pendant l’édition; le panneau latéral suit l’élément sélectionné et peut se fermer pour rendre l’espace au contenu. L’outline expose la structure. | Produit de tableaux de bord, et non éditeur PDF. |
| [Metabase — constructeur de questions](https://www.metabase.com/features/query-builder) | Étapes de données compréhensibles, filtres et aperçu permettant de vérifier le résultat au cours de la configuration. | QPM doit continuer à présenter uniquement ses providers et relations autorisés. |
| [Crystal Reports — Report Explorer](https://help.sap.com/docs/SAP_CRYSTAL_REPORTS/dfc124becfa845ffa91b1e717b20e3ec/4761b2236e041014910aba7db0e91070.html) | Arbre rapport → sections → objets coordonné avec le canevas, conformément au REA. | Référence fonctionnelle; ne justifie pas une copie de son interface historique. |

### Direction recommandée pour le designer QPM

L’espace de travail desktop devrait organiser la tâche en trois zones stables :

1. **À gauche — Ajouter et parcourir :** un panneau compact avec recherche et deux vues clairement nommées, « Composants » et « Structure ». La structure reflète l’ordre imprimé : en-tête de rapport, en-tête de page, corps, pied de page, pied de rapport; chaque composant développe ensuite ses objets. Les catégories de composants restent repliables. L’ajout doit fonctionner par clic et glisser-déposer.
2. **Au centre — Composer :** le canevas imprimable est la surface dominante. Les sections sont visibles comme des bandes identifiées, avec leurs limites et leur fréquence (première page, chaque page, dernière page). Les commandes de zoom/ajustement et de page restent à portée de main. Un aperçu PDF est une action explicite du bandeau, avec état de sauvegarde visible.
3. **À droite — Modifier la sélection :** un inspecteur contextuel unique affiche seulement les réglages applicables à l’objet choisi : contenu/liaison, mise en forme, visibilité et placement. Pour un tableau, il expose dataset métier, colonnes, ordre, largeur et état sans ligne; pour un champ, son binding, son format et sa règle « masquer si vide ». La provenance relationnelle QPM reste consultable ici, sans afficher les valeurs d’un autre enregistrement.

Cette structure reprend l’arbre synchronisé de Crystal, la séparation entre surface et panneaux de Power BI/Report Builder, et l’inspecteur latéral de Grafana. Elle règle aussi un problème concret d’ergonomie du designer actuel : la sélection ne devrait pas obliger à faire défiler la page sous le canevas pour trouver plusieurs panneaux de réglages dispersés. L’inspecteur doit rester voisin du canevas; sur écran étroit, il devient un tiroir ou un onglet, sans réduire la page de conception à une colonne illisible.

### Principes visuels et interactions

- Garder une page blanche à l’échelle du papier sur un fond de travail neutre; utiliser la couleur QPM avec retenue pour la sélection et les actions principales. Les couleurs vives des shots Dribbble servent à repérer la hiérarchie, pas à colorer le document imprimé.
- Afficher les affordances de déplacement uniquement au survol/sélection et fournir des actions clavier/menus pour sélectionner, déplacer, dupliquer et supprimer. La suppression d’un modèle complet doit rester dans la bibliothèque avec confirmation claire et distinction entre suppression définitive d’un brouillon et archivage d’un modèle déjà publié.
- Montrer les états utiles près de leur objet : sélection, changements non enregistrés, données d’aperçu disponibles/vides, et éventuelle restriction de licence. Éviter les états techniques bruts et les panneaux vides.
- Préserver la différence du REA entre une **section d’impression** (conteneur, fréquence, pagination) et un **composant** (tableau, champ, texte, signature). L’en-tête et le pied de page doivent donc être manipulables comme zones avec leur propre contour et réglages, pas seulement comme étiquettes attribuées à un objet.
- Conserver le catalogue de bindings métier et le graphe de relations en lecture seule. Les références analytiques montrent une configuration par étapes, mais ne changent pas la décision du REA : pas de SQL, jointure ou formule libre définie par l’utilisateur.

### Ordre de mise en œuvre conseillé

1. Regrouper les réglages aujourd’hui dispersés dans un inspecteur contextuel à droite du canevas; rendre cet inspecteur pliable et conserver l’état sélectionné lors du changement de panneau.
2. Transformer les sections d’impression en zones visuelles explicites et redimensionnables, avec comportement d’en-tête/pied et états vides compréhensibles.
3. Finaliser le catalogue gauche en vues « Composants » et « Structure », avec recherche, compteurs et sélection synchronisée.
4. Faire une passe responsive et accessibilité : navigation clavier, libellés de glisser-déposer, cibles tactiles, focus, contraste, panneau latéral en tiroir.
5. Reconstruire et vérifier le parcours complet lorsque ce lot de changements d’interface est intégré, puis vérifier un PDF court et un PDF multipage. Les maquettes seules ne valident ni le rendu ni les interactions.
