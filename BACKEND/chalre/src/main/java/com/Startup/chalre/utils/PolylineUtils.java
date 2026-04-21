package com.Startup.chalre.utils;

import com.Startup.chalre.model.LatLng;
import java.util.ArrayList;
import java.util.List;

public class PolylineUtils {

    private static final double MATCH_RADIUS_KM = 5.0; // increased to 5km for better matching

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

    // Check if a point is within MATCH_RADIUS_KM of the route
    // Checks BOTH point-to-point AND point-to-segment distance
    public static boolean isPointNearRoute(LatLng point, String encodedPolyline) {
        if (encodedPolyline == null || encodedPolyline.isEmpty()) return false;

        List<LatLng> routePoints = decode(encodedPolyline);

        if (routePoints.isEmpty()) return false;

        // Check each point on route
        for (LatLng routePoint : routePoints) {
            if (haversineKm(point, routePoint) <= MATCH_RADIUS_KM) {
                return true;
            }
        }

        // ── KEY FIX: Check distance to each LINE SEGMENT ──
        // This handles fallback 2-point polylines (straight line)
        // and also improves matching for full polylines
        for (int i = 0; i < routePoints.size() - 1; i++) {
            LatLng segStart = routePoints.get(i);
            LatLng segEnd   = routePoints.get(i + 1);
            if (distanceToSegmentKm(point, segStart, segEnd) <= MATCH_RADIUS_KM) {
                return true;
            }
        }

        return false;
    }

    // Distance from point P to line segment AB (in km)
    // Projects P onto AB, clamps to segment, returns distance
    private static double distanceToSegmentKm(LatLng p, LatLng a, LatLng b) {
        double ax = a.getLng(), ay = a.getLat();
        double bx = b.getLng(), by = b.getLat();
        double px = p.getLng(), py = p.getLat();

        double dx = bx - ax;
        double dy = by - ay;

        if (dx == 0 && dy == 0) {
            // Segment is a single point
            return haversineKm(p, a);
        }

        // Parameter t: projection of P onto AB, clamped [0,1]
        double t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t));

        // Closest point on segment to P
        LatLng closest = new LatLng(ay + t * dy, ax + t * dx);
        return haversineKm(p, closest);
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