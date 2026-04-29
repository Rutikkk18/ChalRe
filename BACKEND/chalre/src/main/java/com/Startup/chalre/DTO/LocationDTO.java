package com.Startup.chalre.DTO;

import com.fasterxml.jackson.annotation.JsonProperty;

public class LocationDTO {

    @JsonProperty("display_name")
    private String displayName;

    private String lat;
    private String lon;

    @JsonProperty("name")
    public String getName() {
        return displayName;
    }

    @JsonProperty("lng")
    public String getLng() {
        return lon;
    }

    public String getLat() { return lat; }

    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public void setLat(String lat) { this.lat = lat; }
    public void setLon(String lon) { this.lon = lon; }
}