package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.factory.StorageServiceFactory;
import com.grash.model.enums.Language;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.junit.jupiter.api.Test;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ConfigurableWorkOrderReportRendererTest {
    @Test
    void rendersMaintenanceRequestSpecificDocumentTitle() throws Exception {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);
        StorageServiceFactory storageFactory = mock(StorageServiceFactory.class);
        when(storageFactory.getStorageService()).thenReturn(mock(StorageService.class));
        ConfigurableWorkOrderReportRenderer renderer = new ConfigurableWorkOrderReportRenderer(templateEngine, storageFactory);
        var configuration = new ObjectMapper().readTree("""
                {"documentType":"REQUEST","provider":"REQUEST","style":"CLASSIC",
                 "page":{"size":"A4","orientation":"PORTRAIT","marginMm":10},
                 "visibleFields":["request.title"],"options":{"showPageNumbers":false,"repeatTableHeader":true}}
                """);
        var context = new DocumentContextResolver.DocumentContext("QPM", null, null, null, null, null,
                null, "XOF", null, "Africa/Abidjan", Language.EN, Locale.ENGLISH, null, null);

        byte[] pdf = renderer.render(configuration, List.of(new ConfigurableWorkOrderReportRenderer.ReportBlock(
                "FIELD", new ConfigurableWorkOrderReportRenderer.ReportRow(
                "request.title", "Request title", "Inspect transfer pump"), null)), context, null, "#2F5BEA");

        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            String pageText = PdfTextExtractor.getTextFromPage(document.getPage(1));
            assertTrue(pageText.replaceAll("\\s+", " ").contains("Maintenance Request"),
                    "request PDF title should be specific; extracted text: " + pageText);
            assertTrue(pageText.contains("Inspect transfer pump"));
        }
    }

    @Test
    void rendersAValidPdfFromValidatedFieldsAndTenantBranding() throws Exception {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);

        StorageServiceFactory storageFactory = mock(StorageServiceFactory.class);
        when(storageFactory.getStorageService()).thenReturn(mock(StorageService.class));
        ConfigurableWorkOrderReportRenderer renderer = new ConfigurableWorkOrderReportRenderer(templateEngine, storageFactory);
        var configuration = new ObjectMapper().readTree("""
                {"schemaVersion":"1.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "visibleFields":["workOrder.customId","workOrder.status","workOrder.title","workOrder.description",
                  "asset.name","asset.serialNumber","location.name","workOrder.dueDate","workOrder.signature"],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        var context = new DocumentContextResolver.DocumentContext("QPM Test Company", "QPM Legal SARL",
                "Dakar", null, "Industrial Zone", "RC-1", "NIF-2", "XOF", null, "Africa/Dakar",
                Language.EN, Locale.ENGLISH, 3L, "Plant 3");

        byte[] pdf = renderer.render(configuration, List.of(
                new ConfigurableWorkOrderReportRenderer.ReportBlock("TABLE", null,
                        new ConfigurableWorkOrderReportRenderer.ReportTable("workOrder.executionTasks",
                                "Operations and tasks", List.of("No.", "Operation", "Result"),
                                List.of(List.of("1", "Inspect coupling", "PASS")))),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow(
                                "workOrder.title", "Title <script>alert(1)</script>", "Inspect transfer pump"), null),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow(
                                "workOrder.customId", "Work Order ID", "WO-0042"), null),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow(
                                "workOrder.status", "Status", "IN_PROGRESS"), null),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow(
                                "workOrder.description", "Maintenance description", "Inspect coupling, verify vibration, and record the observed condition."), null),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("asset.name", "Equipment", "P-301"), null),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("SIGNATURE",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.signature", "Technician signature",
                                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="), null)),
                context, null, "#2F5BEA");
        writeVisualReviewPdf("job-card-landscape.pdf", pdf);

        assertTrue(pdf.length > 500);
        assertEquals('%', (char) pdf[0]);
        assertEquals('P', (char) pdf[1]);
        assertEquals('D', (char) pdf[2]);
        assertEquals('F', (char) pdf[3]);
        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            assertEquals(1, document.getNumberOfPages());
            var pageSize = document.getPage(1).getPageSize();
            assertEquals(841.89f, pageSize.getWidth(), 1f, "A4 landscape width");
            assertEquals(595.28f, pageSize.getHeight(), 1f, "A4 landscape height");
            String pageText = PdfTextExtractor.getTextFromPage(document.getPage(1));
            assertTrue(pageText.contains("Inspect transfer pump"), "work order title is rendered in the job card");
            assertTrue(pageText.contains("TITLE <SCRIPT>ALERT(1)</SCRIPT>"),
                    "custom field labels remain text, not markup. Extracted text: " + pageText);
            assertTrue(pageText.contains("Inspect coupling"), "structured Job Card tables render their rows");
            assertTrue(pageText.contains("Work Order Job Card"), "the PDF has a job-card title");
            assertTrue(pageText.contains("Equipment and functional location"), "the PDF groups equipment semantically");
            assertTrue(pageText.contains("Maintenance work scope"), "the PDF groups work scope semantically");
            assertTrue(pageText.contains("Completion and sign-off"), "the PDF includes sign-off areas");
            assertTrue(pageText.indexOf("Operations and tasks") < pageText.indexOf("Inspect transfer pump"),
                    "the configured order remains reflected in the rendered PDF");
            assertTrue(pageText.contains("Page 1"), "configured page numbering appears in the PDF");
        }
    }

    @Test
    void rendersShortJobCardWhenOptionalValuesAreMissing() throws Exception {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);
        StorageServiceFactory storageFactory = mock(StorageServiceFactory.class);
        when(storageFactory.getStorageService()).thenReturn(mock(StorageService.class));
        ConfigurableWorkOrderReportRenderer renderer = new ConfigurableWorkOrderReportRenderer(templateEngine, storageFactory);
        var configuration = new ObjectMapper().readTree("""
                {"documentType":"WORK_ORDER","provider":"WORK_ORDER","style":"CLASSIC",
                 "page":{"size":"A4","orientation":"PORTRAIT","marginMm":10},
                 "visibleFields":["workOrder.customId","workOrder.title","asset.name","location.name","workOrder.dueDate"],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        var context = new DocumentContextResolver.DocumentContext("QPM", null, null, null, null, null,
                null, "XOF", null, "Africa/Abidjan", Language.EN, Locale.ENGLISH, null, null);
        byte[] pdf = renderer.render(configuration, List.of(
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.customId", "Work Order ID", null), null),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.title", "Work description", "Inspect transfer pump"), null),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("asset.name", "Equipment", null), null),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("location.name", "Functional location", null), null),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.dueDate", "Scheduled date", null), null)),
                context, null, "#2F5BEA");
        writeVisualReviewPdf("job-card-sparse-portrait.pdf", pdf);

        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            assertEquals(1, document.getNumberOfPages(), "short Job Cards fit on one A4 portrait page");
            var pageSize = document.getPage(1).getPageSize();
            assertEquals(595.28f, pageSize.getWidth(), 1f, "A4 portrait width");
            assertEquals(841.89f, pageSize.getHeight(), 1f, "A4 portrait height");
            String text = PdfTextExtractor.getTextFromPage(document.getPage(1));
            assertTrue(text.contains("Inspect transfer pump"));
            assertFalse(text.contains("null"), "missing values must not print the string null");
            assertFalse(text.contains("undefined"), "missing values must not print the string undefined");
        }
    }

    @Test
    void rendersVersionTwoLayoutInConfiguredSectionAndComponentOrder() throws Exception {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);
        StorageServiceFactory storageFactory = mock(StorageServiceFactory.class);
        when(storageFactory.getStorageService()).thenReturn(mock(StorageService.class));
        ConfigurableWorkOrderReportRenderer renderer = new ConfigurableWorkOrderReportRenderer(templateEngine, storageFactory);
        var configuration = new ObjectMapper().readTree("""
                {"schemaVersion":"2.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"MODERN","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "layout":[
                   {"id":"identity","type":"SECTION","title":"Asset identity","columns":2,"items":[]},
                   {"id":"execution","type":"SECTION","title":"Execution details","columns":1,"items":[]}
                 ],"options":{"showPageNumbers":false,"repeatTableHeader":true}}
                """);
        var context = new DocumentContextResolver.DocumentContext("QPM", "QPM Legal SARL", "Dakar", null,
                null, "RC-1", "NIF-2", "XOF", null, "Africa/Dakar", Language.EN, Locale.ENGLISH, 1L, "Plant 1");
        var blocks = List.of(
                new ConfigurableWorkOrderReportRenderer.ReportBlock("SIGNATURE",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.signature", "Technician approval", null), null,
                        "Asset identity", 2, "identity", "signature", null, false, "LEFT", false),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("asset.name", "Equipment", "Pump P-301"), null,
                        "Asset identity", 2, "identity", "asset-name", 10, true, "LEFT", false),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.title", "Work Order", "Inspect coupling"), null,
                        "Execution details", 1, "execution", "work-title", 9, false, "CENTER", true));

        byte[] pdf = renderer.render(configuration, blocks, context, null, "#2F5BEA");

        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            String pageText = PdfTextExtractor.getTextFromPage(document.getPage(1));
            assertTrue(pageText.contains("Asset identity"));
            assertTrue(pageText.contains("Execution details"));
            assertTrue(pageText.contains("Pump P-301"));
            assertTrue(pageText.contains("Inspect coupling"));
            assertTrue(pageText.contains("Technician approval"));
            assertTrue(pageText.indexOf("Asset identity") < pageText.indexOf("Execution details"));
            assertTrue(pageText.indexOf("Technician approval") < pageText.indexOf("Execution details"),
                    "a V2 signature component stays at its configured place");
            assertFalse(pageText.contains("Completion and sign-off"),
                    "the signature block is not duplicated at the end of a V2 report");
            assertTrue(pageText.indexOf("Pump P-301") < pageText.indexOf("Inspect coupling"));
        }
    }

    @Test
    void startsConfiguredSectionOnANewPage() throws Exception {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);
        StorageServiceFactory storageFactory = mock(StorageServiceFactory.class);
        when(storageFactory.getStorageService()).thenReturn(mock(StorageService.class));
        ConfigurableWorkOrderReportRenderer renderer = new ConfigurableWorkOrderReportRenderer(templateEngine, storageFactory);
        var configuration = new ObjectMapper().readTree("""
                {"schemaVersion":"2.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"PORTRAIT","marginMm":10},
                 "layout":[
                   {"id":"summary","type":"SECTION","title":"Summary","columns":1,"items":[]},
                   {"id":"execution","type":"SECTION","title":"Execution record","columns":1,
                    "pageBreakBefore":true,"items":[]}
                 ],"options":{"showPageNumbers":false,"repeatTableHeader":true}}
                """);
        var context = new DocumentContextResolver.DocumentContext("QPM", null, null, null, null, null,
                null, "XOF", null, "Africa/Abidjan", Language.EN, Locale.ENGLISH, null, null);
        var blocks = List.of(
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.title", "Work Order", "Pump inspection"), null,
                        "Summary", 1, "summary", "title", null, false, "LEFT", false, false),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.feedback", "Execution note", "Vibration within limit"), null,
                        "Execution record", 1, "execution", "feedback", null, false, "LEFT", false, true));

        byte[] pdf = renderer.render(configuration, blocks, context, null, "#2F5BEA");

        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            assertEquals(2, document.getNumberOfPages());
            String firstPage = PdfTextExtractor.getTextFromPage(document.getPage(1));
            String secondPage = PdfTextExtractor.getTextFromPage(document.getPage(2));
            assertTrue(firstPage.contains("Pump inspection"));
            assertFalse(firstPage.contains("Vibration within limit"));
            assertTrue(secondPage.contains("Execution record"));
            assertTrue(secondPage.contains("Vibration within limit"));
        }
    }

    @Test
    void suppressesOnlyEmptyFieldsExplicitlyMarkedByTheTemplate() throws Exception {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);
        StorageServiceFactory storageFactory = mock(StorageServiceFactory.class);
        when(storageFactory.getStorageService()).thenReturn(mock(StorageService.class));
        ConfigurableWorkOrderReportRenderer renderer = new ConfigurableWorkOrderReportRenderer(templateEngine, storageFactory);
        var configuration = new ObjectMapper().readTree("""
                {"schemaVersion":"2.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"PORTRAIT","marginMm":10},
                 "layout":[{"id":"details","type":"SECTION","title":"Details","columns":1,"items":[]}],
                 "options":{"showPageNumbers":false,"repeatTableHeader":true}}
                """);
        var context = new DocumentContextResolver.DocumentContext("QPM", null, null, null, null, null,
                null, "XOF", null, "Africa/Abidjan", Language.EN, Locale.ENGLISH, null, null);
        var blocks = List.of(
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.title", "Work Order", "Pump inspection"), null,
                        "Details", 1, "details", "title", null, false, "LEFT", false, false, false),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.feedback", "Optional field", ""), null,
                        "Details", 1, "details", "feedback", null, false, "LEFT", false, false, true),
                new ConfigurableWorkOrderReportRenderer.ReportBlock("FIELD",
                        new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.completedBy", "Paper form field",
                                "Long inspection note retained across the full-width component in the printed maintenance record."), null,
                        "Details", 2, "details", "description", null, false, "LEFT", false, false, false, true));

        byte[] pdf = renderer.render(configuration, blocks, context, null, "#2F5BEA");

        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            String pageText = PdfTextExtractor.getTextFromPage(document.getPage(1));
            assertTrue(pageText.contains("Pump inspection"));
            assertFalse(pageText.contains("OPTIONAL FIELD"));
            assertTrue(pageText.contains("PAPER FORM FIELD"),
                    "an unmarked field remains in the rendered report");
            assertTrue(pageText.contains("printed maintenance record."),
                    "long field content is retained when the component spans the section width");
        }
    }

    @Test
    void repeatsStructuredTableHeadersAndPageNumbersAcrossPages() throws Exception {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);
        StorageServiceFactory storageFactory = mock(StorageServiceFactory.class);
        when(storageFactory.getStorageService()).thenReturn(mock(StorageService.class));
        ConfigurableWorkOrderReportRenderer renderer = new ConfigurableWorkOrderReportRenderer(templateEngine, storageFactory);
        var configuration = new ObjectMapper().readTree("""
                {"documentType":"WORK_ORDER","provider":"WORK_ORDER","style":"MODERN",
                 "page":{"size":"A4","orientation":"PORTRAIT","marginMm":10},
                 "visibleFields":["workOrder.executionTasks"],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        var context = new DocumentContextResolver.DocumentContext("QPM", null, null, null, null, null,
                null, "XOF", null, "Africa/Abidjan", Language.EN, Locale.ENGLISH, null, null);
        String longNote = "Thermal inspection confirmed stable bearing temperature across the full operating cycle; "
                + "lubrication level was checked and recorded for follow-up during the next scheduled maintenance window.";
        List<List<String>> taskRows = java.util.stream.IntStream.rangeClosed(1, 100)
                .mapToObj(index -> List.of(Integer.toString(index), "Inspect equipment component " + index,
                        "PASS", index == 1 ? longNote : "Verified during maintenance"))
                .toList();
        var table = new ConfigurableWorkOrderReportRenderer.ReportTable("workOrder.executionTasks",
                "Operations and tasks", List.of("No.", "Operation / task", "Result", "Notes"), taskRows);
        byte[] pdf = renderer.render(configuration, List.of(
                new ConfigurableWorkOrderReportRenderer.ReportBlock("TABLE", null, table)), context, null, "#2F5BEA");
        writeVisualReviewPdf("job-card-long-portrait.pdf", pdf);

        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            assertTrue(document.getNumberOfPages() > 1, "long Job Cards must paginate");
            StringBuilder fullText = new StringBuilder();
            for (int page = 1; page <= document.getNumberOfPages(); page++) {
                var pageSize = document.getPage(page).getPageSize();
                assertEquals(595.28f, pageSize.getWidth(), 1f, "A4 portrait width");
                assertEquals(841.89f, pageSize.getHeight(), 1f, "A4 portrait height");
                String pageText = PdfTextExtractor.getTextFromPage(document.getPage(page));
                assertTrue(pageText.contains("Operation / task"),
                        "table headers repeat on continuation page " + page);
                assertTrue(pageText.contains("Page " + page),
                        "page numbering is correct on page " + page);
                fullText.append(pageText).append('\n');
            }
            String normalizedText = fullText.toString().replaceAll("\\s+", " ");
            assertTrue(normalizedText.contains("100 Inspect equipment component"),
                    "the final operation is retained in the long report; pages=" + document.getNumberOfPages()
                            + ", extracted tail=" + normalizedText.substring(Math.max(0, normalizedText.length() - 1200)));
            assertTrue(normalizedText.contains("Thermal inspection confirmed stable bearing temperature"));
            assertTrue(normalizedText.contains("next scheduled maintenance window."),
                    "long cell content is retained through the final phrase");
        }
    }

    @Test
    void reportTableKeepsLegacyEqualWidthsAndAcceptsConfiguredPercentages() {
        var legacy = new ConfigurableWorkOrderReportRenderer.ReportTable("workOrder.executionTasks",
                "Operations", List.of("No.", "Operation", "Result", "Notes"), List.of());
        var configured = new ConfigurableWorkOrderReportRenderer.ReportTable("workOrder.executionTasks",
                "Operations", List.of("No.", "Operation", "Result", "Notes"), List.of(),
                List.of(10, 38, 18, 34));

        assertEquals(List.of(25, 25, 25, 25), legacy.columnWidths());
        assertEquals(List.of(10, 38, 18, 34), configured.columnWidths());
        assertThrows(IllegalArgumentException.class, () -> new ConfigurableWorkOrderReportRenderer.ReportTable(
                "workOrder.executionTasks", "Operations", List.of("No.", "Operation", "Result", "Notes"),
                List.of(), List.of(10, 38, 18, 33)));
    }

    private void writeVisualReviewPdf(String fileName, byte[] pdf) throws Exception {
        String outputDirectory = System.getProperty("qpm.report.visual.dir");
        if (outputDirectory == null || outputDirectory.isBlank()) return;
        Path directory = Path.of(outputDirectory);
        Files.createDirectories(directory);
        Files.write(directory.resolve(fileName), pdf);
    }
}
