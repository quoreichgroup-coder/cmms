package com.grash.repository;

import com.grash.model.DocumentationAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DocumentationAssetRepository extends JpaRepository<DocumentationAsset, Long> {
    Optional<DocumentationAsset> findByPublicId(String publicId);
}
