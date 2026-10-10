package com.grash.service;

import com.grash.dto.GeneralPreferencesPatchDTO;
import com.grash.mapper.GeneralPreferencesMapper;
import com.grash.model.Company;
import com.grash.model.CompanySettings;
import com.grash.model.GeneralPreferences;
import com.grash.model.User;
import com.grash.model.enums.Language;
import com.grash.repository.GeneralPreferencesRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeneralPreferencesServiceTest {
    @InjectMocks private GeneralPreferencesService service;
    @Mock private GeneralPreferencesRepository repository;
    @Mock private GeneralPreferencesMapper mapper;
    @Mock private CacheService cacheService;

    @Test
    void changingCompanyLanguageDoesNotOverwritePersonalLanguage() {
        GeneralPreferences preferences = new GeneralPreferences();
        preferences.setId(10L);
        Company company = new Company();
        company.setId(2L);
        CompanySettings settings = new CompanySettings(company);
        preferences.setCompanySettings(settings);
        User user = new User();
        user.setLanguage(Language.FR);
        GeneralPreferencesPatchDTO patch = GeneralPreferencesPatchDTO.builder().language(Language.EN).build();

        when(repository.existsById(10L)).thenReturn(true);
        when(repository.findById(10L)).thenReturn(Optional.of(preferences));
        when(mapper.updateGeneralPreferences(preferences, patch)).thenReturn(preferences);
        when(repository.save(preferences)).thenReturn(preferences);

        service.update(10L, patch, user);

        assertEquals(Language.FR, user.getLanguage());
        verify(cacheService).evictCompanyUsersFromCache(2L);
    }
}
