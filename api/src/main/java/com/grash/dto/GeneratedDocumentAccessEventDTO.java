package com.grash.dto;

import java.util.Date;

public record GeneratedDocumentAccessEventDTO(
        Long id,
        Long generatedDocumentId,
        String sourceType,
        Long sourceId,
        Long actorId,
        String actorName,
        String outcome,
        Date accessedAt) { }
