package com.Startup.chalre.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.Statement;

/**
 * Ensures PostGIS spatial extension and ride table/indexes are safely available
 * on PostgreSQL startup before Hibernate entity manager validation runs.
 */
@Configuration
public class DatabaseSpatialConfig {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseSpatialConfig.class);

    @Bean
    public static BeanPostProcessor postgisExtensionInitializer() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
                if (bean instanceof DataSource dataSource) {
                    try (Connection conn = dataSource.getConnection()) {
                        DatabaseMetaData meta = conn.getMetaData();
                        String productName = meta.getDatabaseProductName();

                        if (productName != null && productName.toLowerCase().contains("postgres")) {
                            logger.info("PostgreSQL detected ({}). Initializing PostGIS extension and spatial schema...", productName);

                            try (Statement stmt = conn.createStatement()) {
                                // 1. PostGIS extension
                                stmt.execute("CREATE EXTENSION IF NOT EXISTS postgis;");
                                logger.info("PostGIS extension initialized successfully.");

                                // 2. Ride base table (if missing)
                                stmt.execute("""
                                    CREATE TABLE IF NOT EXISTS ride (
                                        id BIGSERIAL PRIMARY KEY,
                                        driver_id BIGINT,
                                        start_location VARCHAR(255),
                                        end_location VARCHAR(255),
                                        date VARCHAR(255),
                                        time VARCHAR(255),
                                        end_time VARCHAR(255),
                                        available_seats INT NOT NULL DEFAULT 1,
                                        price DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                                        car_model VARCHAR(255),
                                        car_type VARCHAR(255),
                                        vehicle_type VARCHAR(255),
                                        gender_preference VARCHAR(255),
                                        note VARCHAR(255),
                                        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                                        from_lat DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                                        from_lng DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                                        to_lat DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                                        to_lng DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                                        polyline TEXT,
                                        route geometry(LineString, 4326),
                                        distance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                                        is_fallback_route BOOLEAN DEFAULT FALSE,
                                        CONSTRAINT fk_ride_driver FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL
                                    );
                                """);

                                // 3. Indexes
                                stmt.execute("CREATE INDEX IF NOT EXISTS idx_ride_driver_id ON ride (driver_id);");
                                stmt.execute("CREATE INDEX IF NOT EXISTS idx_ride_driver_date ON ride (driver_id, date);");
                                stmt.execute("CREATE INDEX IF NOT EXISTS idx_ride_status ON ride (status);");
                                stmt.execute("CREATE INDEX IF NOT EXISTS idx_ride_route_gist ON ride USING GIST (route);");

                                logger.info("Ride table and spatial indexes verified successfully.");
                            }
                        }
                    } catch (Exception e) {
                        logger.warn("Spatial database initialization notice: {}", e.getMessage());
                    }
                }
                return bean;
            }
        };
    }
}
