package com.grash.configuration;

import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder()
                .group("qpm")
                .pathsToMatch("/**")
                .build();
    }

    /** Former group name, kept so existing API clients reading /v3/api-docs/atlas-cmms keep working. */
    @Bean
    public GroupedOpenApi legacyPublicApi() {
        return GroupedOpenApi.builder()
                .group("atlas-cmms")
                .pathsToMatch("/**")
                .build();
    }
}
