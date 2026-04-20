package com.Startup.chalre.utils;

import com.Startup.chalre.model.LatLng;
import java.util.ArrayList;
import java.util.List;

public class PolylineUtils {

    private static final double MATCH_RADIUS_KM = 2.0; // 2km threshold

    // Decode encoded polyline → list of LatLng points
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

    // Check if a point is within MATCH_RADIUS_KM of any point on the route
    public static boolean isPointNearRoute(LatLng point, String encodedPolyline) {
        if (encodedPolyline == null || encodedPolyline.isEmpty()) return false;

        List<LatLng> routePoints = decode(encodedPolyline);
        for (LatLng routePoint : routePoints) {
            if (haversineKm(point, routePoint) <= MATCH_RADIUS_KM) {
                return true;
            }
        }
        return false;
    }

    // Haversine formula — distance between two lat/lng points in km
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
}