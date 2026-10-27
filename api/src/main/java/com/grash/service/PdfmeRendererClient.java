package com.grash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.exception.CustomException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/** Server-to-server PDFME rendering. The browser never submits an issued PDF artifact. */
@Component
@Slf4j
public class PdfmeRendererClient {
    private static final int MAX_REQUEST_BYTES = 8 * 1024 * 1024;
    private static final int MAX_RESPONSE_BYTES = 20 * 1024 * 1024;
    private final ObjectMapper objectMapper;
    private final String rendererUrl;
    private final String rendererToken;
    private final HttpClient httpClient;

    public PdfmeRendererClient(ObjectMapper objectMapper,
                               @Value("${PDFME_RENDERER_URL:}") String rendererUrl,
                               @Value("${PDFME_RENDERER_TOKEN:}") String rendererToken) {
        this.objectMapper = objectMapper;
        this.rendererUrl = rendererUrl == null ? "" : rendererUrl.trim();
        this.rendererToken = rendererToken == null ? "" : rendererToken.trim();
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    }

    public boolean isAvailable() {
        return !rendererUrl.isBlank() && rendererToken.length() >= 32;
    }

    public byte[] render(JsonNode template, List<Map<String, Object>> inputs) {
        if (!isAvailable()) throw new CustomException("PDFME renderer is not configured", HttpStatus.SERVICE_UNAVAILABLE);
        try {
            byte[] payload = objectMapper.writeValueAsBytes(Map.of("template", template, "inputs", inputs));
            if (payload.length > MAX_REQUEST_BYTES) {
                throw new CustomException("PDFME render payload is too large", HttpStatus.PAYLOAD_TOO_LARGE);
            }
            String base = rendererUrl.endsWith("/")
                    ? rendererUrl.substring(0, rendererUrl.length() - 1) : rendererUrl;
            HttpRequest request = HttpRequest.newBuilder(URI.create(base + "/render"))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/pdf")
                    .header("X-QPM-PDFME-Token", rendererToken)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(payload))
                    .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.body().length > MAX_RESPONSE_BYTES) {
                throw new CustomException("PDFME renderer response is too large", HttpStatus.BAD_GATEWAY);
            }
            if (response.statusCode() != 200 || response.body().length < 5
                    || response.body()[0] != '%' || response.body()[1] != 'P'
                    || response.body()[2] != 'D' || response.body()[3] != 'F') {
                log.warn("PDFME renderer rejected a server-validated document (status={})", response.statusCode());
                throw new CustomException("PDFME document rendering failed", HttpStatus.BAD_GATEWAY);
            }
            return response.body();
        } catch (CustomException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new CustomException("PDFME document rendering was interrupted", HttpStatus.SERVICE_UNAVAILABLE);
        } catch (Exception exception) {
            log.warn("PDFME renderer is unreachable or returned an invalid response: {}", exception.getClass().getSimpleName());
            throw new CustomException("PDFME renderer is unavailable", HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
