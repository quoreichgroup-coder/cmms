package com.grash.utils;

import com.grash.model.*;
import com.grash.service.AdditionalCostService;
import com.grash.service.AssetDowntimeService;
import com.grash.service.LaborService;
import com.grash.service.UserService;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.Writer;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.ArrayList;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CsvFileGenerator {
    private static final String FORMULA_PREFIXES = "=+-@\t\r";

    /**
     * Prefixes text cells that a spreadsheet would evaluate as a formula (CSV/formula injection).
     * Exported data can contain text typed by anonymous request portal users.
     */
    public static Object neutralizeCsvCell(Object value) {
        if (!(value instanceof CharSequence text) || text.isEmpty()) return value;
        String cell = text.toString();
        if (FORMULA_PREFIXES.indexOf(cell.charAt(0)) < 0) return value;
        // Keep ordinary list items ("- check oil") and plain signed numbers readable on re-import.
        if ((cell.startsWith("- ") || cell.matches("[-+]\\d+([.,]\\d+)?"))) return value;
        return "'" + cell;
    }

    public static void printSafeRecord(CSVPrinter printer, Object... values) throws IOException {
        if (values.length == 1 && values[0] instanceof Iterable<?> iterable) {
            List<Object> cells = new ArrayList<>();
            iterable.forEach(cell -> cells.add(neutralizeCsvCell(cell)));
            printer.printRecord(cells);
            return;
        }
        printer.printRecord(Arrays.stream(values).map(CsvFileGenerator::neutralizeCsvCell).toArray());
    }
    private final MessageSource messageSource;
    private final AssetDowntimeService assetDowntimeService;
    private final AdditionalCostService additionalCostService;
    private final LaborService laborService;
    private final UserService userService;

    public void writeWorkOrdersToCsv(Collection<WorkOrder> workOrders, Writer writer, Locale locale,
                                     String csvSeparator, boolean includeHeaders) {
        try {
            CSVFormat csvFormat = CSVFormat.DEFAULT.withDelimiter(csvSeparator.charAt(0));
            CSVPrinter printer = new CSVPrinter(writer, csvFormat);
            if (includeHeaders) {
                List<String> headers = Arrays.asList("ID", "Title", "Status", "Priority", "Description", "Due_Date",
                        "Estimated_Duration", "Requires_Signature", "Category", "Location_Name", "Team_Name",
                        "Primary_User_Email", "Assigned_To_Emails", "Asset_Name", "Completed_By_Email", "Completed_On",
                        "Archived", "Feedback", "Customers", "Created_At");
                printSafeRecord(printer, headers.stream().map(header -> messageSource.getMessage(header, null, locale)).collect(Collectors.toList()));
            }
            for (WorkOrder workOrder : workOrders) {
                printSafeRecord(printer, workOrder.getId(),
                        workOrder.getTitle(),
                        workOrder.getStatus() == null ? null :
                                messageSource.getMessage(workOrder.getStatus().toString(), null, locale),
                        workOrder.getPriority() == null ? null :
                                messageSource.getMessage(workOrder.getPriority().toString(), null, locale),
                        workOrder.getDescription(),
                        workOrder.getDueDate(),
                        workOrder.getEstimatedDuration(),
                        Helper.getStringFromBoolean(workOrder.isRequiredSignature(), messageSource, locale),
                        workOrder.getCategory() == null ? null : workOrder.getCategory().getName(),
                        workOrder.getLocation() == null ? null : workOrder.getLocation().getName(),
                        workOrder.getTeam() == null ? null : workOrder.getTeam().getName(),
                        workOrder.getPrimaryUser() == null ? null : workOrder.getPrimaryUser().getEmail(),
                        Helper.enumerate(workOrder.getAssignedTo().stream().map(User::getEmail).collect(Collectors.toList())),
                        workOrder.getAsset() == null ? null : workOrder.getAsset().getName(),
                        workOrder.getCompletedBy() == null ? null : workOrder.getCompletedBy().getEmail(),
                        workOrder.getCompletedOn(),
                        Helper.getStringFromBoolean(workOrder.isArchived(), messageSource, locale),
                        workOrder.getFeedback(),
                        Helper.enumerate(workOrder.getCustomers().stream().map(Customer::getName).collect(Collectors.toList())),
                        workOrder.getCreatedAt()
                );
            }
            printer.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void writeAssetsToCsv(Collection<Asset> assets, Writer writer, Locale locale, String csvSeparator,
                                 boolean includeHeaders) {
        try {
            CSVFormat csvFormat = CSVFormat.DEFAULT.withDelimiter(csvSeparator.charAt(0));
            CSVPrinter printer = new CSVPrinter(writer, csvFormat);
            if (includeHeaders) {
                List<String> headers = Arrays.asList("ID", "Exchange_ID", "Parent_Exchange_ID", "Name",
                        "Equipment_Hierarchy_Path",
                        "Description",
                        "Status",
                        "Archived",
                        "Location_Name",
                        "Location_Exchange_ID",
                        "Functional_Location_Path",
                        "Parent_Asset",
                        "Area",
                        "Barcode",
                        "Category",
                        "Primary_User_Email",
                        "Warranty_Expiration_Date",
                        "Additional_Information",
                        "Serial_Number",
                        "Assigned_To_Emails",
                        "Teams_Names",
                        "Parts",
                        "Vendors",
                        "Customers",
                        "Downtime_Duration");
                printSafeRecord(printer, headers.stream().map(header -> messageSource.getMessage(header, null, locale)).collect(Collectors.toList()));
            }
            for (Asset asset : assets) {
                Collection<AssetDowntime> downtimes = assetDowntimeService.findByAsset(asset.getId());
                long downTimeDuration = downtimes.stream().map(AssetDowntime::getDuration)
                        .reduce(0L, Long::sum);

                printSafeRecord(printer, asset.getId(),
                        asset.getExchangeId(),
                        asset.getParentAsset() == null ? null : asset.getParentAsset().getExchangeId(),
                        asset.getName(),
                        hierarchyPath(asset, Asset::getParentAsset, Asset::getName),
                        asset.getDescription(),
                        messageSource.getMessage(asset.getStatus().toString(), null, locale),
                        Helper.getStringFromBoolean(asset.isArchived(), messageSource, locale),
                        asset.getLocation() == null ? null : asset.getLocation().getName(),
                        asset.getLocation() == null ? null : asset.getLocation().getExchangeId(),
                        asset.getLocation() == null ? null : hierarchyPath(asset.getLocation(), Location::getParentLocation, Location::getName),
                        asset.getParentAsset() == null ? null : asset.getParentAsset().getName(),
                        asset.getArea(),
                        asset.getBarCode(),
                        asset.getCategory() == null ? null : asset.getCategory().getName(),
                        asset.getPrimaryUser() == null ? null : asset.getPrimaryUser().getEmail(),
                        asset.getWarrantyExpirationDate(),
                        asset.getAdditionalInfos(),
                        asset.getSerialNumber(),
                        Helper.enumerate(asset.getAssignedTo().stream().map(User::getEmail).collect(Collectors.toList())),
                        Helper.enumerate(asset.getTeams().stream().map(Team::getName).collect(Collectors.toList())),
                        Helper.enumerate(asset.getParts().stream().map(Part::getName).collect(Collectors.toList())),
                        Helper.enumerate(asset.getVendors().stream().map(Vendor::getName).collect(Collectors.toList())),
                        Helper.enumerate(asset.getCustomers().stream().map(Customer::getName).collect(Collectors.toList())),
                        downTimeDuration
                );
            }
            printer.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void writeLocationsToCsv(Collection<Location> locations, Writer writer, Locale locale, String csvSeparator
            , boolean includeHeaders) {
        try {
            CSVFormat csvFormat = CSVFormat.DEFAULT.withDelimiter(csvSeparator.charAt(0));
            CSVPrinter printer = new CSVPrinter(writer, csvFormat);
            if (includeHeaders) {
                List<String> headers = Arrays.asList("ID", "Exchange_ID", "Parent_Exchange_ID", "Name",
                        "Functional_Location_Path",
                        "Address",
                        "Parent_Location",
                        "Workers",
                        "Teams_Names",
                        "Vendors",
                        "Customers");
                printSafeRecord(printer, headers.stream().map(header -> messageSource.getMessage(header, null, locale)).collect(Collectors.toList()));
            }
            for (Location location : locations) {
                printSafeRecord(printer, location.getId(),
                        location.getExchangeId(),
                        location.getParentLocation() == null ? null : location.getParentLocation().getExchangeId(),
                        location.getName(),
                        hierarchyPath(location, Location::getParentLocation, Location::getName),
                        location.getAddress(),
                        location.getParentLocation() == null ? null : location.getParentLocation().getName(),
                        Helper.enumerate(location.getWorkers().stream().map(User::getEmail).collect(Collectors.toList())),
                        Helper.enumerate(location.getTeams().stream().map(Team::getName).collect(Collectors.toList())),
                        Helper.enumerate(location.getVendors().stream().map(Vendor::getName).collect(Collectors.toList())),
                        Helper.enumerate(location.getCustomers().stream().map(Customer::getName).collect(Collectors.toList()))
                );
            }
            printer.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    /**
     * Produces a human-readable path alongside stable exchange IDs so exports
     * can be reviewed and reconciled by people without using database IDs.
     * Identity-based cycle protection keeps corrupt legacy hierarchies from
     * hanging an export.
     */
    private <T> String hierarchyPath(T node, Function<T, T> parentAccessor, Function<T, String> nameAccessor) {
        if (node == null) return null;
        Set<T> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        List<String> segments = new ArrayList<>();
        T current = node;
        while (current != null && visited.add(current)) {
            String name = nameAccessor.apply(current);
            if (name != null && !name.isBlank()) segments.add(name.trim());
            current = parentAccessor.apply(current);
        }
        Collections.reverse(segments);
        return String.join(" / ", segments);
    }

    public void writePartsToCsv(Collection<Part> parts, Writer writer, Locale locale, String csvSeparator,
                                boolean includeHeaders) {
        try {
            CSVFormat csvFormat = CSVFormat.DEFAULT.withDelimiter(csvSeparator.charAt(0));
            CSVPrinter printer = new CSVPrinter(writer, csvFormat);
            if (includeHeaders) {
                List<String> headers = Arrays.asList("ID", "Name",
                        "Cost",
                        "Category",
                        "Non_Stock",
                        "Barcode",
                        "Description",
                        "Quantity",
                        "Additional_Information",
                        "Area",
                        "Minimum_Quantity",
                        "Assigned_To_Emails",
                        "Customers",
                        "Vendors",
                        "Teams_Names"
                );
                printSafeRecord(printer, headers.stream().map(header -> messageSource.getMessage(header, null, locale)).collect(Collectors.toList()));
            }
            for (Part part : parts) {
                printSafeRecord(printer, part.getId(),
                        part.getName(),
                        part.getCost(),
                        part.getCategory() == null ? null : part.getCategory().getName(),
                        Helper.getStringFromBoolean(part.isNonStock(), messageSource, locale),
                        part.getBarcode(),
                        part.getDescription(),
                        part.getQuantity(),
                        part.getAdditionalInfos(),
                        part.getArea(),
                        part.getMinQuantity(),
                        Helper.enumerate(part.getAssignedTo().stream().map(User::getEmail).collect(Collectors.toList())),
                        Helper.enumerate(part.getCustomers().stream().map(Customer::getName).collect(Collectors.toList())),
                        Helper.enumerate(part.getVendors().stream().map(Vendor::getName).collect(Collectors.toList())),
                        Helper.enumerate(part.getTeams().stream().map(Team::getName).collect(Collectors.toList()))
                );
            }
            printer.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void writeMetersToCsv(Collection<Meter> meters, Writer writer, Locale locale, String csvSeparator,
                                 boolean includeHeaders) {
        try {
            CSVFormat csvFormat = CSVFormat.DEFAULT.withDelimiter(csvSeparator.charAt(0));
            CSVPrinter printer = new CSVPrinter(writer, csvFormat);
            if (includeHeaders) {
                List<String> headers = Arrays.asList("ID", "Name",
                        "Unit",
                        "Update_Frequency",
                        "Category",
                        "Asset_Name",
                        "Location_Name",
                        "Assigned_To_Emails"
                );
                printSafeRecord(printer, headers.stream().map(header -> messageSource.getMessage(header, null, locale)).collect(Collectors.toList()));
            }
            for (Meter meter : meters) {
                printSafeRecord(printer, meter.getId(),
                        meter.getName(),
                        meter.getUnit(),
                        meter.getUpdateFrequency(),
                        meter.getMeterCategory() == null ? null : meter.getMeterCategory().getName(),
                        meter.getAsset() == null ? null : meter.getAsset().getName(),
                        meter.getLocation() == null ? null : meter.getLocation().getName(),
                        Helper.enumerate(meter.getUsers().stream().map(User::getEmail).collect(Collectors.toList())));
            }
            printer.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void writePreventiveMaintenancesToCsv(Collection<PreventiveMaintenance> preventiveMaintenances,
                                                 Writer writer, Locale locale,
                                                 String csvSeparator, boolean includeHeaders) {
        try {
            CSVFormat csvFormat = CSVFormat.DEFAULT.withDelimiter(csvSeparator.charAt(0));
            CSVPrinter printer = new CSVPrinter(writer, csvFormat);
            if (includeHeaders) {
                List<String> headers = Arrays.asList("ID", "Title", "Starts_On", "Priority", "Description",
                        "Estimated_Duration",
                        "Requires_Signature", "Category", "Location_Name", "Team_Name",
                        "Primary_User_Email", "Asset_Name", "Frequency", "Recurrence_Type");
                printSafeRecord(printer, headers.stream().map(header -> messageSource.getMessage(header, null, locale)).collect(Collectors.toList()));
            }
            for (PreventiveMaintenance pm : preventiveMaintenances) {
                printSafeRecord(printer, pm.getId(),
                        pm.getTitle(),
                        pm.getSchedule() == null ? null : pm.getSchedule().getStartsOn(),
                        pm.getPriority() == null ? null :
                                messageSource.getMessage(pm.getPriority().toString(), null, locale),
                        pm.getDescription(),
                        pm.getEstimatedDuration(),
                        Helper.getStringFromBoolean(pm.isRequiredSignature(), messageSource, locale),
                        pm.getCategory() == null ? null : pm.getCategory().getName(),
                        pm.getLocation() == null ? null : pm.getLocation().getName(),
                        pm.getTeam() == null ? null : pm.getTeam().getName(),
                        pm.getPrimaryUser() == null ? null : pm.getPrimaryUser().getEmail(),
                        pm.getAsset() == null ? null : pm.getAsset().getName(),
                        pm.getSchedule() == null ? null : pm.getSchedule().getFrequency(),
                        pm.getSchedule() == null ? null :
                                messageSource.getMessage(pm.getSchedule().getRecurrenceType().name(), null, locale)
                );
            }
            printer.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void writePartTransactionsToCsv(Collection<PartTransaction> partTransactions, Writer writer, Locale locale,
                                           String csvSeparator, boolean includeHeaders) {
        try {
            CSVFormat csvFormat = CSVFormat.DEFAULT.withDelimiter(csvSeparator.charAt(0));
            CSVPrinter printer = new CSVPrinter(writer, csvFormat);
            if (includeHeaders) {
                List<String> headers = Arrays.asList("ID", "Part_ID", "Part", "Quantity", "Cost", "Work_Order_ID"
                        , "Work_Order_Title", "Description", "Created_At", "Purchase Order ID", "Receipt ID",
                        "Receipt Reference");
                printSafeRecord(printer, headers.stream()
                        .map(header -> messageSource.getMessage(header, null, header, locale))
                        .collect(Collectors.toList()));
            }
            for (PartTransaction pt : partTransactions) {
                printSafeRecord(printer, pt.getId(),
                        pt.getPart().getId(),
                        pt.getPart().getName(),
                        -pt.getQuantity(),
                        -pt.getCost(),
                        pt.getWorkOrder() == null ? null : pt.getWorkOrder().getId(),
                        pt.getWorkOrder() == null ? null : pt.getWorkOrder().getTitle(),
                        pt.getDescription(),
                        pt.getCreatedAt(),
                        pt.getPurchaseOrderReceiptLine() == null ? null
                                : pt.getPurchaseOrderReceiptLine().getReceipt().getPurchaseOrder().getId(),
                        pt.getPurchaseOrderReceiptLine() == null ? null
                                : pt.getPurchaseOrderReceiptLine().getReceipt().getId(),
                        pt.getPurchaseOrderReceiptLine() == null ? null
                                : pt.getPurchaseOrderReceiptLine().getReceipt().getReference()
                );
            }
            printer.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void writeCostsAndTimesToCsv(Collection<WorkOrder> workOrders, Writer writer, Locale locale,
                                        String csvSeparator, boolean includeHeaders) {
        try {
            CSVFormat csvFormat = CSVFormat.DEFAULT.withDelimiter(csvSeparator.charAt(0));
            CSVPrinter printer = new CSVPrinter(writer, csvFormat);
            if (includeHeaders) {
                List<String> headers = Arrays.asList("ID", "Work_Order_Title", "Work_Order_ID", "User", "Creator",
                        "Created_At", "Type", "Cost", "Cost_Category", "Time_Category",
                        "Description", "Time_Hours", "Hourly_Rate");
                printSafeRecord(printer, headers.stream().map(header -> messageSource.getMessage(header, null, locale)).collect(Collectors.toList()));
            }
            for (WorkOrder workOrder : workOrders) {
                Collection<AdditionalCost> additionalCosts = additionalCostService.findByWorkOrder(workOrder.getId());
                for (AdditionalCost cost : additionalCosts) {
                    String creatorEmail = null;
                    if (cost.getCreatedBy() != null) {
                        Optional<User> creator = userService.findById(cost.getCreatedBy());
                        if (creator.isPresent()) creatorEmail = creator.get().getEmail();
                    }
                    printSafeRecord(printer, 
                            cost.getId(),
                            workOrder.getTitle(),
                            workOrder.getId(),
                            cost.getAssignedTo() == null ? null : cost.getAssignedTo().getEmail(),
                            creatorEmail,
                            cost.getCreatedAt(),
                            "Cost",
                            cost.getCost(),
                            cost.getCategory() == null ? null : cost.getCategory().getName(),
                            null,
                            cost.getDescription(),
                            null,
                            cost.getAssignedTo() == null ? null : cost.getAssignedTo().getRate()
                    );
                }
                Collection<Labor> labors = laborService.findByWorkOrder(workOrder.getId());
                for (Labor labor : labors) {
                    String creatorEmail = null;
                    if (labor.getCreatedBy() != null) {
                        Optional<User> creator = userService.findById(labor.getCreatedBy());
                        if (creator.isPresent()) creatorEmail = creator.get().getEmail();
                    }
                    double hours = labor.getDuration() / 3600.0;
                    printSafeRecord(printer, 
                            labor.getId(),
                            workOrder.getTitle(),
                            workOrder.getId(),
                            labor.getAssignedTo() == null ? null : labor.getAssignedTo().getEmail(),
                            creatorEmail,
                            labor.getCreatedAt(),
                            "Time",
                            labor.getHourlyRate() * hours,
                            null,
                            labor.getTimeCategory() == null ? null : labor.getTimeCategory().getName(),
                            null,
                            hours,
                            labor.getHourlyRate()
                    );
                }
            }
            printer.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
