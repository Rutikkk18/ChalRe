package com.Startup.chalre.utils;

import com.Startup.chalre.model.LatLng;
import java.util.ArrayList;
import java.util.List;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.PrecisionModel;

public class PolylineUtils {

    public static double getDynamicRadiusKm(double routeLengthKm) {
        return Math.min(35.0, Math.max(6.0, routeLengthKm / 12.0));
    }
        //return Math.min(25.0, Math.max(5.0, routeLengthKm / 15.0));


    public static double calculateRouteLength(List<LatLng> route) {
        double total = 0;
        for (int i = 0; i < route.size() - 1; i++) {
            total += haversineKm(route.get(i), route.get(i + 1));
        }
        return total;
    }
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

    // 🔥 NEW METHOD — add this
    public static double distanceToRoute(List<LatLng> route, LatLng point) {
        double minDist = Double.MAX_VALUE;

        for (int i = 0; i < route.size() - 1; i++) {
            LatLng p1 = route.get(i);
            LatLng p2 = route.get(i + 1);

            double dx = p2.getLng() - p1.getLng();
            double dy = p2.getLat() - p1.getLat();

            double denom = (dx * dx + dy * dy);
            if (denom == 0) continue; // safety

            double t = ((point.getLng() - p1.getLng()) * dx +
                    (point.getLat() - p1.getLat()) * dy) / denom;

            t = Math.max(0, Math.min(1, t));

            double projLat = p1.getLat() + t * dy;
            double projLng = p1.getLng() + t * dx;

            LatLng proj = new LatLng(projLat, projLng);

            double dist = haversineKm(point, proj);
            minDist = Math.min(minDist, dist);
        }

        return minDist;
    }
    /**
 * Returns the fractional progress [0.0, 1.0] of 'point' 
 * projected onto the nearest segment of the decoded route.
 * Returns -1 if route has fewer than 2 points.
 */
public static double projectOntoRoute(List<LatLng> route, LatLng point) {
    if (route == null || route.size() < 2) return -1;

    double bestT = 0;
    double bestDist = Double.MAX_VALUE;
    double totalLength = 0;
    double[] segLengths = new double[route.size() - 1];

    for (int i = 0; i < route.size() - 1; i++) {
        segLengths[i] = haversineKm(route.get(i), route.get(i + 1));
        totalLength += segLengths[i];
    }
    if (totalLength == 0) return 0;

    double accumulated = 0;
    for (int i = 0; i < route.size() - 1; i++) {
        LatLng p1 = route.get(i);
        LatLng p2 = route.get(i + 1);

        // Project 'point' onto segment p1→p2 using dot product in lat/lng space
        double dx = p2.getLng() - p1.getLng();
        double dy = p2.getLat() - p1.getLat();
        double segLen2 = dx * dx + dy * dy;

        double t = 0;
        if (segLen2 > 0) {
            t = ((point.getLng() - p1.getLng()) * dx
               + (point.getLat() - p1.getLat()) * dy) / segLen2;
            t = Math.max(0, Math.min(1, t));
        }

        double projLat = p1.getLat() + t * dy;
        double projLng = p1.getLng() + t * dx;
        LatLng proj = new LatLng(projLat, projLng);
        double dist = haversineKm(point, proj);

        if (dist < bestDist) {
            bestDist = dist;
            // Global t: how far along the whole route this projection is
            bestT = (accumulated + t * segLengths[i]) / totalLength;
        }
        accumulated += segLengths[i];
    }
    return bestT; // 0.0 = at driver start, 1.0 = at driver end
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