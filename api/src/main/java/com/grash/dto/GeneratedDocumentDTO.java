package com.grash.dto;

import lombok.Data;

import java.util.Date;

@Data
public class GeneratedDocumentDTO {
    private Long id;
    private String documentType;
    private String sourceType;
    private Long sourceId;
    private Long siteId;
    private String fileName;
    private String sha256;
    private String locale;
    private String templateVersion;
    private Date issuedAt;
    private Long issuedBy;
}
