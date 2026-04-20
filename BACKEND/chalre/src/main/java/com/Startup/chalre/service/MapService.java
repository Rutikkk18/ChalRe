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

    // Simple in-memory cache — no extra dependency needed
    private final ConcurrentHashMap<String, LatLng> cache = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public LatLng getCoordinates(String place) {
        String key = place.trim().toLowerCase();

        // Return cached result if available
        if (cache.containsKey(key)) {
            return cache.get(key);
        }

        try {
            String encoded = URLEncoder.encode(place, StandardCharsets.UTF_8);
            String url = "https://nominatim.openstreetmap.org/search?q="
                    + encoded
                    + "&format=json&limit=1&countrycodes=in";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "ChalreApp/1.0 (chalre@startup.com)")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString()
            );

            JsonNode root = objectMapper.readTree(response.body());

            if (root.isArray() && root.size() > 0) {
                JsonNode first = root.get(0);
                double lat = first.get("lat").asDouble();
                double lng = first.get("lon").asDouble();
                LatLng result = new LatLng(lat, lng);
                cache.put(key, result);   // Cache it
                return result;
            }

        } catch (Exception e) {
            throw new RuntimeException("Failed to get coordinates for: " + place, e);
        }

        throw new RuntimeException("Location not found: " + place);
    }
}