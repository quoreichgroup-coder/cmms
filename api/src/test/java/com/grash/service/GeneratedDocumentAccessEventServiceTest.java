package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.GeneratedDocumentAccessEvent;
import com.grash.model.User;
import com.grash.repository.GeneratedDocumentAccessEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeneratedDocumentAccessEventServiceTest {
    @Mock GeneratedDocumentAccessEventRepository repository;
    @InjectMocks GeneratedDocumentAccessEventService service;

    @Test void filtersAndMapsCompanyDocumentAccessEventsInReverseChronologicalPages() {
        Company company = new Company(); company.setId(8L);
        User actor = new User(); actor.setCompany(company);
        GeneratedDocumentAccessEvent event = new GeneratedDocumentAccessEvent();
        event.setId(3L); event.setGeneratedDocumentId(22L); event.setSourceType("PURCHASE_ORDER");
        event.setSourceId(45L); event.setActorId(11L); event.setActorName("Buyer One");
        event.setOutcome("SUCCESS"); event.setCreatedAt(new Date(1_700_000_000_000L));
        when(repository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(event)));

        var result = service.search(actor, "buyer", "PURCHASE_ORDER", "SUCCESS", 45L, 0);

        assertEquals(1, result.totalElements());
        assertEquals(22L, result.content().get(0).generatedDocumentId());
        assertEquals("Buyer One", result.content().get(0).actorName());
        ArgumentCaptor<PageRequest> page = ArgumentCaptor.forClass(PageRequest.class);
        verify(repository).findAll(any(Specification.class), page.capture());
        assertEquals(25, page.getValue().getPageSize());
        assertTrue(page.getValue().getSort().getOrderFor("createdAt").isDescending());
        assertTrue(page.getValue().getSort().getOrderFor("id").isDescending());
    }

    @Test void rejectsUnsupportedFiltersBeforeQueryingAuditData() {
        Company company = new Company(); company.setId(8L);
        User actor = new User(); actor.setCompany(company);

        assertThrows(CustomException.class, () -> service.search(actor, "", "UNKNOWN", "", null, 0));
        assertThrows(CustomException.class, () -> service.search(actor, "", "", "UNKNOWN", null, 0));
        assertThrows(CustomException.class, () -> service.search(actor, "", "", "", null, -1));
        verifyNoInteractions(repository);
    }

    @Test @SuppressWarnings({"unchecked", "rawtypes"})
    void capturedQuerySpecificationRestrictsResultsToTheAuthenticatedCompany() {
        Company company = new Company(); company.setId(808L);
        User actor = new User(); actor.setCompany(company);
        when(repository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        service.search(actor, "", "", "", null, 0);

        ArgumentCaptor<Specification> captured = ArgumentCaptor.forClass(Specification.class);
        verify(repository).findAll(captured.capture(), any(PageRequest.class));
        Root<GeneratedDocumentAccessEvent> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder builder = mock(CriteriaBuilder.class);
        Path companyPath = mock(Path.class);
        Path companyIdPath = mock(Path.class);
        Predicate tenantPredicate = mock(Predicate.class);
        when(root.get("company")).thenReturn(companyPath);
        when(companyPath.get("id")).thenReturn(companyIdPath);
        when(builder.equal(companyIdPath, 808L)).thenReturn(tenantPredicate);

        assertSame(tenantPredicate, captured.getValue().toPredicate(root, query, builder));
        verify(builder).equal(companyIdPath, 808L);
    }
}
