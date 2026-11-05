package com.grash.repository;

import com.grash.model.Labor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface LaborRepository extends JpaRepository<Labor, Long> {
    Collection<Labor> findByWorkOrder_Id(Long id);

    List<Labor> findByWorkOrder_IdIn(Collection<Long> workOrderIds);

    void deleteByCompany_IdAndIsDemoTrue(Long companyId);
}
