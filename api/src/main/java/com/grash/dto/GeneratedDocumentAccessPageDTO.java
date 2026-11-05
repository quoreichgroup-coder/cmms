package com.grash.dto;

import java.util.List;

public record GeneratedDocumentAccessPageDTO(
        List<GeneratedDocumentAccessEventDTO> content,
        long totalElements,
        int totalPages,
        int page,
        int size) { }
