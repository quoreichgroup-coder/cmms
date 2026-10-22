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

        byte[] pdf = renderer.render(configuration, List.of(new ConfigurableWorkOrderReportRenderer.ReportRow(
                "request.title", "Request title", "Inspect transfer pump")), context, null, "#2F5BEA");

        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            String pageText = PdfTextExtractor.getTextFromPage(document.getPage(1));
            assertTrue(pageText.contains("Maintenance Request Report"));
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
                 "visibleFields":["workOrder.title","asset.name"],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        var context = new DocumentContextResolver.DocumentContext("QPM Test Company", "QPM Legal SARL",
                "Dakar", null, "Industrial Zone", "RC-1", "NIF-2", "XOF", null, "Africa/Dakar",
                Language.EN, Locale.ENGLISH, 3L, "Plant 3");

        byte[] pdf = renderer.render(configuration, List.of(
                new ConfigurableWorkOrderReportRenderer.ReportRow("workOrder.title", "Title", "Pump inspection <script>"),
                new ConfigurableWorkOrderReportRenderer.ReportRow("asset.name", "Equipment", "P-301")),
                context, null, "#2F5BEA");

        assertTrue(pdf.length > 500);
        assertEquals('%', (char) pdf[0]);
        assertEquals('P', (char) pdf[1]);
        assertEquals('D', (char) pdf[2]);
        assertEquals('F', (char) pdf[3]);
        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            assertEquals(1, document.getNumberOfPages());
            String pageText = PdfTextExtractor.getTextFromPage(document.getPage(1));
            assertTrue(pageText.contains("Pump inspection <script>"), "field value is rendered as plain text");
            assertTrue(pageText.contains("Page 1"), "configured page numbering appears in the PDF");
        }
    }
}
