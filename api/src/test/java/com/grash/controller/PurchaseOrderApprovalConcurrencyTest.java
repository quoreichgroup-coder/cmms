package com.grash.controller;

import com.grash.repository.PurchaseOrderRepository;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class PurchaseOrderApprovalConcurrencyTest {

    @Test
    void approvalRunsInTransactionAndLocksPurchaseOrderForUpdate() throws Exception {
        Method respond = PurchaseOrderController.class.getMethod(
                "respond", boolean.class, Long.class, jakarta.servlet.http.HttpServletRequest.class);
        Method lockLookup = PurchaseOrderRepository.class.getMethod("findByIdForUpdate", Long.class);

        assertNotNull(respond.getAnnotation(Transactional.class));
        assertEquals(LockModeType.PESSIMISTIC_WRITE, lockLookup.getAnnotation(Lock.class).value());
    }
}
