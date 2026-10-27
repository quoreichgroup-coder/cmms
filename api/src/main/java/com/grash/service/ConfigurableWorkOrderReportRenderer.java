package com.grash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.factory.StorageServiceFactory;
import com.grash.utils.PdfReportUtils;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.html2pdf.HtmlConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Locale;
import java.util.ArrayList;
import java.util.function.Function;

/** Renders only server-resolved values selected by a validated, published template. */
@Component
@RequiredArgsConstructor
public class ConfigurableWorkOrderReportRenderer {
    private final SpringTemplateEngine templateEngine;
    private final StorageServiceFactory storageServiceFactory;

    public byte[] render(JsonNode configuration,
                         List<ReportBlock> blocks,
                         DocumentContextResolver.DocumentContext companyContext,
                         String logoStoragePath,
                         String accentColor) {
        Locale locale = companyContext.locale() == null ? Locale.ROOT : companyContext.locale();
        Context context = new Context(locale);
        JsonNode page = configuration.path("page");
        String size = page.path("size").asText("A4");
        String orientation = page.path("orientation").asText("LANDSCAPE").toLowerCase(Locale.ROOT);
        int margin = page.path("marginMm").asInt(10);
        context.setVariable("pageSize", size);
        context.setVariable("orientation", orientation);
        context.setVariable("marginMm", margin);
        context.setVariable("blocks", blocks);
        boolean requestReport = "REQUEST".equals(configuration.path("documentType").asText());
        boolean french = companyContext.language() != null
                && "FR".equalsIgnoreCase(companyContext.language().name());
        context.setVariable("requestReport", requestReport);
        context.setVariable("french", french);
        boolean signaturePlacedInLayout = "2.0".equals(configuration.path("schemaVersion").asText())
                && blocks.stream().anyMatch(block -> "SIGNATURE".equals(block.type()));
        List<ReportBlock> contentBlocks = blocks.stream()
                .filter(block -> signaturePlacedInLayout || !"workOrder.signature".equals(blockKey(block)))
                .filter(block -> !block.hideIfEmpty() || block.row() == null
                        || (block.row().value() != null && !block.row().value().isBlank())).toList();
        List<ReportSection> renderedSections = "2.0".equals(configuration.path("schemaVersion").asText())
                ? layoutSections(contentBlocks, french)
                : semanticSections(contentBlocks, requestReport, french);
        context.setVariable("sections", renderedSections);
        ReportRow signature = blocks.stream()
                .filter(block -> "workOrder.signature".equals(blockKey(block)))
                .map(ReportBlock::row).filter(java.util.Objects::nonNull).findFirst().orElse(null);
        context.setVariable("showWorkOrderSignatures", !requestReport && !signaturePlacedInLayout);
        context.setVariable("signatureLabel", signature == null
                ? (french ? "Signature du technicien" : "Technician signature") : signature.label());
        context.setVariable("signatureDataUri", signature == null ? null : signature.value());
        String completedBy = blocks.stream()
                .filter(block -> block.row() != null && "workOrder.completedBy".equals(block.row().key()))
                .map(block -> block.row().value()).filter(value -> value != null && !value.isBlank())
                .findFirst().orElse(null);
        context.setVariable("completedByName", completedBy);
        context.setVariable("companyName", companyContext.companyName());
        context.setVariable("legalName", companyContext.legalName());
        context.setVariable("registeredAddress", companyContext.registeredAddress());
        context.setVariable("registrationNumber", companyContext.registrationNumber());
        context.setVariable("taxNumber", companyContext.taxNumber());
        context.setVariable("phone", companyContext.phone());
        context.setVariable("email", companyContext.email());
        context.setVariable("siteName", companyContext.siteName());
        context.setVariable("logoStoragePath", logoStoragePath);
        String templateAccent = PdfReportUtils.resolveCssColor(configuration.path("design").path("accentColor").asText(null));
        String companyAccent = PdfReportUtils.resolveCssColor(accentColor);
        context.setVariable("accentColor", templateAccent != null ? templateAccent
                : companyAccent == null ? "#2F5BEA" : companyAccent);
        context.setVariable("repeatTableHeader", configuration.path("options").path("repeatTableHeader").asBoolean());
        String style = configuration.path("style").asText("CLASSIC");
        context.setVariable("styleClass", "COMPACT".equals(style) ? "compact"
                : "MODERN".equals(style) ? "modern" : "classic");
        context.setVariable("reportTitle", requestReport
                ? (french ? "Rapport de demande de maintenance" : "Maintenance Request")
                : (french ? "Carte de travail" : "Work Order Job Card"));
        context.setVariable("reportKicker", requestReport
                ? (french ? "DEMANDE DE MAINTENANCE" : "MAINTENANCE REQUEST")
                : (french ? "ORDRE DE TRAVAIL" : "MAINTENANCE WORK ORDER"));
        context.setVariable("reportSubtitle", french
                ? (requestReport ? "Demande de maintenance" : "Fiche d’intervention et de confirmation")
                : (requestReport ? "Maintenance request" : "Maintenance work and execution record"));
        String html = templateEngine.process("work-order-template-report.html", context);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        Function<String, byte[]> imageLoader = storageServiceFactory.getStorageService()::download;
        HtmlConverter.convertToPdf(html, output, PdfReportUtils.createReportConverterProperties(imageLoader));
        return configuration.path("options").path("showPageNumbers").asBoolean()
                ? addPageNumbers(output.toByteArray(), margin, french) : output.toByteArray();
    }

    private List<ReportSection> semanticSections(List<ReportBlock> blocks, boolean requestReport, boolean french) {
        List<ReportSection> sections = new ArrayList<>();
        for (ReportBlock block : blocks) {
            String key = blockKey(block);
            String sectionKey = sectionKey(key, requestReport);
            if (sections.isEmpty() || !sections.get(sections.size() - 1).key().equals(sectionKey)) {
                sections.add(new ReportSection(sectionKey, sectionTitle(sectionKey, french), new ArrayList<>(), 1));
            }
            sections.get(sections.size() - 1).blocks().add(block);
        }
        return sections;
    }

    private List<ReportSection> layoutSections(List<ReportBlock> blocks, boolean french) {
        List<ReportSection> sections = new ArrayList<>();
        for (ReportBlock block : blocks) {
            String title = block.sectionTitle() == null || block.sectionTitle().isBlank()
                    ? (french ? "Informations" : "Details") : block.sectionTitle();
            String sectionId = block.sectionId() == null ? title : block.sectionId();
            if (sections.isEmpty() || !sections.get(sections.size() - 1).key().equals(sectionId)) {
                sections.add(new ReportSection(sectionId, title, new ArrayList<>(),
                        Math.max(1, Math.min(3, block.columns())), block.pageBreakBefore(), block.keepTogether()));
            }
            sections.get(sections.size() - 1).blocks().add(block);
        }
        return sections;
    }

    private String blockKey(ReportBlock block) {
        if (block == null) return "";
        if (block.table() != null) return block.table().key();
        return block.row() == null ? "" : block.row().key();
    }

    private String sectionKey(String field, boolean requestReport) {
        if (field.startsWith("company.")) return "company";
        if (requestReport) {
            if (field.startsWith("asset.") || field.startsWith("location.") || field.equals("site.name"))
                return "equipment";
            if (field.equals("request.dueDate") || field.equals("request.estimatedDuration")) return "planning";
            return "request";
        }
        if (field.startsWith("asset.") || field.startsWith("location.") || field.equals("site.name"))
            return "equipment";
        if (field.equals("workOrder.title") || field.equals("workOrder.description")) return "scope";
        if (field.equals("workOrder.dueDate") || field.equals("workOrder.estimatedDuration")) return "planning";
        if (field.equals("workOrder.actualDuration")) return "labor";
        if (field.equals("workOrder.executionTasks")) return "operations";
        if (field.equals("workOrder.laborTimeEntries")) return "labor";
        if (field.equals("workOrder.materialsUsed")) return "materials";
        if (field.equals("workOrder.feedback")) return "executionNotes";
        if (field.equals("workOrder.completedAt") || field.equals("workOrder.completedBy")) return "completion";
        return "identification";
    }

    private String sectionTitle(String key, boolean french) {
        return switch (key) {
            case "company" -> french ? "Entreprise" : "Company";
            case "identification" -> french ? "Identification de l’ordre de travail" : "Work Order identification";
            case "equipment" -> french ? "Équipement et localisation fonctionnelle" : "Equipment and functional location";
            case "scope" -> french ? "Travaux à réaliser" : "Maintenance work scope";
            case "planning" -> french ? "Planification" : "Planning and scheduling";
            case "operations" -> french ? "Opérations et contrôles" : "Operations and checks";
            case "labor" -> french ? "Main-d’œuvre et temps réel" : "Labor and actual time";
            case "materials" -> french ? "Pièces et matériels" : "Materials and spare parts";
            case "executionNotes" -> french ? "Notes d’exécution" : "Execution notes";
            case "completion" -> french ? "Confirmation de fin d’intervention" : "Completion confirmation";
            case "request" -> french ? "Demande de maintenance" : "Maintenance request";
            default -> french ? "Informations" : "Details";
        };
    }

    private byte[] addPageNumbers(byte[] source, int marginMm, boolean french) {
        ByteArrayOutputStream numbered = new ByteArrayOutputStream();
        try (PdfDocument document = new PdfDocument(
                new PdfReader(new ByteArrayInputStream(source)), new PdfWriter(numbered))) {
            int pageCount = document.getNumberOfPages();
            var font = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            String separator = french ? " sur " : " of ";
            float marginPoints = marginMm * 72f / 25.4f;
            for (int pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
                var page = document.getPage(pageNumber);
                Rectangle bounds = page.getPageSize();
                String label = "Page " + pageNumber + separator + pageCount;
                float x = bounds.getRight() - marginPoints - 64;
                float y = bounds.getBottom() + Math.max(8, marginPoints / 2);
                new PdfCanvas(page.newContentStreamAfter(), page.getResources(), document)
                        .saveState()
                        .beginText()
                        .setFontAndSize(font, 8)
                        .moveText(x, y)
                        .showText(label)
                        .endText()
                        .restoreState();
            }
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to add page numbers to report PDF", exception);
        }
        return numbered.toByteArray();
    }

    public record ReportRow(String key, String label, String value) { }
    public record ReportTable(String key, String title, List<String> headers, List<List<String>> rows,
                              List<Integer> columnWidths) {
        public ReportTable {
            headers = List.copyOf(headers);
            rows = rows.stream().map(List::copyOf).toList();
            if (columnWidths == null || columnWidths.isEmpty()) {
                int base = 100 / headers.size();
                int remainder = 100 % headers.size();
                columnWidths = java.util.stream.IntStream.range(0, headers.size())
                        .mapToObj(index -> base + (index < remainder ? 1 : 0)).toList();
            } else {
                columnWidths = List.copyOf(columnWidths);
                int maxWidth = headers.size() == 1 ? 100 : 70;
                if (columnWidths.size() != headers.size()
                        || columnWidths.stream().anyMatch(width -> width == null || width < 10 || width > maxWidth)
                        || columnWidths.stream().mapToInt(Integer::intValue).sum() != 100) {
                    throw new IllegalArgumentException("Report table column widths must be valid percentages");
                }
            }
        }

        /** Keeps existing renderers and tests source-compatible with equal-width tables. */
        public ReportTable(String key, String title, List<String> headers, List<List<String>> rows) {
            this(key, title, headers, rows, null);
        }
    }
    public record ReportBlock(String type, ReportRow row, ReportTable table,
                              String sectionTitle, int columns, String sectionId, String componentId,
                              Integer fontSize, boolean bold, String alignment, boolean accentTone,
                              boolean pageBreakBefore, boolean hideIfEmpty, boolean fullWidth,
                              boolean keepTogether) {
        public ReportBlock(String type, ReportRow row, ReportTable table) {
            this(type, row, table, null, 1, null, null, null, false, null, false, false, false, false, false);
        }
        public ReportBlock(String type, ReportRow row, ReportTable table,
                           String sectionTitle, int columns, String sectionId, String componentId,
                           Integer fontSize, boolean bold, String alignment, boolean accentTone) {
            this(type, row, table, sectionTitle, columns, sectionId, componentId,
                    fontSize, bold, alignment, accentTone, false, false, false, false);
        }
        public ReportBlock(String type, ReportRow row, ReportTable table,
                           String sectionTitle, int columns, String sectionId, String componentId,
                           Integer fontSize, boolean bold, String alignment, boolean accentTone,
                           boolean pageBreakBefore) {
            this(type, row, table, sectionTitle, columns, sectionId, componentId,
                    fontSize, bold, alignment, accentTone, pageBreakBefore, false, false, false);
        }
        public ReportBlock(String type, ReportRow row, ReportTable table,
                           String sectionTitle, int columns, String sectionId, String componentId,
                           Integer fontSize, boolean bold, String alignment, boolean accentTone,
                           boolean pageBreakBefore, boolean hideIfEmpty) {
            this(type, row, table, sectionTitle, columns, sectionId, componentId,
                    fontSize, bold, alignment, accentTone, pageBreakBefore, hideIfEmpty, false, false);
        }
        public ReportBlock(String type, ReportRow row, ReportTable table,
                           String sectionTitle, int columns, String sectionId, String componentId,
                           Integer fontSize, boolean bold, String alignment, boolean accentTone,
                           boolean pageBreakBefore, boolean hideIfEmpty, boolean fullWidth) {
            this(type, row, table, sectionTitle, columns, sectionId, componentId,
                    fontSize, bold, alignment, accentTone, pageBreakBefore, hideIfEmpty, fullWidth, false);
        }
    }
    public record ReportSection(String key, String title, List<ReportBlock> blocks, int columns,
                                boolean pageBreakBefore, boolean keepTogether) {
        public ReportSection(String key, String title, List<ReportBlock> blocks) {
            this(key, title, blocks, 1, false, false);
        }
        public ReportSection(String key, String title, List<ReportBlock> blocks, int columns) {
            this(key, title, blocks, columns, false, false);
        }
        public ReportSection(String key, String title, List<ReportBlock> blocks, int columns,
                             boolean pageBreakBefore) {
            this(key, title, blocks, columns, pageBreakBefore, false);
        }
    }
}
