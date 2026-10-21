package com.grash.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WebhookHttpClientFactoryTest {

    @Test
    void disablesRedirectFollowingOnConnections() throws Exception {
        WebhookHttpClientFactory.RedirectDisabledRequestFactory factory =
                (WebhookHttpClientFactory.RedirectDisabledRequestFactory) WebhookHttpClientFactory.createRequestFactory();
        HttpURLConnection connection = new StubHttpURLConnection(new URL("http://example.invalid/"));
        connection.setInstanceFollowRedirects(true);

        factory.prepareConnection(connection, "POST");

        assertFalse(connection.getInstanceFollowRedirects());
    }

    @Test
    void reportsRedirectsAsErrorsWithoutReadingResponseBody() throws Exception {
        WebhookHttpClientFactory.StatusOnlyErrorHandler handler =
                new WebhookHttpClientFactory.StatusOnlyErrorHandler();
        ClientHttpResponse response = new ClientHttpResponse() {
            @Override
            public HttpStatus getStatusCode() {
                return HttpStatus.FOUND;
            }

            @Override
            public String getStatusText() {
                return "Found";
            }

            @Override
            public void close() {
            }

            @Override
            public InputStream getBody() {
                throw new AssertionError("Webhook response body must not be read");
            }

            @Override
            public HttpHeaders getHeaders() {
                return new HttpHeaders();
            }
        };

        assertTrue(handler.hasError(response));
        assertThrows(IOException.class, () -> handler.handleError(response));
    }

    @Test
    void writesSerializedPayloadAsRawUtf8Json() throws Exception {
        String payload = "{\"maintenance\":\"pompe é\",\"active\":true}";
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        WebhookHttpClientFactory.writeJsonPayload(output, payload);

        assertEquals(payload, output.toString(StandardCharsets.UTF_8));
    }

    private static final class StubHttpURLConnection extends HttpURLConnection {
        private StubHttpURLConnection(URL url) {
            super(url);
        }

        @Override
        public void disconnect() {
        }

        @Override
        public boolean usingProxy() {
            return false;
        }

        @Override
        public void connect() throws IOException {
        }
    }
}
