package com.grash.repository;

import com.grash.model.MaintenanceTaskListGroupSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

public interface MaintenanceTaskListGroupSequenceRepository
        extends JpaRepository<MaintenanceTaskListGroupSequence, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<MaintenanceTaskListGroupSequence> findByCompany_Id(Long companyId);
}
