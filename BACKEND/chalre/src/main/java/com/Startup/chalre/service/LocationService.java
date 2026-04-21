package com.Startup.chalre.service;

import com.Startup.chalre.DTO.LocationDTO;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
public class LocationService {

    private final RestTemplate restTemplate;

    // ── Rate limiting: Nominatim allows max 1 request/second ──
    private long lastRequestTime = 0;
    private static final long MIN_INTERVAL_MS = 1100;

    // ── Simple cache: avoid re-calling Nominatim for same query ──
    private final Map<String, List<LocationDTO>> cache = new LinkedHashMap<>() {
        protected boolean removeEldestEntry(Map.Entry<String, List<LocationDTO>> eldest) {
            return size() > 100; // keep max 100 cached queries
        }
    };

    public LocationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<LocationDTO> searchLocations(String query) {

        String cacheKey = query.trim().toLowerCase();

        // ── Return cached result if available ──
        if (cache.containsKey(cacheKey)) {
            return cache.get(cacheKey);
        }

        // ── Rate limit: wait if last request was too recent ──
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

        String url = UriComponentsBuilder
                .fromHttpUrl("https://nominatim.openstreetmap.org/search")
                .queryParam("q", query)
                .queryParam("format", "json")
                .queryParam("addressdetails", 1)
                .queryParam("limit", 5)
                .queryParam("countrycodes", "in")
                .toUriString();

        // ── Required User-Agent header (Nominatim policy) ──
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "ChalreApp/1.0 (chalreofficial@gmail.com)");
        headers.set("Accept-Language", "en");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<LocationDTO[]> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, LocationDTO[].class
            );

            LocationDTO[] body = response.getBody();
            List<LocationDTO> result = (body == null)
                    ? Collections.emptyList()
                    : Arrays.asList(body);

            // ── Cache the result ──
            cache.put(cacheKey, result);

            return result;

        } catch (Exception e) {
            System.err.println("Location search failed for: "
                    + query + " → " + e.getMessage());
            return Collections.emptyList();
        }
    }
}