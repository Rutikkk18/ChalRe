package com.Startup.chalre.utils;

import com.Startup.chalre.model.LatLng;
import java.util.ArrayList;
import java.util.List;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.PrecisionModel;

public class PolylineUtils {

    // ── REDUCED from 35km → 15km ──────────────────────────────────────────────
    // 35km was too generous: a city 20km off-route was matching as "near route"
    // 15km still covers wide highways and village offsets without false positives
    private static final double MATCH_RADIUS_KM = 15.0;

    public static List<LatLng> decode(String encoded) {
        List<LatLng> points = new ArrayList<>();
        int index = 0, len = encoded.length();
        int lat = 0, lng = 0;

        while (index < len) {
            int b, shift = 0, result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0; result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.add(new LatLng(lat / 1e5, lng / 1e5));
        }
        return points;
    }



    public static double haversineKm(LatLng a, LatLng b) {
        final int R = 6371;
        double dLat = Math.toRadians(b.getLat() - a.getLat());
        double dLng = Math.toRadians(b.getLng() - a.getLng());

        double sinLat = Math.sin(dLat / 2);
        double sinLng = Math.sin(dLng / 2);

        double h = sinLat * sinLat
                + Math.cos(Math.toRadians(a.getLat()))
                * Math.cos(Math.toRadians(b.getLat()))
                * sinLng * sinLng;

        return R * 2 * Math.asin(Math.sqrt(h));
    }

    public static LineString createJTSLineString(List<LatLng> points) {
        if (points == null || points.size() < 2) return null;
        GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        Coordinate[] coordinates = new Coordinate[points.size()];
        for (int i = 0; i < points.size(); i++) {
            // Note: JTS Coordinate uses (x, y) which means (longitude, latitude)
            coordinates[i] = new Coordinate(points.get(i).getLng(), points.get(i).getLat());
        }
        return geometryFactory.createLineString(coordinates);
    }
}