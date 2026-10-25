package com.Startup.chalre.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.CorsProcessor;
import org.springframework.web.cors.DefaultCorsProcessor;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SecurityCorsTest {

    private SecurityConfig securityConfig;
    private CorsConfigurationSource corsConfigurationSource;
    private final CorsProcessor corsProcessor = new DefaultCorsProcessor();

    @BeforeEach
    void setUp() {
        securityConfig = new SecurityConfig(null, null);
        ReflectionTestUtils.setField(
                securityConfig,
                "allowedOrigins",
                List.of(
                        "https://chalre-staging.vercel.app",
                        "https://staging.chalre.in",
                        "https://chalre.in",
                        "https://chalre.vercel.app",
                        "http://localhost:5173",
                        "http://localhost:3000"
                )
        );
        corsConfigurationSource = securityConfig.corsConfigurationSource();
    }

    @Test
    @DisplayName("Preflight OPTIONS for /api/auth/firebase-login from staging Vercel origin succeeds with allow origin")
    void testPreflightOptionsFromStagingVercel() throws IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/auth/firebase-login");
        request.addHeader("Origin", "https://chalre-staging.vercel.app");
        request.addHeader("Access-Control-Request-Method", "POST");
        request.addHeader("Access-Control-Request-Headers", "Content-Type, Authorization, X-Client-Type");

        MockHttpServletResponse response = new MockHttpServletResponse();
        CorsConfiguration config = corsConfigurationSource.getCorsConfiguration(request);

        assertNotNull(config, "CORS configuration must match for /api/auth/firebase-login");
        boolean isValid = corsProcessor.processRequest(config, request, response);

        assertTrue(isValid, "CORS preflight request must be accepted");
        assertEquals("https://chalre-staging.vercel.app", response.getHeader("Access-Control-Allow-Origin"));
        assertTrue(response.getHeader("Access-Control-Allow-Methods").contains("POST"));
        assertTrue(response.getHeader("Access-Control-Allow-Methods").contains("OPTIONS"));
        assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
        assertTrue(response.getHeader("Access-Control-Allow-Headers").contains("Content-Type"));
        assertTrue(response.getHeader("Access-Control-Allow-Headers").contains("Authorization"));
        assertTrue(response.getHeader("Access-Control-Allow-Headers").contains("X-Client-Type"));
    }

    @Test
    @DisplayName("Preflight OPTIONS from staging custom domain staging.chalre.in succeeds")
    void testPreflightFromStagingCustomDomain() throws IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/auth/firebase-login");
        request.addHeader("Origin", "https://staging.chalre.in");
        request.addHeader("Access-Control-Request-Method", "POST");
        request.addHeader("Access-Control-Request-Headers", "Content-Type");

        MockHttpServletResponse response = new MockHttpServletResponse();
        CorsConfiguration config = corsConfigurationSource.getCorsConfiguration(request);

        assertNotNull(config);
        boolean isValid = corsProcessor.processRequest(config, request, response);

        assertTrue(isValid);
        assertEquals("https://staging.chalre.in", response.getHeader("Access-Control-Allow-Origin"));
    }

    @Test
    @DisplayName("Production origins chalre.in and chalre.vercel.app remain allowed")
    void testProductionOriginsRemainAllowed() throws IOException {
        for (String prodOrigin : List.of("https://chalre.in", "https://chalre.vercel.app")) {
            MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/auth/firebase-login");
            request.addHeader("Origin", prodOrigin);
            request.addHeader("Access-Control-Request-Method", "POST");
            request.addHeader("Access-Control-Request-Headers", "Content-Type");

            MockHttpServletResponse response = new MockHttpServletResponse();
            CorsConfiguration config = corsConfigurationSource.getCorsConfiguration(request);

            assertNotNull(config);
            boolean isValid = corsProcessor.processRequest(config, request, response);

            assertTrue(isValid);
            assertEquals(prodOrigin, response.getHeader("Access-Control-Allow-Origin"));
        }
    }

    @Test
    @DisplayName("Unapproved origin is rejected and does not receive Access-Control-Allow-Origin")
    void testUnapprovedOriginRejected() throws IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/auth/firebase-login");
        request.addHeader("Origin", "https://unauthorized-evil-site.com");
        request.addHeader("Access-Control-Request-Method", "POST");
        request.addHeader("Access-Control-Request-Headers", "Content-Type");

        MockHttpServletResponse response = new MockHttpServletResponse();
        CorsConfiguration config = corsConfigurationSource.getCorsConfiguration(request);

        assertNotNull(config);
        boolean isValid = corsProcessor.processRequest(config, request, response);

        assertFalse(isValid, "Unapproved origin must fail CORS processing");
        assertNull(response.getHeader("Access-Control-Allow-Origin"), "No Access-Control-Allow-Origin header must be present for unapproved origin");
    }

    @Test
    @DisplayName("POST request from staging origin is permitted by CORS")
    void testActualPostRequestPermitted() throws IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/firebase-login");
        request.addHeader("Origin", "https://chalre-staging.vercel.app");
        request.addHeader("Content-Type", "application/json");

        MockHttpServletResponse response = new MockHttpServletResponse();
        CorsConfiguration config = corsConfigurationSource.getCorsConfiguration(request);

        assertNotNull(config);
        boolean isValid = corsProcessor.processRequest(config, request, response);

        assertTrue(isValid, "Actual POST request must be valid according to CORS processor");
        assertEquals("https://chalre-staging.vercel.app", response.getHeader("Access-Control-Allow-Origin"));
    }
}
