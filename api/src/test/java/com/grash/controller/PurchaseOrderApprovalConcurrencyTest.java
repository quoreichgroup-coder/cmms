package com.grash.controller;

import com.grash.advancedsearch.SearchCriteria;
import com.grash.repository.PurchaseOrderRepository;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PurchaseOrderApprovalConcurrencyTest {

    @Test
    void approvalRunsInTransactionAndLocksPurchaseOrderForUpdate() throws Exception {
        Method respond = PurchaseOrderController.class.getMethod(
                "respond", boolean.class, Long.class, jakarta.servlet.http.HttpServletRequest.class);
        Method lockLookup = PurchaseOrderRepository.class.getMethod(
                "findByIdForUpdateAndCompany", Long.class, Long.class);

        assertNotNull(respond.getAnnotation(Transactional.class));
        assertEquals(LockModeType.PESSIMISTIC_WRITE, lockLookup.getAnnotation(Lock.class).value());
        assertTrue(lockLookup.getAnnotation(Query.class).value()
                .contains("purchaseOrder.company.id = :companyId"));
    }

    @Test
    void purchaseOrderSearchNormalizesInvalidAndOversizedPagination() {
        SearchCriteria criteria = new SearchCriteria();
        criteria.setPageNum(-3);
        criteria.setPageSize(1000);
        criteria.setDirection(null);
        criteria.setSortField(" ");
        criteria.setFilterFields(null);

        SearchCriteria normalized = PurchaseOrderController.normalizeSearchCriteria(criteria);

        assertEquals(0, normalized.getPageNum());
        assertEquals(100, normalized.getPageSize());
        assertEquals(org.springframework.data.domain.Sort.Direction.DESC, normalized.getDirection());
        assertEquals("id", normalized.getSortField());
        assertNotNull(normalized.getFilterFields());
    }
}
