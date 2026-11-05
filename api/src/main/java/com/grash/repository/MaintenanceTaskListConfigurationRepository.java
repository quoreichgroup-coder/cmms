package com.grash.repository;

import com.grash.model.MaintenanceTaskListConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MaintenanceTaskListConfigurationRepository extends JpaRepository<MaintenanceTaskListConfiguration, Long> {
    Optional<MaintenanceTaskListConfiguration> findByCompany_Id(Long companyId);
}
