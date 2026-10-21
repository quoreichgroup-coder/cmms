package com.grash.controller;

import com.grash.mapper.WebhookEndpointMapper;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.RoleType;
import com.grash.service.UserService;
import com.grash.service.WebhookEndpointService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static com.grash.utils.Helper.setCurrentUser;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WebhookEndpointController.class)
@AutoConfigureMockMvc(addFilters = false)
class WebhookEndpointControllerAuthorizationTest extends AbstractControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private WebhookEndpointService webhookEndpointService;

    @MockitoBean
    private WebhookEndpointMapper webhookEndpointMapper;

    @MockitoBean
    private UserService userService;

    @BeforeEach
    void setUp() {
        Role role = new Role();
        role.setRoleType(RoleType.ROLE_CLIENT);
        role.setViewPermissions(Set.of());
        User userWithoutSettingsView = new User();
        userWithoutSettingsView.setRole(role);
        setCurrentUser(userWithoutSettingsView);
        when(userService.whoami(any())).thenReturn(userWithoutSettingsView);
    }

    @Test
    void listingWebhooksWithoutSettingsViewIsForbiddenBeforeCallingService() throws Exception {
        mockMvc.perform(get("/webhook-endpoints"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(webhookEndpointService, webhookEndpointMapper);
    }
}
