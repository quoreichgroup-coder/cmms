package com.grash.dto;

import com.grash.model.DocumentType;

public record DocumentTypeDTO(Long id, String code, String name, String category, String description,
                              String providerCode, boolean systemManaged, boolean active) {
    public static DocumentTypeDTO from(DocumentType type) {
        return new DocumentTypeDTO(type.getId(), type.getCode(), type.getName(), type.getCategory(), type.getDescription(),
                type.getProviderCode(), type.isSystemManaged(), type.isActive());
    }
}
