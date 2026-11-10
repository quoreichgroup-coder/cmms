package com.grash.controller;

import com.grash.advancedsearch.SearchCriteria;
import com.grash.dto.PartMiniDTO;
import com.grash.dto.PartPatchDTO;
import com.grash.dto.PartPostDTO;
import com.grash.dto.PartRestockDTO;
import com.grash.dto.PartShowDTO;
import com.grash.dto.SuccessResponse;
import com.grash.mapper.PartMapper;
import com.grash.model.User;
import com.grash.security.CurrentUser;
import com.grash.service.PartService;
import com.grash.utils.TenantAspectUtils;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/parts")
@Tag(name = "Parts", description = "Operations on parts")
@RequiredArgsConstructor
public class PartController {

    private final PartService partService;
    private final PartMapper partMapper;

    @PostMapping("/search")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Page<PartShowDTO>> search(@Parameter(description = "Search criteria for filtering parts") @RequestBody SearchCriteria searchCriteria,
                                                    @Parameter(hidden = true) @CurrentUser User user) {
        return ResponseEntity.ok(partService.findBySearchCriteria(partService.getSearchCriteria(user,
                searchCriteria)).map(partMapper::toShowDto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public PartShowDTO getById(@Parameter(description = "Part ID") @PathVariable("id") Long id,
                               @Parameter(hidden = true) @CurrentUser User user) {
        return partMapper.toShowDto(partService.getById(id, user));
    }

    @PostMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    PartShowDTO create(@Parameter(description = "Part data to create") @Valid @RequestBody PartPostDTO partReq,
                       @Parameter(hidden = true) @CurrentUser User user) {
        return partMapper.toShowDto(partService.create(partReq, user));
    }

    @PostMapping("/{id}/restock")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<SuccessResponse> restock(@Parameter(description = "Part ID") @PathVariable("id") Long id,
                                                   @Valid @RequestBody PartRestockDTO partRestockDTO,
                                                   @Parameter(hidden = true) @CurrentUser User user) {
        partService.restock(id, partRestockDTO, user);
        return new ResponseEntity<>(new SuccessResponse(true, "Restocked successfully"), HttpStatus.OK);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public PartShowDTO patch(@Parameter(description = "Part fields to update") @Valid @RequestBody PartPatchDTO part,
                             @Parameter(description = "Part ID") @PathVariable(
                                     "id") Long id,
                             @Parameter(hidden = true) @CurrentUser User user) {
        return partMapper.toShowDto(partService.patch(id, part, user));
    }

    @GetMapping("/mini")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Collection<PartMiniDTO> getMini(@Parameter(hidden = true) @CurrentUser User user) {
        return partService.getMini(user).stream().map(partMapper::toMiniDto).collect(Collectors.toList());
    }

    /** Small, server-filtered value help for operation material selection. */
    @GetMapping("/mini/search")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Page<PartMiniDTO> searchMini(@RequestParam(defaultValue = "") String query,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "25") int size,
                                        @Parameter(hidden = true) @CurrentUser User user) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 50);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "name"));
        String term = query == null ? "" : query.trim();
        if (term.length() < 2) {
            return Page.empty(pageable);
        }
        SearchCriteria criteria = new SearchCriteria();
        criteria.setPageNum(safePage);
        criteria.setPageSize(safeSize);
        criteria.setSortField("name");
        criteria.setDirection(Sort.Direction.ASC);
        java.util.List<com.grash.advancedsearch.FilterField> alternatives = new java.util.ArrayList<>(java.util.List.of(
                        com.grash.advancedsearch.FilterField.builder().field("name").value(term).operation("cn").build(),
                        com.grash.advancedsearch.FilterField.builder().field("description").value(term).operation("cn").build()));
        if (term.chars().allMatch(Character::isDigit)) {
            try {
                alternatives.add(com.grash.advancedsearch.FilterField.builder()
                        .field("id").value(Long.parseLong(term)).operation("eq").build());
            } catch (NumberFormatException ignored) {
                // An oversized numeric search term can still match a barcode or name.
            }
        }
        criteria.getFilterFields().add(com.grash.advancedsearch.FilterField.builder()
                .field("barcode").value(term).operation("cn")
                .alternatives(alternatives)
                .build());
        SearchCriteria scopedCriteria = partService.getSearchCriteria(user, criteria);
        return partService.findBySearchCriteria(scopedCriteria).map(partMapper::toMiniDto);
    }

    @GetMapping("/mini/selected")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Collection<PartMiniDTO> getSelectedMini(@RequestParam List<Long> ids,
                                                     @Parameter(hidden = true) @CurrentUser User user) {
        if (ids == null || ids.isEmpty() || ids.size() > 100) return java.util.List.of();
        SearchCriteria criteria = new SearchCriteria();
        criteria.setPageSize(ids.size());
        criteria.setSortField("name");
        criteria.filterIds(ids);
        return partService.findBySearchCriteria(partService.getSearchCriteria(user, criteria)).stream()
                .map(partMapper::toMiniDto).collect(Collectors.toList());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<SuccessResponse> delete(@Parameter(description = "Part ID") @PathVariable("id") Long id,
                                                  @Parameter(hidden = true) @CurrentUser User user) {
        partService.deleteByIdAndUser(id, user);
        return new ResponseEntity<>(new SuccessResponse(true, "Deleted successfully"),
                HttpStatus.OK);
    }

}
