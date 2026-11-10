package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PlanFeatures;
import com.grash.repository.PreventiveMaintenanceMeterCallRepository;
import com.grash.repository.ReadingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReadingServiceTest {
    @Mock private ReadingRepository readingRepository;
    @Mock private PreventiveMaintenanceMeterCallRepository meterCallRepository;
    @Mock private MeterService meterService;
    @Mock private com.grash.repository.ScheduleRepository scheduleRepository;
    @InjectMocks private ReadingService readingService;

    private User user;
    private Meter meter;
    private Reading reading;

    @BeforeEach
    void setUp() {
        readingService.setDeps(meterService);
        SubscriptionPlan plan = SubscriptionPlan.builder().features(new HashSet<>(Set.of(PlanFeatures.METER))).build();
        Company company = new Company();
        company.setId(1L);
        company.setSubscription(Subscription.builder().subscriptionPlan(plan).build());
        user = new User();
        user.setId(5L);
        user.setCompany(company);
        meter = new Meter();
        meter.setId(3L);
        reading = new Reading();
        reading.setId(9L);
        reading.setMeter(meter);
        lenient().when(readingRepository.findById(9L)).thenReturn(Optional.of(reading));
        lenient().when(meterService.getById(3L, user)).thenReturn(meter);
    }

    private void giveMeterEditRights() {
        user.setRole(Role.builder().editOtherPermissions(new HashSet<>(Set.of(PermissionEntity.METERS))).build());
    }

    @Test
    void viewerCannotDeleteRecordedReading() {
        user.setRole(Role.builder().editOtherPermissions(new HashSet<>()).build());

        CustomException ex = assertThrows(CustomException.class, () -> readingService.deleteByIdAndUser(9L, user));

        assertEquals(HttpStatus.FORBIDDEN, ex.getHttpStatus());
        verify(readingRepository, never()).deleteById(anyLong());
    }

    @Test
    void readingThatTriggeredPreventiveMaintenanceCannotBeDeleted() {
        giveMeterEditRights();
        when(meterCallRepository.existsByReading_Id(9L)).thenReturn(true);

        CustomException ex = assertThrows(CustomException.class, () -> readingService.deleteByIdAndUser(9L, user));

        assertEquals(HttpStatus.CONFLICT, ex.getHttpStatus());
        verify(readingRepository, never()).deleteById(anyLong());
    }

    @Test
    void editorCanDeleteUnlinkedReading() {
        giveMeterEditRights();
        when(meterCallRepository.existsByReading_Id(9L)).thenReturn(false);

        readingService.deleteByIdAndUser(9L, user);

        verify(readingRepository).deleteById(9L);
    }

    private void givenPreviousReading(double value) {
        CompanySettings settings = new CompanySettings();
        GeneralPreferences preferences = new GeneralPreferences(settings);
        preferences.setTimeZone("UTC");
        settings.setGeneralPreferences(preferences);
        meter.setCompany(user.getCompany());
        user.getCompany().setCompanySettings(settings);
        Reading last = new Reading();
        last.setValue(value);
        last.setCreatedAt(new java.util.Date(System.currentTimeMillis() - 86_400_000L));
        when(readingRepository.findFirstByMeter_IdOrderByCreatedAtDesc(3L)).thenReturn(Optional.of(last));
    }

    @Test
    void lowerReadingOnAMeterThatDrivesAPreventiveMaintenanceIsRejected() {
        givenPreviousReading(1200);
        when(scheduleRepository.existsByMeter_Id(3L)).thenReturn(true);
        Reading request = new Reading();
        request.setMeter(meter);
        request.setValue(120);

        CustomException ex = assertThrows(CustomException.class, () -> readingService.create(request, user));

        assertEquals(HttpStatus.CONFLICT, ex.getHttpStatus());
        assertEquals("reading_lower_than_previous", ex.getMessage());
        verify(readingRepository, never()).save(any());
    }
}
