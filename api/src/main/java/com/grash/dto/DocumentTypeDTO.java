package com.grash.dto;

import com.grash.model.DocumentType;

public record DocumentTypeDTO(String code, String name, String category, String description,
                              String providerCode, boolean systemManaged) {
    public static DocumentTypeDTO from(DocumentType type) {
        return new DocumentTypeDTO(type.getCode(), type.getName(), type.getCategory(), type.getDescription(),
                type.getProviderCode(), type.isSystemManaged());
    }
}
