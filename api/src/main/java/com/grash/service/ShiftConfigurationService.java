package com.grash.service;

import com.grash.dto.shiftConfiguration.ShiftConfigurationPatchDTO;
import com.grash.dto.shiftConfiguration.ShiftConfigurationPostDTO;
import com.grash.dto.shiftConfiguration.ShiftConfigurationShowDTO;
import com.grash.dto.shiftConfiguration.UserShiftDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.ShiftConfigurationMapper;
import com.grash.model.ShiftConfiguration;
import com.grash.model.ShiftDayConfiguration;
import com.grash.model.ShiftException;
import com.grash.model.User;
import com.grash.repository.ShiftConfigurationRepository;
import com.grash.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShiftConfigurationService {
    private final ShiftConfigurationRepository shiftConfigurationRepository;
    private final ShiftConfigurationMapper shiftConfigurationMapper;
    private final UserRepository userRepository;
    private final UserService userService;

    public List<UserShiftDTO> getUsersWithShiftConfig(Collection<Long> userIds, Long companyId) {
        List<User> users;
        if (userIds != null && !userIds.isEmpty()) {
            users = userRepository.findByIdInAndCompany_Id(userIds, companyId);
        } else {
            users = userService.findWorkersByCompany(companyId).stream()
                    .filter(User::isEnabled)
                    .toList();
        }
        return users.stream()
                .map(user -> {
                    UserShiftDTO dto = new UserShiftDTO();
                    dto.setUserId(user.getId());
                    dto.setFullName(user.getFullName());
                    dto.setShiftConfiguration(
                            user.getShiftConfiguration() != null
                                    ? shiftConfigurationMapper.toShowDto(user.getShiftConfiguration())
                                    : null);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public Optional<ShiftConfiguration> findById(Long id) {
        return shiftConfigurationRepository.findById(id);
    }


    @Transactional
    public ShiftConfiguration create(ShiftConfigurationPostDTO dto, User user) {
        ShiftConfiguration shiftConfiguration = shiftConfigurationMapper.fromPostDto(dto);
        ShiftConfiguration saved = shiftConfigurationRepository.save(shiftConfiguration);
        return saved;
    }

    @Transactional
    public ShiftConfiguration update(User user, ShiftConfigurationPatchDTO dto) {
        validateUniqueCapacityEntries(dto);
        Long companyId = user.getCompany() == null ? null : user.getCompany().getId();
        if (companyId == null) {
            throw new CustomException("User company not found", HttpStatus.NOT_FOUND);
        }
        User lockedUser = userRepository.findByIdAndCompany_IdForUpdate(user.getId(), companyId)
                .orElseThrow(() -> new CustomException("User not found", HttpStatus.NOT_FOUND));
        ShiftConfiguration shiftConfiguration = Objects.requireNonNullElseGet(lockedUser.getShiftConfiguration(),
                () -> {
                    ShiftConfiguration newShift = shiftConfigurationRepository.save(new ShiftConfiguration());
                    lockedUser.setShiftConfiguration(newShift);
                    return newShift;
                });
        return shiftConfigurationRepository.save(
                shiftConfigurationMapper.updateShiftConfiguration(shiftConfiguration, dto));

    }

    private void validateUniqueCapacityEntries(ShiftConfigurationPatchDTO dto) {
        if (dto.getDays() != null) {
            HashSet<java.time.DayOfWeek> days = new HashSet<>();
            for (ShiftDayConfiguration day : dto.getDays()) {
                if (day == null || day.getDayOfWeek() == null || !days.add(day.getDayOfWeek())) {
                    throw new CustomException("Weekly availability must contain each weekday at most once.",
                            HttpStatus.BAD_REQUEST);
                }
                validateCapacityWindow(day.isEnabled(), day.getStartTime(), day.getAvailabilityMinutes());
            }
        }
        if (dto.getExceptions() != null) {
            HashSet<java.time.LocalDate> dates = new HashSet<>();
            for (ShiftException exception : dto.getExceptions()) {
                if (exception == null || exception.getExceptionDate() == null
                        || !dates.add(exception.getExceptionDate())) {
                    throw new CustomException("Availability exceptions must contain each date at most once.",
                            HttpStatus.BAD_REQUEST);
                }
                validateCapacityWindow(exception.isEnabled(), exception.getStartTime(),
                        exception.getAvailabilityMinutes());
            }
        }
    }

    private void validateCapacityWindow(boolean enabled, String startTime, int availabilityMinutes) {
        if (!enabled || availabilityMinutes <= 0) return;
        if (availabilityMinutes > 24 * 60 || startTime == null) {
            throw new CustomException("Daily availability requires a valid start time and cannot exceed 24 hours.",
                    HttpStatus.BAD_REQUEST);
        }
        try {
            java.time.LocalTime start = java.time.LocalTime.parse(startTime);
            int startMinuteOfDay = start.getHour() * 60 + start.getMinute();
            if (startMinuteOfDay + availabilityMinutes > 24 * 60) {
                throw new CustomException("Daily availability must end by midnight.", HttpStatus.BAD_REQUEST);
            }
        } catch (java.time.format.DateTimeParseException exception) {
            throw new CustomException("Daily availability requires a valid start time.", HttpStatus.BAD_REQUEST);
        }
    }

    @Transactional
    public void delete(Long id) {
        shiftConfigurationRepository.deleteById(id);
    }

    public ShiftConfiguration save(ShiftConfiguration shiftConfiguration) {
        return shiftConfigurationRepository.save(shiftConfiguration);
    }
}
