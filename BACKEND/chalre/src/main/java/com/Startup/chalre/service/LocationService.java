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
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LocationService {

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

        String cacheKey = query.trim().toLowerCase();

        // ── Return cached result if available — no blocking ──
        List<LocationDTO> cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        String url = UriComponentsBuilder
                .fromHttpUrl("https://api.locationiq.com/v1/autocomplete")
                .queryParam("key", "pk.902213fbf559ab93b6f1b9fa744ddbfa")
                .queryParam("q", query.trim())
                .queryParam("limit", 5)
                .queryParam("countrycodes", "in")
                .toUriString();



        HttpHeaders headers = new HttpHeaders();

        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<LocationDTO[]> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, LocationDTO[].class
            );

            LocationDTO[] body = response.getBody();
            List<LocationDTO> result = (body == null)
                    ? Collections.emptyList()
                    : Collections.unmodifiableList(Arrays.asList(body));

            cache.put(cacheKey, result);
            return result;

        } catch (Exception e) {
            System.err.println("Location search failed for: "
                    + query + " → " + e.getMessage());
            return Collections.emptyList();
        }
    }
}