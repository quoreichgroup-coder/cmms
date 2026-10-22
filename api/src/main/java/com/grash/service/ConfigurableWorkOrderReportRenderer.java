package com.grash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.factory.StorageServiceFactory;
import com.grash.utils.PdfReportUtils;
import com.itextpdf.html2pdf.HtmlConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;

/** Renders only server-resolved values selected by a validated, published template. */
@Component
@RequiredArgsConstructor
public class ConfigurableWorkOrderReportRenderer {
    private final SpringTemplateEngine templateEngine;
    private final StorageServiceFactory storageServiceFactory;

    public byte[] render(JsonNode configuration,
                         List<ReportRow> rows,
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
        context.setVariable("rows", rows);
        context.setVariable("companyName", companyContext.companyName());
        context.setVariable("legalName", companyContext.legalName());
        context.setVariable("registeredAddress", companyContext.registeredAddress());
        context.setVariable("registrationNumber", companyContext.registrationNumber());
        context.setVariable("taxNumber", companyContext.taxNumber());
        context.setVariable("phone", companyContext.phone());
        context.setVariable("email", companyContext.email());
        context.setVariable("siteName", companyContext.siteName());
        context.setVariable("logoStoragePath", logoStoragePath);
        context.setVariable("accentColor", PdfReportUtils.resolveCssColor(accentColor) == null
                ? "#2F5BEA" : PdfReportUtils.resolveCssColor(accentColor));
        context.setVariable("showPageNumbers", configuration.path("options").path("showPageNumbers").asBoolean());
        context.setVariable("repeatTableHeader", configuration.path("options").path("repeatTableHeader").asBoolean());
        context.setVariable("styleClass", "COMPACT".equals(configuration.path("style").asText())
                ? "compact" : "classic");
        boolean french = companyContext.language() != null
                && "FR".equalsIgnoreCase(companyContext.language().name());
        boolean requestReport = "REQUEST".equals(configuration.path("documentType").asText());
        context.setVariable("reportTitle", requestReport
                ? (french ? "Rapport de demande de maintenance" : "Maintenance Request Report")
                : (french ? "Rapport d’ordre de travail" : "Work Order Report"));
        context.setVariable("reportSubtitle", french
                ? "Émis depuis un modèle QPM publié." : "Issued from the published QPM report template.");
        context.setVariable("fieldHeader", french ? "Champ" : "Field");
        context.setVariable("valueHeader", french ? "Valeur" : "Value");

        String html = templateEngine.process("work-order-template-report.html", context);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        Function<String, byte[]> imageLoader = storageServiceFactory.getStorageService()::download;
        HtmlConverter.convertToPdf(html, output, PdfReportUtils.createReportConverterProperties(imageLoader));
        return output.toByteArray();
    }

    public record ReportRow(String key, String label, String value) { }
}
