package com.grash.controller;

import com.grash.advancedsearch.FilterField;
import com.grash.advancedsearch.SearchCriteria;
import com.grash.dto.PartMiniDTO;
import com.grash.mapper.PartMapper;
import com.grash.model.Part;
import com.grash.model.User;
import com.grash.service.PartService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PartControllerMiniSearchTest {
    @Mock PartService partService;
    @Mock PartMapper partMapper;
    @InjectMocks PartController controller;

    private final User actor = new User();

    @Test
    void shortQueryDoesNotLoadThePartsCatalog() {
        var result = controller.searchMini(" ", 0, 25, actor);

        assertTrue(result.isEmpty());
        verifyNoInteractions(partService, partMapper);
    }

    @Test
    void searchIsPagedAndClampsPageSizeAndSearchesCodeNameAndDescription() {
        when(partService.getSearchCriteria(eq(actor), any(SearchCriteria.class)))
                .thenAnswer(invocation -> invocation.getArgument(1));
        when(partService.findBySearchCriteria(any(SearchCriteria.class)))
                .thenReturn(new PageImpl<>(List.of(new Part()), PageRequest.of(0, 50, Sort.by("name")), 1));
        when(partMapper.toMiniDto(any(Part.class))).thenReturn(new PartMiniDTO());

        var result = controller.searchMini(" seal ", -3, 500, actor);

        ArgumentCaptor<SearchCriteria> criteriaCaptor = ArgumentCaptor.forClass(SearchCriteria.class);
        verify(partService).findBySearchCriteria(criteriaCaptor.capture());
        SearchCriteria criteria = criteriaCaptor.getValue();
        assertEquals(0, criteria.getPageNum());
        assertEquals(50, criteria.getPageSize());
        assertEquals(Sort.Direction.ASC, criteria.getDirection());
        FilterField queryFilter = criteria.getFilterFields().get(0);
        assertEquals("barcode", queryFilter.getField());
        assertEquals("seal", queryFilter.getValue());
        assertEquals("cn", queryFilter.getOperation());
        // Every operation must be one the search engine knows, or the API answers "Invalid search field".
        java.util.stream.Stream.concat(java.util.stream.Stream.of(queryFilter), queryFilter.getAlternatives().stream())
                .forEach(field -> assertNotNull(
                        com.grash.advancedsearch.SearchOperation.getSimpleOperation(field.getOperation()),
                        "unknown search operation for " + field.getField() + ": " + field.getOperation()));
        assertEquals(List.of("name", "description"), queryFilter.getAlternatives().stream().map(FilterField::getField).toList());
        assertEquals(1, result.getTotalElements());
    }

    @Test
    void numericSearchAlsoMatchesTheVisiblePartId() {
        when(partService.getSearchCriteria(eq(actor), any(SearchCriteria.class)))
                .thenAnswer(invocation -> invocation.getArgument(1));
        when(partService.findBySearchCriteria(any(SearchCriteria.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 25), 0));

        controller.searchMini("481", 0, 25, actor);

        ArgumentCaptor<SearchCriteria> criteriaCaptor = ArgumentCaptor.forClass(SearchCriteria.class);
        verify(partService).findBySearchCriteria(criteriaCaptor.capture());
        FilterField idAlternative = criteriaCaptor.getValue().getFilterFields().get(0).getAlternatives().stream()
                .filter(field -> field.getField().equals("id"))
                .findFirst().orElseThrow();
        assertEquals("eq", idAlternative.getOperation());
        assertEquals(481L, idAlternative.getValue());
    }

    @Test
    void selectedPartsAreFetchedOnlyThroughScopedSearchCriteria() {
        when(partService.getSearchCriteria(eq(actor), any(SearchCriteria.class)))
                .thenAnswer(invocation -> invocation.getArgument(1));
        when(partService.findBySearchCriteria(any(SearchCriteria.class)))
                .thenReturn(new PageImpl<>(List.of(new Part(), new Part()), PageRequest.of(0, 2), 2));
        when(partMapper.toMiniDto(any(Part.class))).thenReturn(new PartMiniDTO());

        var result = controller.getSelectedMini(List.of(8L, 12L), actor);

        ArgumentCaptor<SearchCriteria> criteriaCaptor = ArgumentCaptor.forClass(SearchCriteria.class);
        verify(partService).getSearchCriteria(eq(actor), criteriaCaptor.capture());
        SearchCriteria criteria = criteriaCaptor.getValue();
        assertEquals(2, criteria.getPageSize());
        assertEquals("id", criteria.getFilterFields().get(0).getField());
        assertEquals("in", criteria.getFilterFields().get(0).getOperation());
        assertEquals(List.of(8L, 12L), criteria.getFilterFields().get(0).getValues());
        assertEquals(2, result.size());
    }
}
