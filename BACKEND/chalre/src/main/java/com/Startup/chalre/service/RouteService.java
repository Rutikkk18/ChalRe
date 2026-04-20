package com.Startup.chalre.service;

import com.Startup.chalre.model.RouteResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
@RequiredArgsConstructor
public class RouteService {

    @Value("${ors.api.key}")
    private String orsApiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public RouteResponse getRoute(double startLng, double startLat,
                                  double endLng,   double endLat) {
        try {
            String url = "https://api.openrouteservice.org/v2/directions/driving-car"
                    + "?api_key=" + orsApiKey
                    + "&start=" + startLng + "," + startLat
                    + "&end="   + endLng   + "," + endLat;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json, application/geo+json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString()
            );

            JsonNode root      = objectMapper.readTree(response.body());
            JsonNode features  = root.get("features");

            if (features == null || features.size() == 0) {
                throw new RuntimeException("No route found from ORS");
            }

            JsonNode props    = features.get(0).get("properties");
            JsonNode summary  = props.get("summary");
            JsonNode geometry = features.get(0).get("geometry");

            double distance = summary.get("distance").asDouble() / 1000.0; // metres → km
            double duration = summary.get("duration").asDouble();           // seconds

            // ORS returns GeoJSON coordinates — we encode to polyline ourselves
            JsonNode coords = geometry.get("coordinates");
            String polyline = encodePolyline(coords);

            return new RouteResponse(distance, duration, polyline);

        } catch (Exception e) {
            throw new RuntimeException("Failed to get route from ORS: " + e.getMessage(), e);
        }
    }

    // Encode GeoJSON coordinate array → Google Polyline format
    private String encodePolyline(JsonNode coordinates) {
        StringBuilder result = new StringBuilder();
        int prevLat = 0, prevLng = 0;

        for (JsonNode coord : coordinates) {
            // GeoJSON is [lng, lat]
            double lat = coord.get(1).asDouble();
            double lng = coord.get(0).asDouble();

            int latE5 = (int) Math.round(lat * 1e5);
            int lngE5 = (int) Math.round(lng * 1e5);

            result.append(encodeValue(latE5 - prevLat));
            result.append(encodeValue(lngE5 - prevLng));

            prevLat = latE5;
            prevLng = lngE5;
        }
        return result.toString();
    }

    private String encodeValue(int value) {
        value = value < 0 ? ~(value << 1) : (value << 1);
        StringBuilder chunk = new StringBuilder();
        while (value >= 0x20) {
            chunk.append((char) ((0x20 | (value & 0x1f)) + 63));
            value >>= 5;
        }
        chunk.append((char) (value + 63));
        return chunk.toString();
    }
}