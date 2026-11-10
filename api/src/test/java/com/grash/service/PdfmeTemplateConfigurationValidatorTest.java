package com.grash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.grash.exception.CustomException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PdfmeTemplateConfigurationValidatorTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final DocumentDataProvider provider = mock(DocumentDataProvider.class);
    private final DocumentDataProviderRegistry registry = mock(DocumentDataProviderRegistry.class);
    private final PdfmeTemplateConfigurationValidator validator;

    PdfmeTemplateConfigurationValidatorTest() {
        when(registry.require("WORK_ORDER")).thenReturn(provider);
        when(provider.supports("workOrder.title")).thenReturn(true);
        when(provider.supports("workOrder.executionTasks")).thenReturn(true);
        when(provider.supports("company.logo")).thenReturn(true);
        validator = new PdfmeTemplateConfigurationValidator(registry);
    }

    @Test
    void acceptsSupportedA4WorkOrderTemplateAndReturnsBindings() throws Exception {
        JsonNode configuration = mapper.readTree("""
                {"pdfmeVersion":"6.2.8","basePdf":{"width":297,"height":210,"padding":[8,8,8,8]},
                 "schemas":[[
                   {"name":"static:title","type":"text","content":"Maintenance Job Card","position":{"x":10,"y":10},"width":120,"height":10,"fontSize":14},
                   {"name":"workOrder.title","type":"text","content":"Sample work","position":{"x":10,"y":25},"width":120,"height":10,"fontSize":9}
                 ]]}
                """);

        JsonNode validated = validator.validate(configuration, "WORK_ORDER", "WORK_ORDER");

        assertEquals(configuration, validated);
        assertEquals(List.of("workOrder.title"), validator.dataBindings(validated));
    }

    @Test
    void rejectsExternalBasePdfAndNonWorkOrderTypes() throws Exception {
        JsonNode remoteBase = mapper.readTree("""
                {"pdfmeVersion":"6.2.8","basePdf":"https://example.invalid/base.pdf","schemas":[[
                {"name":"workOrder.title","type":"text","position":{"x":1,"y":1},"width":20,"height":8}]]}
                """);
        assertThrows(CustomException.class, () -> validator.validate(remoteBase, "WORK_ORDER", "WORK_ORDER"));

        JsonNode allowed = validConfiguration();
        assertThrows(CustomException.class, () -> validator.validate(allowed, "REQUEST", "REQUEST"));
    }

    @Test
    void rejectsUnknownBindingsDuplicateNamesAndUnsupportedPdfmeVersion() throws Exception {
        JsonNode unknown = mapper.readTree(validConfiguration().toString().replace("workOrder.title", "user.password"));
        assertThrows(CustomException.class, () -> validator.validate(unknown, "WORK_ORDER", "WORK_ORDER"));

        JsonNode duplicate = mapper.readTree("""
                {"pdfmeVersion":"6.2.8","basePdf":{"width":210,"height":297,"padding":[8,8,8,8]},"schemas":[[
                {"name":"workOrder.title","type":"text","position":{"x":1,"y":1},"width":20,"height":8},
                {"name":"workOrder.title","type":"text","position":{"x":1,"y":12},"width":20,"height":8}]]}
                """);
        assertThrows(CustomException.class, () -> validator.validate(duplicate, "WORK_ORDER", "WORK_ORDER"));

        JsonNode newerVersion = mapper.readTree(validConfiguration().toString().replace("6.2.8", "6.3.0"));
        assertThrows(CustomException.class, () -> validator.validate(newerVersion, "WORK_ORDER", "WORK_ORDER"));
    }

    @Test
    void permitsTheSameBindingOnDifferentPagesButResolvesItOnlyOnce() throws Exception {
        JsonNode configuration = validConfiguration();
        ArrayNode pages = (ArrayNode) configuration.get("schemas");
        pages.add(pages.get(0).deepCopy());

        JsonNode validated = validator.validate(configuration, "WORK_ORDER", "WORK_ORDER");

        assertEquals(List.of("workOrder.title"), validator.dataBindings(validated));
    }

    @Test
    void acceptsTheCompanyLogoOnlyAsADataBoundImage() throws Exception {
        JsonNode configuration = mapper.readTree("""
                {"pdfmeVersion":"6.2.8","basePdf":{"width":210,"height":297,"padding":[8,8,8,8]},"schemas":[[
                {"name":"company.logo","type":"image","content":"","position":{"x":1,"y":1},"width":20,"height":20}]]}
                """);

        JsonNode validated = validator.validate(configuration, "WORK_ORDER", "WORK_ORDER");

        assertEquals(List.of("company.logo"), validator.dataBindings(validated));
        JsonNode invalid = mapper.readTree(configuration.toString().replace("company.logo", "workOrder.title"));
        assertThrows(CustomException.class, () -> validator.validate(invalid, "WORK_ORDER", "WORK_ORDER"));
    }

    private JsonNode validConfiguration() throws Exception {
        return mapper.readTree("""
                {"pdfmeVersion":"6.2.8","basePdf":{"width":210,"height":297,"padding":[8,8,8,8]},"schemas":[[
                {"name":"workOrder.title","type":"text","position":{"x":1,"y":1},"width":20,"height":8}] ]}
                """);
    }

    private PdfmeTemplateConfigurationValidator procurementValidator(String providerCode, String... fields) {
        DocumentDataProvider procurement = mock(DocumentDataProvider.class);
        DocumentDataProviderRegistry procurementRegistry = mock(DocumentDataProviderRegistry.class);
        when(procurementRegistry.require(providerCode)).thenReturn(procurement);
        for (String field : fields) when(procurement.supports(field)).thenReturn(true);
        return new PdfmeTemplateConfigurationValidator(procurementRegistry);
    }

    @Test
    void acceptsAPurchaseOrderLayoutWithLogoAndLineTable() throws Exception {
        PdfmeTemplateConfigurationValidator poValidator = procurementValidator("PURCHASE_ORDER",
                "company.logo", "purchaseOrder.number", "purchaseOrder.lines");
        JsonNode configuration = mapper.readTree("""
                {"pdfmeVersion":"6.2.8","basePdf":{"width":210,"height":297,"padding":[8,8,8,8]},"schemas":[[
                {"name":"company.logo","type":"image","position":{"x":10,"y":8},"width":30,"height":15},
                {"name":"purchaseOrder.number","type":"text","position":{"x":120,"y":10},"width":70,"height":8},
                {"name":"purchaseOrder.lines","type":"table","position":{"x":10,"y":40},"width":190,"height":60,
                 "head":["Part","Qty","Unit price","Total"],
                 "columnBindings":["part","quantity","unitPrice","lineTotal"]}]]}
                """);

        JsonNode validated = poValidator.validate(configuration, "PURCHASE_ORDER", "PURCHASE_ORDER");

        assertEquals(List.of("company.logo", "purchaseOrder.number", "purchaseOrder.lines"),
                poValidator.dataBindings(validated));
    }

    @Test
    void procurementTemplatesRejectWorkOrderTablesSignaturesAndUnknownColumns() throws Exception {
        PdfmeTemplateConfigurationValidator prValidator = procurementValidator("PURCHASE_REQUISITION",
                "purchaseRequisition.lines", "workOrder.executionTasks", "workOrder.signature");
        String page = """
                {"pdfmeVersion":"6.2.8","basePdf":{"width":210,"height":297,"padding":[8,8,8,8]},"schemas":[[%s]]}""";
        JsonNode workOrderTable = mapper.readTree(page.formatted("""
                {"name":"workOrder.executionTasks","type":"table","position":{"x":10,"y":40},"width":190,"height":60,"head":["Task"]}"""));
        JsonNode signature = mapper.readTree(page.formatted("""
                {"name":"workOrder.signature","type":"signature","position":{"x":10,"y":40},"width":60,"height":20}"""));
        JsonNode unknownColumn = mapper.readTree(page.formatted("""
                {"name":"purchaseRequisition.lines","type":"table","position":{"x":10,"y":40},"width":190,"height":60,
                 "head":["Part","Price"],"columnBindings":["part","unitPrice"]}"""));

        assertThrows(CustomException.class, () -> prValidator.validate(workOrderTable, "PURCHASE_REQUISITION", "PURCHASE_REQUISITION"));
        assertThrows(CustomException.class, () -> prValidator.validate(signature, "PURCHASE_REQUISITION", "PURCHASE_REQUISITION"));
        assertThrows(CustomException.class, () -> prValidator.validate(unknownColumn, "PURCHASE_REQUISITION", "PURCHASE_REQUISITION"));
    }
}
