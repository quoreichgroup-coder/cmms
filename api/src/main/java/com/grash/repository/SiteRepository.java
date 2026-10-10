package com.grash.repository;

import com.grash.model.Site;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SiteRepository extends JpaRepository<Site, Long> {
    List<Site> findByCompany_IdOrderByNameAsc(Long companyId);
    boolean existsByCompany_IdAndCodeIgnoreCase(Long companyId, String code);
    boolean existsByCompany_IdAndCodeIgnoreCaseAndIdNot(Long companyId, String code, Long id);
}
