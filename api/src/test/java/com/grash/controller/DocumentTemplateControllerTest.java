package com.grash.controller;

import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.RoleType;
import com.grash.service.DocumentTemplateService;
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

import static com.grash.utils.Helper.setCurrentUser;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DocumentTemplateController.class)
@AutoConfigureMockMvc(addFilters = false)
class DocumentTemplateControllerTest extends AbstractControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private DocumentTemplateService documentTemplateService;
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
    void requestPreviewStreamsPrivatePdfForTheSelectedTemplateAndRequest() throws Exception {
        byte[] pdf = new byte[]{'%', 'P', 'D', 'F'};
        when(generatedDocumentService.previewRequestDocumentTemplate(9L, 55L, user)).thenReturn(pdf);

        mockMvc.perform(post("/document-templates/9/preview-request-pdf").param("requestId", "55"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(pdf))
                .andExpect(header().string("Cache-Control", "private, no-store"));

        verify(generatedDocumentService).previewRequestDocumentTemplate(9L, 55L, user);
    }
}
