package com.grash.service;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** Creates a bounded HTTP client for outbound webhook delivery. */
final class WebhookHttpClientFactory {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    private WebhookHttpClientFactory() {
    }

    static RestTemplate create() {
        RestTemplate restTemplate = new RestTemplate(createRequestFactory());
        restTemplate.setErrorHandler(new StatusOnlyErrorHandler());
        return restTemplate;
    }

    static SimpleClientHttpRequestFactory createRequestFactory() {
        SimpleClientHttpRequestFactory requestFactory = new RedirectDisabledRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        return requestFactory;
    }

    static void writeJsonPayload(OutputStream output, String jsonPayload) throws IOException {
        output.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
    }

    static final class RedirectDisabledRequestFactory extends SimpleClientHttpRequestFactory {
        @Override
        protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws IOException {
            super.prepareConnection(connection, httpMethod);
            // A redirect must never bypass the destination checks performed for the configured URL.
            connection.setInstanceFollowRedirects(false);
        }

        void configure(HttpURLConnection connection, String httpMethod) throws IOException {
            prepareConnection(connection, httpMethod);
        }
    }

    static final class StatusOnlyErrorHandler implements ResponseErrorHandler {
        @Override
        public boolean hasError(ClientHttpResponse response) throws IOException {
            return response.getStatusCode().value() >= 300;
        }

        @Override
        public void handleError(ClientHttpResponse response) throws IOException {
            // Avoid buffering arbitrary response bodies from third-party webhook receivers.
            throw new IOException("Webhook returned HTTP " + response.getStatusCode().value());
        }
    }

}
