package com.grash.dto;

import lombok.Data;

import java.util.Date;

@Data
public class CompanyConfigurationAuditDTO {
    private Long id;
    private String entityType;
    private Long entityId;
    private String action;
    private String changedFields;
    private Long actorId;
    private Date occurredAt;
}
