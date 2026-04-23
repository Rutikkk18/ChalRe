package com.Startup.chalre.utils;

import com.Startup.chalre.model.LatLng;
import java.util.ArrayList;
import java.util.List;

public class PolylineUtils {

    private static final double MATCH_RADIUS_KM = 20.0; // 10km for text-based searches

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

        // Check each line segment
        for (int i = 0; i < routePoints.size() - 1; i++) {
            if (distanceToSegmentKm(point, routePoints.get(i), routePoints.get(i + 1))
                    <= MATCH_RADIUS_KM) {
                return true;
            }
        }

        return false;
    }

    // ── FIXED: proper spherical segment distance ──────────────
    private static double distanceToSegmentKm(LatLng p, LatLng a, LatLng b) {

        // Convert all points to radians
        double lat1 = Math.toRadians(a.getLat());
        double lng1 = Math.toRadians(a.getLng());
        double lat2 = Math.toRadians(b.getLat());
        double lng2 = Math.toRadians(b.getLng());
        double latP = Math.toRadians(p.getLat());
        double lngP = Math.toRadians(p.getLng());

        // Vector AB and AP in 3D cartesian (unit sphere)
        double[] A = toCartesian(lat1, lng1);
        double[] B = toCartesian(lat2, lng2);
        double[] P = toCartesian(latP, lngP);

        // Project P onto line AB, clamp to segment
        double[] AB = subtract(B, A);
        double[] AP = subtract(P, A);

        double t = dot(AP, AB) / dot(AB, AB);
        t = Math.max(0, Math.min(1, t));  // clamp to [0,1]

        // Closest point on segment
        double[] closest = add(A, scale(AB, t));

        // Normalize back to unit sphere
        double len = Math.sqrt(dot(closest, closest));
        closest[0] /= len;
        closest[1] /= len;
        closest[2] /= len;

        // Convert back to lat/lng
        double closestLat = Math.asin(closest[2]);
        double closestLng = Math.atan2(closest[1], closest[0]);

        LatLng closestPoint = new LatLng(
            Math.toDegrees(closestLat),
            Math.toDegrees(closestLng)
        );

        return haversineKm(p, closestPoint);
    }

    private static double[] toCartesian(double lat, double lng) {
        return new double[]{
            Math.cos(lat) * Math.cos(lng),
            Math.cos(lat) * Math.sin(lng),
            Math.sin(lat)
        };
    }

    private static double[] subtract(double[] a, double[] b) {
        return new double[]{ a[0]-b[0], a[1]-b[1], a[2]-b[2] };
    }

    private static double[] add(double[] a, double[] b) {
        return new double[]{ a[0]+b[0], a[1]+b[1], a[2]+b[2] };
    }

    private static double[] scale(double[] a, double t) {
        return new double[]{ a[0]*t, a[1]*t, a[2]*t };
    }

    private static double dot(double[] a, double[] b) {
        return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
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
}