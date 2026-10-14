package com.grash.controller;

import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.UserSettings;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.RoleType;
import com.grash.service.AssetDowntimeService;
import com.grash.service.AssetService;
import com.grash.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.HashSet;

import static com.grash.utils.Helper.setCurrentUser;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AssetDowntimeController.class)
@AutoConfigureMockMvc(addFilters = false)
class AssetDowntimeControllerTest extends AbstractControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AssetDowntimeService assetDowntimeService;
    @MockitoBean
    private AssetService assetService;
    @MockitoBean
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        Role role = Role.builder()
                .id(1L)
                .name("Asset viewer")
                .roleType(RoleType.ROLE_CLIENT)
                .viewPermissions(new HashSet<>(Collections.singletonList(PermissionEntity.ASSETS)))
                .build();
        Company company = new Company();
        company.setId(1L);
        user = new User();
        user.setId(1L);
        user.setRole(role);
        user.setCompany(company);
        user.setEnabled(true);
        user.setUserSettings(new UserSettings());
        setCurrentUser(user);
        when(userService.whoami(any())).thenReturn(user);
    }

    @Test
    void getByAsset_requiresCompanyScopedAssetAccessBeforeReturningHistory() throws Exception {
        doThrow(new CustomException("Not found", org.springframework.http.HttpStatus.NOT_FOUND))
                .when(assetService).checkAccessToAssetId(99L, user);

        mockMvc.perform(get("/asset-downtimes/asset/99"))
                .andExpect(status().isNotFound());

        verify(assetDowntimeService, never()).findByAsset(99L);
    }

    @Test
    void getByAsset_returnsHistoryAfterAssetAccessIsConfirmed() throws Exception {
        when(assetService.checkAccessToAssetId(1L, user)).thenReturn(new com.grash.model.Asset());
        when(assetDowntimeService.findByAsset(1L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/asset-downtimes/asset/1"))
                .andExpect(status().isOk());
    }
}
