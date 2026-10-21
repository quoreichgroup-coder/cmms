package com.grash.service;

import com.grash.dto.workload.WorkloadScheduleDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.WorkOrderMapper;
import com.grash.repository.WorkOrderRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class WorkloadServiceTest {
    @InjectMocks
    private WorkloadService workloadService;

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private UserService userService;
    @Mock
    private WorkOrderMapper workOrderMapper;
    @Mock
    private WorkOrderService workOrderService;

    @Test
    void rejectsNonPositiveAndNonFiniteDurationsBeforeLoadingWorkOrder() {
        for (double invalidDuration : new double[] { -1, 0, Double.NaN, Double.POSITIVE_INFINITY }) {
            WorkloadScheduleDTO dto = new WorkloadScheduleDTO();
            dto.setEstimatedDuration(invalidDuration);

            CustomException error = assertThrows(CustomException.class,
                    () -> workloadService.scheduleWorkOrder(42L, dto, null));

            assertEquals(HttpStatus.BAD_REQUEST, error.getHttpStatus());
        }

        verifyNoInteractions(workOrderRepository, userService, workOrderMapper, workOrderService);
    }

    @Test
    void requestDtoRejectsNonPositiveAssignmentAndDurationButAllowsOmittedDuration() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        WorkloadScheduleDTO invalidDto = new WorkloadScheduleDTO();
        invalidDto.setPrimaryUserId(0L);
        invalidDto.setEstimatedDuration(-1d);

        var violations = validator.validate(invalidDto);
        assertEquals(2, violations.size());

        WorkloadScheduleDTO validDto = new WorkloadScheduleDTO();
        validDto.setPrimaryUserId(42L);
        assertEquals(0, validator.validate(validDto).size());
    }
}
