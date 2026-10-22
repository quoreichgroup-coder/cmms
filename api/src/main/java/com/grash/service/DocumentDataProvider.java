package com.grash.service;

import java.util.Map;
import java.util.Set;

/** A server-registered, authorization-aware source of typed document field values. */
public interface DocumentDataProvider {
    String providerCode();
    boolean supports(String fieldKey);
    Map<String, Object> resolve(Object authorizedSource,
                                DocumentContextResolver.DocumentContext context,
                                Set<String> requestedFields);
}
