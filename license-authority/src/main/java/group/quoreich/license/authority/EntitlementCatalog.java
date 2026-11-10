package group.quoreich.license.authority;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * What a QPM licence can switch on, grouped the way the sales team sells it. Codes must match
 * {@code com.grash.dto.license.LicenseEntitlement} in the QPM API. Catalogue version 2 adds the QPM modules
 * (procurement, approvals, task lists, PM strategies, documents, multi-site); QPM keeps those modules
 * enabled for licences issued before it (catalog version 1).
 */
public final class EntitlementCatalog {
    public static final int CATALOG_VERSION = 2;

    public record Entitlement(String code, String label, String description, Integer freeLimit, boolean warning) {}
    public record Module(String code, String label, List<Entitlement> entitlements) {}
    public record PlanSeed(String code, String name, String description, int seatsFull, int seatsLight,
                           int sortOrder, Set<String> entitlements) {}

    private static Entitlement e(String code, String label, String description) {
        return new Entitlement(code, label, description, null, false);
    }

    private static Entitlement capacity(String code, String label, int freeLimit) {
        return new Entitlement(code, label, "Sans ce droit, limite de " + freeLimit + ".", freeLimit, false);
    }

    public static final List<Module> MODULES = List.of(
            new Module("WORK_ORDERS", "Ordres de travail", List.of(
                    e("WORK_ORDER_HISTORY", "Historique des OT", "Consultation de l’historique complet des ordres de travail."),
                    e("FILE_ATTACHMENTS", "Pièces jointes", "Fichiers sur les OT, équipements et demandes."),
                    e("TIME_TRACKING", "Suivi des temps", "Saisie des temps de main-d’œuvre."),
                    e("COST_TRACKING", "Suivi des coûts", "Coûts additionnels sur les OT."),
                    e("WORK_ORDER_LINKING", "Liens entre OT", "Relations parent/enfant entre ordres de travail."),
                    e("SIGNATURE_CAPTURE", "Signature", "Signature à la clôture des OT."),
                    e("VOICE_NOTES", "Notes vocales", "Notes vocales sur mobile."))),
            new Module("PREVENTIVE", "Maintenance préventive", List.of(
                    e("PM_CALENDAR", "Calendrier préventif", "Vue calendrier des occurrences."),
                    e("CONDITION_BASED_PM", "Préventif conditionnel", "Déclenchement sur compteurs."),
                    e("PM_STRATEGIES", "Stratégies et multi-compteurs", "Paquets de stratégie, plans multi-compteurs, registre des appels."),
                    e("MAINTENANCE_TASK_LISTS", "Listes de tâches", "Gammes structurées : opérations, composants, compteurs."),
                    e("RESOURCE_PLANNING", "Planification des ressources", "Vue de charge et planification."))),
            new Module("ASSETS", "Équipements", List.of(
                    e("ASSET_HIERARCHY", "Hiérarchie des équipements", "Équipements parents et enfants."),
                    e("ASSET_DOWNTIME", "Arrêts d’équipement", "Suivi des arrêts et disponibilité."),
                    e("NFC_BARCODE", "NFC et codes-barres", "Identification par NFC, QR et codes-barres."))),
            new Module("PURCHASING", "Stocks et achats", List.of(
                    e("LOW_STOCK_ALERTS", "Alertes de stock bas", "Alertes sur seuil minimal."),
                    e("PARTS_COST_TRACKING", "Coût des pièces", "Valorisation des pièces consommées."),
                    e("CUSTOMER_VENDOR", "Clients et fournisseurs", "Annuaire des clients et fournisseurs."),
                    e("PROCUREMENT", "Achats (DA et BC)", "Demandes d’achat, bons de commande, réceptions."),
                    e("APPROVAL_WORKFLOWS", "Circuits d’approbation", "Politiques d’approbation multi-niveaux des DA et BC."))),
            new Module("REQUESTS", "Demandes", List.of(
                    e("REQUEST_PORTAL", "Portail de demandes", "Portail public de demande d’intervention."))),
            new Module("DOCUMENTS", "Documents", List.of(
                    e("DOCUMENT_TEMPLATES", "Modèles de documents", "Modèles personnalisés pour OT, demandes, DA et BC."),
                    e("VISUAL_DOCUMENT_DESIGNER", "Concepteur visuel", "Mise en page libre des documents (PDFME)."))),
            new Module("CONFIGURATION", "Configuration", List.of(
                    e("CUSTOM_ROLES", "Rôles personnalisés", "Rôles et permissions sur mesure."),
                    e("FIELD_CONFIGURATION", "Champs configurables", "Champs personnalisés et obligatoires."),
                    e("WORKFLOW", "Automatisations", "Règles d’automatisation (workflows)."),
                    e("BRANDING", "Image de marque", "Logo et couleurs personnalisés."),
                    e("MULTI_SITE", "Multi-sites", "Plusieurs sites avec logos, langues et fuseaux propres."))),
            new Module("ANALYTICS", "Analyses", List.of(
                    e("ADVANCED_ANALYTICS", "Analyses avancées", "Tableaux de bord et indicateurs avancés."))),
            new Module("INTEGRATIONS", "Intégrations", List.of(
                    e("API_ACCESS", "Accès API", "Clés API pour les intégrations."),
                    e("WEBHOOK", "Webhooks", "Notifications sortantes vers d’autres systèmes."),
                    e("SSO", "Authentification unique (SSO)", "Connexion via le fournisseur d’identité du client."),
                    e("MULTI_INSTANCE", "Multi-instances", "Plusieurs instances liées."))),
            new Module("CAPACITY", "Capacité", List.of(
                    capacity("UNLIMITED_ASSETS", "Équipements illimités", 50),
                    capacity("UNLIMITED_LOCATIONS", "Emplacements illimités", 10),
                    capacity("UNLIMITED_ACTIVE_WORK_ORDERS", "OT ouverts illimités", 30),
                    capacity("UNLIMITED_CHECKLISTS", "Listes de contrôle illimitées", 10),
                    capacity("UNLIMITED_PARTS", "Pièces illimitées", 100),
                    capacity("UNLIMITED_PM_SCHEDULES", "Plans préventifs illimités", 10),
                    capacity("UNLIMITED_METERS", "Compteurs illimités", 10),
                    new Entitlement("UNLIMITED_USERS", "Utilisateurs illimités",
                            "Désactive le contrôle des places vendues : à réserver aux contrats explicitement illimités.",
                            5, true))));

    public static final Set<String> ALL_CODES = MODULES.stream().flatMap(module -> module.entitlements().stream())
            .map(Entitlement::code).collect(Collectors.toCollection(LinkedHashSet::new));

    private static Set<String> codes(String... values) {
        return new LinkedHashSet<>(List.of(values));
    }

    private static final Set<String> ESSENTIAL = codes("WORK_ORDER_HISTORY", "FILE_ATTACHMENTS", "TIME_TRACKING",
            "COST_TRACKING", "WORK_ORDER_LINKING", "PM_CALENDAR", "ASSET_HIERARCHY",
            "UNLIMITED_ASSETS", "UNLIMITED_LOCATIONS", "UNLIMITED_ACTIVE_WORK_ORDERS", "UNLIMITED_CHECKLISTS");

    private static final Set<String> PROFESSIONAL;
    private static final Set<String> ENTERPRISE;
    static {
        Set<String> professional = new LinkedHashSet<>(ESSENTIAL);
        professional.addAll(codes("SIGNATURE_CAPTURE", "VOICE_NOTES", "CONDITION_BASED_PM", "PM_STRATEGIES",
                "MAINTENANCE_TASK_LISTS", "ASSET_DOWNTIME", "NFC_BARCODE", "LOW_STOCK_ALERTS", "PARTS_COST_TRACKING",
                "CUSTOMER_VENDOR", "PROCUREMENT", "REQUEST_PORTAL", "DOCUMENT_TEMPLATES", "CUSTOM_ROLES",
                "FIELD_CONFIGURATION", "UNLIMITED_PARTS", "UNLIMITED_PM_SCHEDULES", "UNLIMITED_METERS"));
        PROFESSIONAL = professional;
        Set<String> enterprise = new LinkedHashSet<>(ALL_CODES);
        enterprise.remove("UNLIMITED_USERS");
        ENTERPRISE = enterprise;
    }

    /** Default plans created on first start; the admin edits them afterwards in the console. */
    public static final List<PlanSeed> DEFAULT_PLANS = List.of(
            new PlanSeed("ESSENTIAL", "Essentiel", "Ordres de travail et préventif calendaire.", 5, 10, 10, ESSENTIAL),
            new PlanSeed("PROFESSIONAL", "Professionnel",
                    "Préventif avancé, stocks et achats, portail de demandes, modèles de documents.", 15, 50, 20, PROFESSIONAL),
            new PlanSeed("ENTERPRISE", "Entreprise",
                    "Tous les modules : approbations, concepteur visuel, multi-sites, analyses, intégrations.", 50, 200, 30, ENTERPRISE));

    public static Map<String, Entitlement> byCode() {
        return MODULES.stream().flatMap(module -> module.entitlements().stream())
                .collect(Collectors.toMap(Entitlement::code, entitlement -> entitlement));
    }

    private EntitlementCatalog() {}
}
