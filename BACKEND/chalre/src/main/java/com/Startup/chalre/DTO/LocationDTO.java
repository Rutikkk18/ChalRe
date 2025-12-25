package com.Startup.chalre.DTO;

import com.fasterxml.jackson.annotation.JsonProperty;

public class LocationDTO {

    @JsonProperty("display_name")
    private String name;

    private String lat;
    private String lon;

    public String getName() {          // ✅ FIX
        return name;
    }

    public void setName(String name) { // ✅ FIX
        this.name = name;
    }

    public String getLat() {
        return lat;
    }

    public void setLat(String lat) {
        this.lat = lat;
    }

    public String getLon() {
        return lon;
    }

    public void setLon(String lon) {
        this.lon = lon;
    }
}

