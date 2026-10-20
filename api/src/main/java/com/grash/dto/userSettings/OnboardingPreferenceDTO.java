package com.grash.dto.userSettings;

import com.grash.model.enums.OnboardingStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OnboardingPreferenceDTO {
    @Min(1)
    private int version;

    @NotNull
    private OnboardingStatus status;
}
