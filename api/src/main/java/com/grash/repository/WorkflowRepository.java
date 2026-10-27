package com.grash.repository;

import com.grash.model.Workflow;
import com.grash.model.enums.workflow.WFMainCondition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;

public interface WorkflowRepository extends JpaRepository<Workflow, Long> {
    Collection<Workflow> findByCompany_Id(Long id);

    Optional<Workflow> findByIdAndCompany_Id(Long id, Long companyId);

    Collection<Workflow> findByMainConditionAndCompany_Id(WFMainCondition mainCondition, Long companyId);
}
