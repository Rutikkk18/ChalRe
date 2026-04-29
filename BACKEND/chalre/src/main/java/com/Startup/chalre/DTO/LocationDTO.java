public class LocationDTO {

    @JsonProperty("display_name") // reads "display_name" from Nominatim
    private String displayName;   // stored internally as displayName

    private String lat;
    private String lon;

    // ── Serialize to frontend with clean field names ──
    @JsonProperty("name")         // frontend receives "name" ✅
    public String getName() {
        return displayName;
    }

    @JsonProperty("lng")          // frontend receives "lng" ✅
    public String getLng() {
        return lon;
    }

    public String getLat() { return lat; }

    // setters for Jackson deserialization
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public void setLat(String lat) { this.lat = lat; }
    public void setLon(String lon) { this.lon = lon; }
}