package com.Startup.chalre.service;

import com.Startup.chalre.model.LatLng;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class MapService {

    private final ConcurrentHashMap<String, LatLng> cache = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    // ── Rate limiting: Nominatim allows 1 req/sec ──
    private long lastRequestTime = 0;
    private static final long MIN_INTERVAL_MS = 1100;

    public LatLng getCoordinates(String place) {
        if (place == null || place.isBlank()) return null;

        String key = place.trim().toLowerCase();

        // Return cached result if available
        if (cache.containsKey(key)) {
            return cache.get(key);
        }

        // ── Rate limit ──
        synchronized (this) {
            long now = System.currentTimeMillis();
            long elapsed = now - lastRequestTime;
            if (elapsed < MIN_INTERVAL_MS) {
                try {
                    Thread.sleep(MIN_INTERVAL_MS - elapsed);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            lastRequestTime = System.currentTimeMillis();
        }

        try {
            String encoded = URLEncoder.encode(place.trim(), StandardCharsets.UTF_8);
            String url = "https://nominatim.openstreetmap.org/search?q="
                    + encoded
                    + "&format=json&limit=1&countrycodes=in";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "ChalreApp/1.0 (chalreofficial@gmail.com)")
                    .header("Accept-Language", "en")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString()
            );

            // ── Check HTTP status ──
            if (response.statusCode() != 200) {
                System.err.println("Nominatim returned status "
                        + response.statusCode() + " for: " + place);
                return null; // return null instead of throwing
            }

            JsonNode root = objectMapper.readTree(response.body());

            if (root.isArray() && root.size() > 0) {
                JsonNode first = root.get(0);
                double lat = first.get("lat").asDouble();
                double lng = first.get("lon").asDouble();
                LatLng result = new LatLng(lat, lng);
                cache.put(key, result);
                return result;
            }

            System.err.println("Nominatim: no results for: " + place);
            return null; // return null instead of throwing

        } catch (Exception e) {
            System.err.println("MapService error for: " + place + " → " + e.getMessage());
            return null; // return null instead of throwing
        }
    }
}