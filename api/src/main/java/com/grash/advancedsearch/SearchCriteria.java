package com.grash.advancedsearch;


import com.grash.model.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Sort.Direction;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Search criteria for filtering and paginating work orders")
public class SearchCriteria implements Cloneable {
    @Schema(description = "List of filter conditions to apply to the search")
    private List<FilterField> filterFields = new ArrayList<>();
    @Schema(description = "Sort direction for the results", allowableValues = {"ASC", "DESC"})
    private Direction direction = Direction.ASC;
    @Schema(description = "Page number for pagination (0-based)")
    private int pageNum = 0;
    @Schema(description = "Number of results per page")
    private int pageSize = 10;
    @Schema(description = "Field name to sort the results by")
    private String sortField = "id";

    public void filterCompany(User user) {
        this.filterFields.add(FilterField.builder()
                .field("company")
                .value(user.getCompany().getId())
                .operation("eq")
                .values(new ArrayList<>()).build());
    }

    public void filterCreatedBy(User user) {
        this.filterFields.add(FilterField.builder()
                .field("createdBy")
                .value(user.getId())
                .operation("eq")
                .values(new ArrayList<>()).build());
    }

    public void filterCreatedByOrAssignedTo(User user) {
        this.filterFields.add(FilterField.builder()
                .field("createdBy")
                .value(user.getId())
                .operation("eq")
                .values(new ArrayList<>())
                .alternatives(List.of(
                        FilterField.builder().field("assignedTo.id").value(user.getId()).operation("eq").build(),
                        FilterField.builder().field("teams.users.id").value(user.getId()).operation("eq").build()
                ))
                .build());
    }

    public void filterIds(List<Long> ids) {
        filterFields.add(FilterField.builder().field("id").operation("in")
                .values(ids == null ? new ArrayList<>() : new ArrayList<>(ids)).build());
    }

    /** Restricts site-bearing operational records while retaining legacy records with no site assigned. */
    public void filterAccessibleSites(User user) {
        filterAccessibleSites(user, "site");
    }

    /** Restricts records through a related entity's site field, retaining legacy rows with no site. */
    public void filterAccessibleSites(User user, String field) {
        if (user == null || user.isAllSitesAccess()) return;
        List<Long> siteIds = user.getSites().stream().map(site -> site.getId()).collect(Collectors.toList());
        FilterField siteFilter = siteIds.isEmpty()
                ? FilterField.builder().field(field).operation("nu").build()
                : FilterField.builder().field(field).operation("in").values(new ArrayList<>(siteIds))
                    .alternatives(List.of(FilterField.builder().field(field).operation("nu").build())).build();
        filterFields.add(siteFilter);
    }

    @Override
    public SearchCriteria clone() {
        SearchCriteria result;
        try {
            result = (SearchCriteria) super.clone();
        } catch (CloneNotSupportedException e) {
            throw new RuntimeException("Cloning failed", e);
        }
        result.filterFields = new ArrayList<>(this.filterFields);
        return result;
    }

}
