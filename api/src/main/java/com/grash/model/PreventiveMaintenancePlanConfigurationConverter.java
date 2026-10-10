package com.grash.model;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class PreventiveMaintenancePlanConfigurationConverter
        implements AttributeConverter<PreventiveMaintenancePlanConfiguration, String> {
    private static final ObjectMapper MAPPER = new ObjectMapper().findAndRegisterModules();

    @Override
    public String convertToDatabaseColumn(PreventiveMaintenancePlanConfiguration value) {
        if (value == null) return null;
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Could not serialize preventive maintenance plan configuration", exception);
        }
    }

    @Override
    public PreventiveMaintenancePlanConfiguration convertToEntityAttribute(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return MAPPER.readValue(value, PreventiveMaintenancePlanConfiguration.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Could not deserialize preventive maintenance plan configuration", exception);
        }
    }
}
