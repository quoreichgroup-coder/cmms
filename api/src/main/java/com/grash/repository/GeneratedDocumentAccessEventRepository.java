package com.grash.repository;

import com.grash.model.GeneratedDocumentAccessEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface GeneratedDocumentAccessEventRepository extends JpaRepository<GeneratedDocumentAccessEvent, Long>,
        JpaSpecificationExecutor<GeneratedDocumentAccessEvent> {
}
