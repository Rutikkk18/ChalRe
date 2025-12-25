package com.Startup.chalre.service;

import com.Startup.chalre.DTO.LocationDTO;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
public class LocationService {

    private final RestTemplate restTemplate;

    public LocationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<LocationDTO> searchLocations(String query) {

        String url = UriComponentsBuilder
                .fromHttpUrl("https://nominatim.openstreetmap.org/search")
                .queryParam("q", query)
                .queryParam("format", "json")
                .queryParam("addressdetails", 1)
                .queryParam("limit", 10)
                .queryParam("countrycodes", "in")
                .toUriString();

        LocationDTO[] response =
                restTemplate.getForObject(url, LocationDTO[].class);

        if (response == null) return Collections.emptyList();

        return Arrays.asList(response);
    }
}
