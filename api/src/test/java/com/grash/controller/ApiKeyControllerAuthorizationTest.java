package com.grash.controller;

import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.RoleType;
import com.grash.mapper.ApiKeyMapper;
import com.grash.service.ApiKeyService;
import com.grash.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static com.grash.utils.Helper.setCurrentUser;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApiKeyController.class)
@AutoConfigureMockMvc(addFilters = false)
class ApiKeyControllerAuthorizationTest extends AbstractControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ApiKeyService apiKeyService;

    @MockitoBean
    private ApiKeyMapper apiKeyMapper;

    @MockitoBean
    private UserService userService;

    private User userWithoutSettingsView;

    @BeforeEach
    void setUp() {
        Role role = new Role();
        role.setRoleType(RoleType.ROLE_CLIENT);
        role.setViewPermissions(Set.of());
        userWithoutSettingsView = new User();
        userWithoutSettingsView.setRole(role);
        setCurrentUser(userWithoutSettingsView);
        when(userService.whoami(org.mockito.ArgumentMatchers.any()))
                .thenReturn(userWithoutSettingsView);
    }

    @Test
    void searchWithoutSettingsViewIsForbiddenBeforeCallingService() throws Exception {
        mockMvc.perform(post("/api-keys/search")
                        .contentType("application/json")
                        .content("{\"active\":true}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(apiKeyService);
    }

    @Test
    void getByIdWithoutSettingsViewIsForbiddenBeforeLookingUpKey() throws Exception {
        mockMvc.perform(get("/api-keys/42"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(apiKeyService);
    }
}
