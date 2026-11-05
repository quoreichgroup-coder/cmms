package com.grash.controller;

import com.grash.dto.MaintenanceTaskListDTO;
import com.grash.dto.MaintenanceTaskListConfigurationDTO;
import com.grash.dto.MaintenanceTaskListDefaultsDTO;
import com.grash.dto.MaintenanceTaskListGroupOptionDTO;
import com.grash.dto.MaintenanceTaskListOptionDTO;
import com.grash.dto.MaintenanceTaskListReferenceObjectDTO;
import com.grash.dto.SuccessResponse;
import com.grash.exception.CustomException;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.security.CurrentUser;
import com.grash.service.MaintenanceTaskListService;
import com.grash.service.MaintenanceTaskListConfigurationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.http.HttpHeaders;
import java.io.InputStreamReader;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/maintenance-task-lists")
@RequiredArgsConstructor
public class MaintenanceTaskListController {
    private final MaintenanceTaskListService taskListService;
    private final MaintenanceTaskListConfigurationService configurationService;

    @GetMapping("/configuration")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public MaintenanceTaskListConfigurationDTO configuration(@CurrentUser User user) {
        return configurationService.get(user);
    }

    @PutMapping("/configuration")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public MaintenanceTaskListConfigurationDTO updateConfiguration(
            @Valid @RequestBody MaintenanceTaskListConfigurationDTO configuration, @CurrentUser User user) {
        return configurationService.save(user, configuration);
    }

    @GetMapping
    @PreAuthorize("permitAll()")
    public Page<MaintenanceTaskListDTO> search(@RequestParam(defaultValue = "") String query,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "25") int size,
                                                @CurrentUser User user) {
        return taskListService.search(user, query, page, size);
    }

    @GetMapping("/options")
    @PreAuthorize("permitAll()")
    public Page<MaintenanceTaskListOptionDTO> searchActiveOptions(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @CurrentUser User user) {
        return taskListService.searchActiveOptions(user, query, page, size);
    }

    @GetMapping("/groups")
    @PreAuthorize("permitAll()")
    public java.util.List<MaintenanceTaskListGroupOptionDTO> groups(@CurrentUser User user) {
        return taskListService.groups(user);
    }

    @GetMapping("/groups/{groupCode}/counters")
    @PreAuthorize("permitAll()")
    public java.util.List<MaintenanceTaskListDTO> groupCounters(@PathVariable String groupCode,
                                                                @CurrentUser User user) {
        return taskListService.groupCounters(groupCode, user);
    }

    @GetMapping("/defaults")
    @PreAuthorize("permitAll()")
    public MaintenanceTaskListDefaultsDTO defaults(@CurrentUser User user) {
        return taskListService.defaults(user);
    }

    @GetMapping("/reference-objects")
    @PreAuthorize("permitAll()")
    public java.util.List<MaintenanceTaskListReferenceObjectDTO> referenceObjects(
            @RequestParam String taskListType, @CurrentUser User user) {
        return taskListService.referenceObjects(taskListType, user);
    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public MaintenanceTaskListDTO get(@PathVariable Long id, @CurrentUser User user) {
        return taskListService.get(id, user);
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<MaintenanceTaskListDTO> create(@Valid @RequestBody MaintenanceTaskListDTO dto,
                                                          @CurrentUser User user) {
        if (!user.getRole().getCreatePermissions().contains(PermissionEntity.TASK_LISTS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(taskListService.create(dto, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public MaintenanceTaskListDTO update(@PathVariable Long id, @Valid @RequestBody MaintenanceTaskListDTO dto,
                                         @CurrentUser User user) {
        return taskListService.update(id, dto, user);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<SuccessResponse> delete(@PathVariable Long id, @CurrentUser User user) {
        taskListService.delete(id, user);
        return ResponseEntity.ok(new SuccessResponse(true, "Task List deleted"));
    }

    /** Export a portable, flat CSV. Repeated task/operation columns preserve 1:N relationships. */
    @GetMapping(value = "/export", produces = "text/csv")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<byte[]> exportCsv(@CurrentUser User user) throws Exception {
        StringWriter writer = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.withHeader(CSV_COLUMNS);
        try (CSVPrinter printer = new CSVPrinter(writer, format)) {
            int page = 0;
            Page<MaintenanceTaskListDTO> results;
            do {
                results = taskListService.search(user, "", page++, 100);
                for (MaintenanceTaskListDTO list : results.getContent()) {
                    List<MaintenanceTaskListDTO.OperationDTO> operations = list.operations() == null || list.operations().isEmpty()
                            ? Collections.singletonList(null) : list.operations();
                    for (MaintenanceTaskListDTO.OperationDTO operation : operations) {
                        List<MaintenanceTaskListDTO.MaterialDTO> materials = operation == null || operation.materials() == null || operation.materials().isEmpty()
                                ? Collections.singletonList(null) : operation.materials();
                        for (MaintenanceTaskListDTO.MaterialDTO material : materials) {
                            printer.printRecord(list.groupCode(), list.groupCounter(), list.description(), list.taskListType(),
                                    value(list.assetId()), value(list.locationId()), value(list.workCenter()), value(list.validFrom()),
                                    value(list.validTo()), list.status(), operation == null ? "" : operation.operationNumber(),
                                    operation == null ? "" : operation.shortDescription(), operation == null ? "" : value(operation.longText()),
                                    operation == null ? "" : value(operation.workCenter()), operation == null ? "" : value(operation.controlKey()),
                                    operation == null ? "" : value(operation.workers()), operation == null ? "" : value(operation.plannedWork()),
                                    operation == null ? "" : value(operation.workUnit()), operation == null ? "" : value(operation.duration()),
                                    operation == null ? "" : value(operation.durationUnit()), operation == null ? "" : value(operation.systemCondition()),
                                    material == null ? "" : value(material.partId()), material == null ? "" : value(material.quantity()),
                                    material == null ? "" : value(material.unit()), material == null ? "" : value(material.storageLocation()),
                                    material == null ? "" : value(material.estimatedUnitCost()));
                        }
                    }
                }
            } while (results.hasNext() && page < 1000);
        }
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=maintenance-task-lists.csv")
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8").body(writer.toString().getBytes(StandardCharsets.UTF_8));
    }

    /** Import draft-safe CSV rows; group/counter identities are generated by QPM, never trusted from the file. */
    @PostMapping(value = "/import", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public ResponseEntity<Map<String, Object>> importCsv(@RequestParam("file") MultipartFile file, @CurrentUser User user) throws Exception {
        if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024) throw new CustomException("task_list_import_file_invalid", HttpStatus.BAD_REQUEST);
        if (!user.getRole().getCreatePermissions().contains(PermissionEntity.TASK_LISTS)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        TreeMap<String, TreeMap<String, ImportCounter>> groups = new TreeMap<>();
        int rowNumber = 1;
        try (CSVParser parser = CSVFormat.DEFAULT.withFirstRecordAsHeader().withIgnoreEmptyLines(true)
                .parse(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            if (!parser.getHeaderMap().keySet().containsAll(Arrays.asList(CSV_COLUMNS))) throw new CustomException("task_list_import_headers_invalid", HttpStatus.BAD_REQUEST);
            for (CSVRecord row : parser) {
                rowNumber++;
                if (rowNumber > 5001) throw new CustomException("task_list_import_row_limit_exceeded", HttpStatus.BAD_REQUEST);
                try {
                    String groupKey = required(row, "groupCode");
                    String counterKey = required(row, "groupCounter");
                    ImportCounter counter = groups.computeIfAbsent(groupKey, ignored -> new TreeMap<>())
                            .computeIfAbsent(counterKey, ignored -> new ImportCounter(row));
                    counter.assertSameHeader(row);
                    String operationNumber = optional(row, "operationNumber");
                    if (operationNumber.isBlank()) {
                        if (hasOperationOrMaterialData(row)) {
                            throw new IllegalArgumentException("task_list_operation_number_required");
                        }
                        continue;
                    }
                    ImportOperation operation = counter.operations.computeIfAbsent(operationNumber,
                            ignored -> new ImportOperation(row));
                    operation.assertSame(row);
                    String partId = optional(row, "partId");
                    if (!partId.isBlank()) operation.materials.add(new MaintenanceTaskListDTO.MaterialDTO(null,
                            Long.valueOf(partId), decimal(required(row, "quantity")), optional(row, "unit"),
                            optional(row, "storageLocation"), decimalOrNull(optional(row, "estimatedUnitCost"))));
                } catch (RuntimeException error) {
                    if (error instanceof CustomException custom) throw custom;
                    throw new CustomException("task_list_import_invalid_row_" + rowNumber + "_" + safeMessage(error), HttpStatus.UNPROCESSABLE_ENTITY);
                }
            }
        }
        if (groups.isEmpty()) throw new CustomException("task_list_import_empty", HttpStatus.BAD_REQUEST);
        int imported = 0;
        Map<String, String> generatedGroups = new HashMap<>();
        for (Map.Entry<String, TreeMap<String, ImportCounter>> group : groups.entrySet()) {
            for (ImportCounter counter : group.getValue().values()) {
                ImportHeader header = counter.header;
                List<MaintenanceTaskListDTO.OperationDTO> operations = counter.operations.values().stream().map(ImportOperation::toDto).toList();
                String existingGroup = generatedGroups.get(group.getKey());
                MaintenanceTaskListDTO dto = new MaintenanceTaskListDTO(null, null, null, existingGroup,
                        header.description, header.type, header.assetId, header.locationId, header.workCenter,
                        header.validFrom, header.validTo, header.status, operations, null);
                MaintenanceTaskListDTO created = taskListService.create(dto, user);
                generatedGroups.putIfAbsent(group.getKey(), created.groupCode());
                imported++;
            }
        }
        return ResponseEntity.ok(Map.of("importedCounters", imported, "generatedGroups", generatedGroups.size()));
    }

    private static final String[] CSV_COLUMNS = {"groupCode", "groupCounter", "description", "taskListType", "assetId", "locationId", "workCenter", "validFrom", "validTo", "status", "operationNumber", "shortDescription", "longText", "operationWorkCenter", "controlKey", "workers", "plannedWork", "workUnit", "duration", "durationUnit", "systemCondition", "partId", "quantity", "unit", "storageLocation", "estimatedUnitCost"};
    private static String value(Object value) { return value == null ? "" : value.toString(); }
    private static String optional(CSVRecord row, String key) { return row.get(key) == null ? "" : row.get(key).trim(); }
    private static String required(CSVRecord row, String key) { String value = optional(row, key); if (value.isBlank()) throw new IllegalArgumentException(key + "_required"); return value; }
    private static BigDecimal decimal(String value) { return new BigDecimal(value); }
    private static BigDecimal decimalOrNull(String value) { return value.isBlank() ? null : decimal(value); }
    private static String safeMessage(RuntimeException error) { return error.getMessage() == null ? "invalid" : error.getMessage().replaceAll("[^a-zA-Z0-9_-]", "_"); }

    private static final class ImportHeader {
        final String description, type, workCenter, status; final Long assetId, locationId; final LocalDate validFrom, validTo;
        ImportHeader(CSVRecord row) {
            description = required(row, "description"); type = required(row, "taskListType");
            assetId = longOrNull(optional(row, "assetId")); locationId = longOrNull(optional(row, "locationId"));
            workCenter = optional(row, "workCenter"); validFrom = date(optional(row, "validFrom")); validTo = date(optional(row, "validTo"));
            status = optional(row, "status").isBlank() ? "DRAFT" : optional(row, "status").toUpperCase(Locale.ROOT);
        }
        boolean same(CSVRecord row) { return description.equals(required(row,"description")) && type.equalsIgnoreCase(required(row,"taskListType")) && Objects.equals(assetId,longOrNull(optional(row,"assetId"))) && Objects.equals(locationId,longOrNull(optional(row,"locationId"))) && workCenter.equals(optional(row,"workCenter")) && Objects.equals(validFrom,date(optional(row,"validFrom"))) && Objects.equals(validTo,date(optional(row,"validTo"))) && status.equalsIgnoreCase(optional(row,"status").isBlank()?"DRAFT":optional(row,"status")); }
    }
    private static Long longOrNull(String value) { return value.isBlank() ? null : Long.valueOf(value); }
    private static LocalDate date(String value) { return value.isBlank() ? null : LocalDate.parse(value); }
    private static boolean hasOperationOrMaterialData(CSVRecord row) {
        return Arrays.stream(new String[]{"shortDescription", "longText", "operationWorkCenter", "controlKey",
                        "workers", "plannedWork", "workUnit", "duration", "durationUnit", "systemCondition",
                        "partId", "quantity", "unit", "storageLocation", "estimatedUnitCost"})
                .anyMatch(column -> !optional(row, column).isBlank());
    }
    private static final class ImportCounter {
        final ImportHeader header; final Map<String, ImportOperation> operations = new LinkedHashMap<>();
        ImportCounter(CSVRecord row) { header = new ImportHeader(row); }
        void assertSameHeader(CSVRecord row) { if (!header.same(row)) throw new IllegalArgumentException("counter_header_mismatch"); }
    }
    private static final class ImportOperation {
        final String number, description, longText, workCenter, controlKey, workUnit, durationUnit, systemCondition;
        final BigDecimal workers, plannedWork, duration; final List<MaintenanceTaskListDTO.MaterialDTO> materials = new ArrayList<>();
        ImportOperation(CSVRecord row) {
            number = required(row,"operationNumber"); description = required(row,"shortDescription"); longText = optional(row,"longText");
            workCenter = optional(row,"operationWorkCenter"); controlKey = optional(row,"controlKey"); workers = decimalOrNull(optional(row,"workers"));
            plannedWork = decimalOrNull(optional(row,"plannedWork")); workUnit = optional(row,"workUnit"); duration = decimalOrNull(optional(row,"duration"));
            durationUnit = optional(row,"durationUnit"); systemCondition = optional(row,"systemCondition");
        }
        void assertSame(CSVRecord row) {
            if (!description.equals(required(row, "shortDescription"))
                    || !Objects.equals(longText, optional(row, "longText"))
                    || !workCenter.equals(optional(row, "operationWorkCenter"))
                    || !controlKey.equals(optional(row, "controlKey"))
                    || !sameDecimal(workers, decimalOrNull(optional(row, "workers")))
                    || !sameDecimal(plannedWork, decimalOrNull(optional(row, "plannedWork")))
                    || !Objects.equals(workUnit, optional(row, "workUnit"))
                    || !sameDecimal(duration, decimalOrNull(optional(row, "duration")))
                    || !Objects.equals(durationUnit, optional(row, "durationUnit"))
                    || !Objects.equals(systemCondition, optional(row, "systemCondition"))) {
                throw new IllegalArgumentException("operation_row_mismatch");
            }
        }
        private static boolean sameDecimal(BigDecimal left, BigDecimal right) {
            return left == null ? right == null : right != null && left.compareTo(right) == 0;
        }
        MaintenanceTaskListDTO.OperationDTO toDto() { return new MaintenanceTaskListDTO.OperationDTO(null, number, description, longText, workCenter, controlKey, workers, plannedWork, workUnit, duration, durationUnit, systemCondition, operationsOrder(), materials); }
        int operationsOrder() { return 0; }
    }
}
