package com.grash.dto;

import java.util.List;
import java.util.Map;

/** Bounded table preview containing only selected, authorized columns. */
public record ReportTablePreviewDTO(String status, int totalCount, List<Map<String, String>> rows) {
}
