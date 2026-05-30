package com.Startup.chalre.service;

import com.Startup.chalre.DTO.RouteOptionDTO;
import com.Startup.chalre.model.RouteResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RouteService {

    @Value("${ors.api.key}")
    private String orsApiKey;

    /** Maximum straight-line km to request alternative routes from public ORS.
     *  Public ORS rejects alternative_routes when actual route distance > 100 km.
     *  We use 85 km as the haversine threshold to leave a safety buffer. */
    private static final double ALT_ROUTE_MAX_HAVERSINE_KM = 85.0;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    // ── Single-route helper used during ride creation ─────────────────────
    public RouteResponse getRoute(double startLng, double startLat,
                                  double endLng, double endLat) {
        List<RouteOptionDTO> options = getRouteOptions(startLng, startLat, endLng, endLat);
        if (options.isEmpty()) {
            return buildFallback(startLat, startLng, endLat, endLng);
        }
        RouteOptionDTO first = options.get(0);
        return new RouteResponse(first.getDistanceKm(), first.getDurationMins() * 60.0,
                first.getPolyline(), first.isFallback());
    }

    // ── Multi-route preview for /api/rides/preview ────────────────────────
    public List<RouteOptionDTO> getRouteOptions(double startLng, double startLat,
                                                double endLng, double endLat) {
        List<RouteOptionDTO> result = new ArrayList<>();
        boolean useAlternatives = haversineKm(startLat, startLng, endLat, endLng)
                <= ALT_ROUTE_MAX_HAVERSINE_KM;
        try {
            // Build JSON body
            ObjectNode body = objectMapper.createObjectNode();
            ArrayNode coordinates = objectMapper.createArrayNode();
            coordinates.add(objectMapper.createArrayNode().add(startLng).add(startLat));
            coordinates.add(objectMapper.createArrayNode().add(endLng).add(endLat));
            body.set("coordinates", coordinates);

            if (useAlternatives) {
                ObjectNode altRoutes = objectMapper.createObjectNode();
                altRoutes.put("target_count", 3);
                altRoutes.put("share_factor", 0.6);
                altRoutes.put("weight_factor", 1.4);
                body.set("alternative_routes", altRoutes);
            }

            String jsonBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openrouteservice.org/v2/directions/driving-car"))
                    .header("Authorization", orsApiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json, application/geo+json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            JsonNode root = objectMapper.readTree(response.body());

            // Check for ORS error response
            if (root.has("error")) {
                System.err.println("ORS error: " + root.get("error").toString());
                result.add(buildFallbackOption(startLat, startLng, endLat, endLng));
                return result;
            }

            // ORS POST /v2/directions returns { "routes": [...] }
            JsonNode routes = root.get("routes");
            if (routes == null || routes.size() == 0) {
                // Try GeoJSON FeatureCollection format fallback
                JsonNode features = root.get("features");
                if (features != null && features.size() > 0) {
                    return parseFeatureCollection(features);
                }
                result.add(buildFallbackOption(startLat, startLng, endLat, endLng));
                return result;
            }

            for (int i = 0; i < routes.size(); i++) {
                JsonNode route = routes.get(i);
                JsonNode summary = route.get("summary");
                double distanceKm = summary.get("distance").asDouble() / 1000.0;
                double durationMins = summary.get("duration").asDouble() / 60.0;
                String polyline = route.get("geometry").asText();
                String viaSummary = extractViaSummary(route);
                result.add(new RouteOptionDTO(i, distanceKm, durationMins, polyline, viaSummary, false));
            }

        } catch (Exception e) {
            System.err.println("ORS call failed: " + e.getMessage() + ", using fallback");
            result.add(buildFallbackOption(startLat, startLng, endLat, endLng));
        }
        return result;
    }

    // ── Parse GeoJSON FeatureCollection format (fallback parser) ──────────
    private List<RouteOptionDTO> parseFeatureCollection(JsonNode features) {
        List<RouteOptionDTO> result = new ArrayList<>();
        for (int i = 0; i < features.size(); i++) {
            JsonNode feature = features.get(i);
            JsonNode props = feature.get("properties");
            JsonNode summary = props != null ? props.get("summary") : null;
            if (summary == null) continue;
            double distanceKm = summary.get("distance").asDouble() / 1000.0;
            double durationMins = summary.get("duration").asDouble() / 60.0;
            JsonNode geometry = feature.get("geometry");
            String polyline = encodePolylineFromGeoJson(geometry.get("coordinates"));
            result.add(new RouteOptionDTO(i, distanceKm, durationMins, polyline, "", false));
        }
        return result;
    }

    // ── Extract a human-readable "Via ..." summary from step names ────────
    private String extractViaSummary(JsonNode route) {
        List<String> roadNames = new ArrayList<>();
        JsonNode segments = route.get("segments");
        if (segments == null) return "";
        for (JsonNode segment : segments) {
            JsonNode steps = segment.get("steps");
            if (steps == null) continue;
            for (JsonNode step : steps) {
                JsonNode nameNode = step.get("name");
                if (nameNode == null) continue;
                String name = nameNode.asText("-");
                if (!name.isBlank() && !name.equals("-") && !roadNames.contains(name)) {
                    roadNames.add(name);
                }
            }
        }
        if (roadNames.isEmpty()) return "";
        String joined = String.join(", ", roadNames.subList(0, Math.min(3, roadNames.size())));
        return "Via " + joined;
    }

    // ── Fallback: straight-line distance using Haversine ─────────────────
    private RouteResponse buildFallback(double startLat, double startLng,
                                        double endLat, double endLng) {
        double distance = haversineKm(startLat, startLng, endLat, endLng);
        double duration = (distance / 60.0) * 3600;
        String polyline = encodeTwoPoints(startLat, startLng, endLat, endLng);
        return new RouteResponse(distance, duration, polyline, true);
    }

    private RouteOptionDTO buildFallbackOption(double startLat, double startLng,
                                               double endLat, double endLng) {
        RouteResponse fb = buildFallback(startLat, startLng, endLat, endLng);
        return new RouteOptionDTO(0, fb.getDistance(), fb.getDuration() / 60.0,
                fb.getPolyline(), "Estimated route", true);
    }

    // ── Haversine distance in km ──────────────────────────────────────────
    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ── Generate intermediate points polyline (start → end) ──────────────
    private String encodeTwoPoints(double startLat, double startLng,
                                   double endLat, double endLng) {
        double totalKm = haversineKm(startLat, startLng, endLat, endLng);
        int numPoints = Math.max(2, (int) Math.ceil(totalKm / 10.0));
        StringBuilder result = new StringBuilder();
        int prevLatE5 = 0, prevLngE5 = 0;
        for (int i = 0; i <= numPoints; i++) {
            double t = (double) i / numPoints;
            double lat = startLat + t * (endLat - startLat);
            double lng = startLng + t * (endLng - startLng);
            int latE5 = (int) Math.round(lat * 1e5);
            int lngE5 = (int) Math.round(lng * 1e5);
            result.append(encodeValue(latE5 - prevLatE5));
            result.append(encodeValue(lngE5 - prevLngE5));
            prevLatE5 = latE5;
            prevLngE5 = lngE5;
        }
        return result.toString();
    }

    // ── Encode GeoJSON coordinate array → Google Polyline format ─────────
    private String encodePolylineFromGeoJson(JsonNode coordinates) {
        StringBuilder result = new StringBuilder();
        int prevLat = 0, prevLng = 0;
        for (JsonNode coord : coordinates) {
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