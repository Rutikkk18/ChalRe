package com.Startup.chalre.service;

import com.Startup.chalre.DTO.LocationDTO;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
public class LocationService {

    @Value("${LOCATIONIQ_API_KEY}")
    private String locationIqApiKey;

    private final RestTemplate restTemplate;

    // ── Thread-safe cache ──────────────────────────────────────
    private final Map<String, List<LocationDTO>> cache
            = Collections.synchronizedMap(
                new LinkedHashMap<>(128, 0.75f, true) {
                    @Override
                    protected boolean removeEldestEntry(
                            Map.Entry<String, List<LocationDTO>> eldest) {
                        return size() > 200;
                    }
                }
              );

    public LocationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<LocationDTO> searchLocations(String query) {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }

        String trimmedQuery = query.trim();
        String cacheKey = trimmedQuery.toLowerCase();

        // ── Return cached result if available — no blocking ──
        List<LocationDTO> cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        // ── Step 1: Try LocationIQ Autocomplete (fast type-ahead) ──
        List<LocationDTO> results = queryAutocomplete(trimmedQuery);

        // ── Step 2: Fallback to LocationIQ Forward Search if autocomplete yielded no results ──
        // (Useful for villages, rural areas, or alternative spellings where autocomplete misses)
        if (results == null || results.isEmpty()) {
            results = querySearchFallback(trimmedQuery);
        }

        if (results == null) {
            results = Collections.emptyList();
        }

        cache.put(cacheKey, results);
        return results;
    }

    private List<LocationDTO> queryAutocomplete(String query) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl("https://api.locationiq.com/v1/autocomplete")
                    .queryParam("key", locationIqApiKey)
                    .queryParam("q", query)
                    .queryParam("limit", 5)
                    .queryParam("countrycodes", "in")
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<LocationDTO[]> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, LocationDTO[].class
            );

            LocationDTO[] body = response.getBody();
            if (body != null && body.length > 0) {
                return Collections.unmodifiableList(Arrays.asList(body));
            }
        } catch (Exception e) {
            // LocationIQ returns 404 when no autocomplete matches are found
            System.out.println("Autocomplete returned no matches for '" + query + "': " + e.getMessage());
        }
        return Collections.emptyList();
    }

    private List<LocationDTO> querySearchFallback(String query) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl("https://api.locationiq.com/v1/search")
                    .queryParam("key", locationIqApiKey)
                    .queryParam("q", query)
                    .queryParam("format", "json")
                    .queryParam("limit", 5)
                    .queryParam("countrycodes", "in")
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<LocationDTO[]> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, LocationDTO[].class
            );

            LocationDTO[] body = response.getBody();
            if (body != null && body.length > 0) {
                return Collections.unmodifiableList(Arrays.asList(body));
            }
        } catch (Exception e) {
            System.err.println("Search fallback failed for: " + query + " → " + e.getMessage());
        }
        return Collections.emptyList();
    }
}
