package com.grash.repository;

import com.grash.model.MaintenanceTaskListCounter;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

public interface MaintenanceTaskListCounterRepository extends JpaRepository<MaintenanceTaskListCounter, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<MaintenanceTaskListCounter> findByCompany_IdAndGroupCodeIgnoreCase(Long companyId, String groupCode);
}
