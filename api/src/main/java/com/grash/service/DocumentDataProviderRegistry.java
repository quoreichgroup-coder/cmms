package com.grash.service;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Registry contains only providers explicitly wired into the application. */
@Component
public class DocumentDataProviderRegistry {
    private final Map<String, DocumentDataProvider> providers;

    public DocumentDataProviderRegistry(List<DocumentDataProvider> providers) {
        this.providers = providers.stream().collect(Collectors.toUnmodifiableMap(
                DocumentDataProvider::providerCode, Function.identity()));
    }

    public DocumentDataProvider require(String code) {
        DocumentDataProvider provider = providers.get(code);
        if (provider == null) throw new IllegalArgumentException("Unregistered document data provider: " + code);
        return provider;
    }

    public boolean contains(String code) {
        return providers.containsKey(code);
    }
}
