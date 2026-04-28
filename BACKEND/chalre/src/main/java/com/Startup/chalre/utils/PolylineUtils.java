package com.Startup.chalre.utils;

import java.util.ArrayList;
import java.util.List;

import com.Startup.chalre.model.LatLng;

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

    public static boolean isPointNearRoute(LatLng point, String encodedPolyline) {
        if (encodedPolyline == null || encodedPolyline.isEmpty()) return false;

        List<LatLng> routePoints = decode(encodedPolyline);
        if (routePoints.isEmpty()) return false;

        // Fast fail — skip obviously far-away routes
        LatLng first = routePoints.get(0);
        LatLng last  = routePoints.get(routePoints.size() - 1);

        double distStart = haversineKm(point, first);
        double distEnd   = haversineKm(point, last);

        if (Math.min(distStart, distEnd) > 500) return false;

        // Check each point
        for (LatLng routePoint : routePoints) {
            if (haversineKm(point, routePoint) <= MATCH_RADIUS_KM) {
                return true;
            }
        }

        // Check each segment
        for (int i = 0; i < routePoints.size() - 1; i++) {
            if (distanceToSegmentKm(point, routePoints.get(i), routePoints.get(i + 1))
                    <= MATCH_RADIUS_KM) {
                return true;
            }
        }

        return false;
    }

    private static double distanceToSegmentKm(LatLng p, LatLng a, LatLng b) {

        double lat1 = Math.toRadians(a.getLat());
        double lng1 = Math.toRadians(a.getLng());
        double lat2 = Math.toRadians(b.getLat());
        double lng2 = Math.toRadians(b.getLng());
        double latP = Math.toRadians(p.getLat());
        double lngP = Math.toRadians(p.getLng());

        double[] A = toCartesian(lat1, lng1);
        double[] B = toCartesian(lat2, lng2);
        double[] P = toCartesian(latP, lngP);

        double[] AB = subtract(B, A);
        double[] AP = subtract(P, A);

        double t = dot(AP, AB) / dot(AB, AB);
        t = Math.max(0, Math.min(1, t));

        double[] closest = add(A, scale(AB, t));

        double len = Math.sqrt(dot(closest, closest));
        closest[0] /= len;
        closest[1] /= len;
        closest[2] /= len;

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

    public static boolean isStrictlyBehindOrAhead(LatLng pickup, LatLng drop, List<LatLng> polyline) {
        if (polyline == null || polyline.size() < 2) return false;

        LatLng start = polyline.get(0);
        LatLng end   = polyline.get(polyline.size() - 1);

        // Behind start
        if (haversineKm(pickup, start) > 5.0 &&
            getDistanceAlongRoute(pickup, polyline) == 0.0) {
            return true;
        }

        // Ahead of end
        double totalDist = 0.0;
        for (int i = 0; i < polyline.size() - 1; i++) {
            totalDist += haversineKm(polyline.get(i), polyline.get(i + 1));
        }

        double dropDist = getDistanceAlongRoute(drop, polyline);

        if (dropDist >= totalDist &&
            haversineKm(drop, end) > 5.0) {
            return true;
        }

        return false;
    }

    public static double getDistanceAlongRoute(LatLng p, List<LatLng> polyline) {
        if (polyline == null || polyline.size() < 2) return 0.0;

        double minDist = Double.MAX_VALUE;
        int minIndex = 0;
        double minT = 0.0;

        for (int i = 0; i < polyline.size() - 1; i++) {
            LatLng a = polyline.get(i);
            LatLng b = polyline.get(i + 1);

            double[] A = toCartesian(Math.toRadians(a.getLat()), Math.toRadians(a.getLng()));
            double[] B = toCartesian(Math.toRadians(b.getLat()), Math.toRadians(b.getLng()));
            double[] P = toCartesian(Math.toRadians(p.getLat()), Math.toRadians(p.getLng()));

            double[] AB = subtract(B, A);
            double[] AP = subtract(P, A);

            double dot_AB_AB = dot(AB, AB);
            double t = (dot_AB_AB < 1e-10) ? 0.0 : dot(AP, AB) / dot_AB_AB;
            t = Math.max(0, Math.min(1, t));

            double[] closest = add(A, scale(AB, t));
            double len = Math.sqrt(dot(closest, closest));
            closest[0] /= len; closest[1] /= len; closest[2] /= len;

            double closestLat = Math.asin(closest[2]);
            double closestLng = Math.atan2(closest[1], closest[0]);
            LatLng closestPoint = new LatLng(Math.toDegrees(closestLat), Math.toDegrees(closestLng));

            double distToSegment = haversineKm(p, closestPoint);

            if (distToSegment < minDist) {
                minDist = distToSegment;
                minIndex = i;
                minT = t;
            }
        }

        double distanceAlong = 0.0;
        for (int i = 0; i < minIndex; i++) {
            distanceAlong += haversineKm(polyline.get(i), polyline.get(i + 1));
        }
        distanceAlong += haversineKm(polyline.get(minIndex), polyline.get(minIndex + 1)) * minT;

        return distanceAlong;
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

    public static boolean isForwardDirection(LatLng pickup, LatLng drop, List<LatLng> polyline) {

        if (polyline == null || polyline.size() < 2) return false;

        double pickupDist = getDistanceAlongRoute(pickup, polyline);
        double dropDist   = getDistanceAlongRoute(drop, polyline);

        // Drop must be strictly after pickup with 1km buffer
        if (dropDist <= pickupDist + 1.0) {
            return false;
        }

        return true;
    }
}