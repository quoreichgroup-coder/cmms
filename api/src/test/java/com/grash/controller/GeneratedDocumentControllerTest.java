package com.grash.controller;

import com.grash.model.User;
import com.grash.model.Role;
import com.grash.model.enums.RoleType;
import com.grash.service.GeneratedDocumentService;
import com.grash.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static com.grash.utils.Helper.setCurrentUser;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

@WebMvcTest(GeneratedDocumentController.class)
@AutoConfigureMockMvc(addFilters = false)
class GeneratedDocumentControllerTest extends AbstractControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private GeneratedDocumentService generatedDocumentService;
    @MockitoBean private UserService userService;
    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(11L);
        user.setRole(Role.builder().roleType(RoleType.ROLE_CLIENT).build());
        setCurrentUser(user);
        when(userService.whoami(any())).thenReturn(user);
    }

    @Test
    void previewDataBindsRequestedFieldsAndReturnsOnlyResolvedValues() throws Exception {
        when(generatedDocumentService.previewWorkOrderReportData(eq(42L), eq(List.of("workOrder.title")), eq(user)))
                .thenReturn(Map.of("workOrder.title", "Inspect pump"));

        mockMvc.perform(post("/work-orders/42/report/preview-data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fields\":[\"workOrder.title\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['workOrder.title']").value("Inspect pump"));

        verify(generatedDocumentService).previewWorkOrderReportData(
                eq(42L), eq(List.of("workOrder.title")), eq(user));
    }

    @Test
    void previewDataRejectsEmptyFieldSelectionBeforeCallingService() throws Exception {
        mockMvc.perform(post("/work-orders/42/report/preview-data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fields\":[]}"))
                .andExpect(status().isBadRequest());

        verify(generatedDocumentService, never()).previewWorkOrderReportData(any(), any(), any());
    }

    @Test
    void requestPreviewDataBindsOnlyExplicitFields() throws Exception {
        when(generatedDocumentService.previewRequestReportData(eq(55L), eq(List.of("request.title")), eq(user)))
                .thenReturn(Map.of("request.title", "Inspect pump"));

        mockMvc.perform(post("/requests/55/report/preview-data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fields\":[\"request.title\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['request.title']").value("Inspect pump"));

        verify(generatedDocumentService).previewRequestReportData(eq(55L), eq(List.of("request.title")), eq(user));
    }

    @Test
    void requestPreviewDataRejectsEmptyFieldSelectionBeforeCallingService() throws Exception {
        mockMvc.perform(post("/requests/55/report/preview-data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fields\":[]}"))
                .andExpect(status().isBadRequest());

        verify(generatedDocumentService, never()).previewRequestReportData(any(), any(), any());
    }

    @Test
    void requestFieldCatalogUsesAuthenticatedUser() throws Exception {
        when(generatedDocumentService.listRequestReportFields(55L, user)).thenReturn(List.of(
                new com.grash.dto.ReportFieldDefinitionDTO("request.title", "report.field.request.title",
                        "request", "string", false, false, "workOrderInformation", true)));

        mockMvc.perform(get("/requests/55/report/fields"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].key").value("request.title"))
                .andExpect(jsonPath("$[0].valueSupported").value(true));

        verify(generatedDocumentService).listRequestReportFields(55L, user);
    }

    @Test
    void requestTemplatePreviewIsPrivateAndDoesNotExposeDraftConfiguration() throws Exception {
        when(generatedDocumentService.previewRequestReportFromTemplate(55L, 9L, user))
                .thenReturn(new byte[]{'%', 'P', 'D', 'F'});

        mockMvc.perform(post("/requests/55/report/preview-template/9"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(new byte[]{'%', 'P', 'D', 'F'}))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Cache-Control", "private, no-store"));

        verify(generatedDocumentService).previewRequestReportFromTemplate(55L, 9L, user);
    }

    @Test
    void requestDocumentHistoryUsesAuthenticatedUser() throws Exception {
        when(generatedDocumentService.listRequestReports(55L, user)).thenReturn(List.of());

        mockMvc.perform(get("/requests/55/documents"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(generatedDocumentService).listRequestReports(55L, user);
    }

    @Test
    void templatePreviewReturnsPrivatePdfWithoutCreatingAnArchive() throws Exception {
        when(generatedDocumentService.previewWorkOrderReportFromTemplate(42L, 9L, user))
                .thenReturn(new byte[]{'%', 'P', 'D', 'F'});

        mockMvc.perform(post("/work-orders/42/report/preview-template/9"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(new byte[]{'%', 'P', 'D', 'F'}))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Cache-Control", "private, no-store"));

        verify(generatedDocumentService).previewWorkOrderReportFromTemplate(42L, 9L, user);
    }

    @Test
    void reportTemplateOptionsExposeOnlyTheSafePickerDto() throws Exception {
        when(generatedDocumentService.listPublishedWorkOrderReportTemplates(42L, user))
                .thenReturn(List.of(new com.grash.dto.PublishedReportTemplateOptionDTO(
                        9L, "Landscape WO Report", 3, true)));

        mockMvc.perform(get("/work-orders/42/report/templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(9))
                .andExpect(jsonPath("$[0].name").value("Landscape WO Report"))
                .andExpect(jsonPath("$[0].versionNumber").value(3))
                .andExpect(jsonPath("$[0].isDefault").value(true))
                .andExpect(jsonPath("$[0].draftConfiguration").doesNotExist());
    }
}
