package com.grash.service;

import com.grash.dto.MaintenanceTaskListConfigurationDTO;
import com.grash.exception.CustomException;
import com.grash.model.MaintenanceTaskListConfiguration;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.MaintenanceTaskListConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MaintenanceTaskListConfigurationService {
    private final MaintenanceTaskListConfigurationRepository repository;
    private final CompanyConfigurationAuditService auditService;

    @Transactional(readOnly = true)
    public MaintenanceTaskListConfigurationDTO get(User user) {
        requireSettingsView(user);
        MaintenanceTaskListConfiguration config = repository.findByCompany_Id(user.getCompany().getId())
                .orElseGet(MaintenanceTaskListConfiguration::new);
        return toDto(config);
    }

    @Transactional
    public MaintenanceTaskListConfigurationDTO save(User user, MaintenanceTaskListConfigurationDTO dto) {
        requireSettingsEdit(user);
        Optional<MaintenanceTaskListConfiguration> existing = repository.findByCompany_Id(user.getCompany().getId());
        boolean creating = existing.isEmpty();
        MaintenanceTaskListConfiguration config = existing.orElseGet(MaintenanceTaskListConfiguration::new);
        List<String> changed = changedFields(config, dto);
        if (creating && changed.isEmpty()) {
            changed = List.of("operationNumberStart", "operationNumberIncrement", "defaultWorkers",
                    "defaultWorkUnit", "defaultDurationUnit", "workCenterCatalog", "controlKeyCatalog");
        }
        config.setCompany(user.getCompany());
        config.setOperationNumberStart(dto.operationNumberStart());
        config.setOperationNumberIncrement(dto.operationNumberIncrement());
        config.setDefaultWorkers(dto.defaultWorkers());
        config.setDefaultWorkUnit(dto.defaultWorkUnit().trim().toUpperCase(Locale.ROOT));
        config.setDefaultDurationUnit(dto.defaultDurationUnit().trim().toUpperCase(Locale.ROOT));
        config.setWorkCenterCatalog(normalizeCatalog(dto.workCenterCatalog(), "workCenterCatalog"));
        config.setControlKeyCatalog(normalizeCatalog(dto.controlKeyCatalog(), "controlKeyCatalog"));
        MaintenanceTaskListConfiguration saved = repository.save(config);
        auditService.record(user.getCompany(), user, "MAINTENANCE_TASK_LIST_CONFIGURATION",
                saved.getId(), creating ? "CREATED" : "UPDATED", changed);
        return toDto(saved);
    }

    private List<String> changedFields(MaintenanceTaskListConfiguration current,
                                       MaintenanceTaskListConfigurationDTO next) {
        List<String> changed = new ArrayList<>();
        if (current.getOperationNumberStart() != next.operationNumberStart()) changed.add("operationNumberStart");
        if (current.getOperationNumberIncrement() != next.operationNumberIncrement()) changed.add("operationNumberIncrement");
        if (current.getDefaultWorkers() == null || current.getDefaultWorkers().compareTo(next.defaultWorkers()) != 0) {
            changed.add("defaultWorkers");
        }
        if (!sameUnit(current.getDefaultWorkUnit(), next.defaultWorkUnit())) changed.add("defaultWorkUnit");
        if (!sameUnit(current.getDefaultDurationUnit(), next.defaultDurationUnit())) changed.add("defaultDurationUnit");
        if (!Objects.equals(nullToEmpty(current.getWorkCenterCatalog()), normalizeCatalog(next.workCenterCatalog(), "workCenterCatalog"))) changed.add("workCenterCatalog");
        if (!Objects.equals(nullToEmpty(current.getControlKeyCatalog()), normalizeCatalog(next.controlKeyCatalog(), "controlKeyCatalog"))) changed.add("controlKeyCatalog");
        return changed;
    }

    private boolean sameUnit(String current, String next) {
        return current != null && next != null && current.equalsIgnoreCase(next.trim());
    }

    private MaintenanceTaskListConfigurationDTO toDto(MaintenanceTaskListConfiguration config) {
        return new MaintenanceTaskListConfigurationDTO(config.getOperationNumberStart(),
                config.getOperationNumberIncrement(), config.getDefaultWorkers(), config.getDefaultWorkUnit(),
                config.getDefaultDurationUnit(), nullToEmpty(config.getWorkCenterCatalog()), nullToEmpty(config.getControlKeyCatalog()));
    }

    private String normalizeCatalog(String raw, String field) {
        if (raw == null || raw.isBlank()) return "";
        java.util.LinkedHashMap<String, String> unique = new java.util.LinkedHashMap<>();
        for (String line : raw.split("\\R")) {
            String value = line.trim();
            if (value.isEmpty()) continue;
            if (value.length() > 120) throw new CustomException(field + "_entry_too_long", HttpStatus.BAD_REQUEST);
            if (unique.putIfAbsent(value.toLowerCase(Locale.ROOT), value) != null) {
                throw new CustomException(field + "_duplicate_entry", HttpStatus.BAD_REQUEST);
            }
            if (unique.size() > 100) throw new CustomException(field + "_entry_limit_exceeded", HttpStatus.BAD_REQUEST);
        }
        return String.join("\n", unique.values());
    }

    private String nullToEmpty(String value) { return value == null ? "" : value; }

    private void requireSettingsView(User user) {
        if (user.isOwnsCompany()) return;
        if (user.getRole() == null || !user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
    }

    private void requireSettingsEdit(User user) {
        requireSettingsView(user);
        if (!user.isOwnsCompany() && !user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
    }
}
