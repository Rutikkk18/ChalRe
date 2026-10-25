-- =========================================================================
-- ChalRe Spatial & Ride Schema Migration — PostgreSQL
-- Target: Staging / Production Aiven PostgreSQL
-- Dialect: org.hibernate.spatial.dialect.postgis.PostgisPG95Dialect
-- =========================================================================

-- 1. Enable PostGIS extension (provides geometry, geography, ST_* spatial functions)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create the ride table matching Ride.java entity
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

-- 3. Indexes for ride query performance and spatial search
CREATE INDEX IF NOT EXISTS idx_ride_driver_id 
ON ride (driver_id);

CREATE INDEX IF NOT EXISTS idx_ride_driver_date 
ON ride (driver_id, date);

CREATE INDEX IF NOT EXISTS idx_ride_status 
ON ride (status);

-- GiST spatial index for high-speed ST_DWithin route lookups in RideRepository
CREATE INDEX IF NOT EXISTS idx_ride_route_gist 
ON ride USING GIST (route);

-- 4. Reconcile foreign keys from dependent tables to 'ride'
-- Using defensive NOT VALID + VALIDATE block to guarantee safety

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seat_holds') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_seat_holds_ride') THEN
            ALTER TABLE seat_holds
            ADD CONSTRAINT fk_seat_holds_ride
            FOREIGN KEY (ride_id) REFERENCES ride(id) ON DELETE CASCADE NOT VALID;

            BEGIN
                ALTER TABLE seat_holds VALIDATE CONSTRAINT fk_seat_holds_ride;
            EXCEPTION WHEN foreign_key_violation THEN
                RAISE NOTICE 'fk_seat_holds_ride attached as NOT VALID due to orphaned records';
            END;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_booking_ride') THEN
            ALTER TABLE booking
            ADD CONSTRAINT fk_booking_ride
            FOREIGN KEY (ride_id) REFERENCES ride(id) ON DELETE CASCADE NOT VALID;

            BEGIN
                ALTER TABLE booking VALIDATE CONSTRAINT fk_booking_ride;
            EXCEPTION WHEN foreign_key_violation THEN
                RAISE NOTICE 'fk_booking_ride attached as NOT VALID due to orphaned records';
            END;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_ride') THEN
            ALTER TABLE payments
            ADD CONSTRAINT fk_payments_ride
            FOREIGN KEY (ride_id) REFERENCES ride(id) ON DELETE SET NULL NOT VALID;

            BEGIN
                ALTER TABLE payments VALIDATE CONSTRAINT fk_payments_ride;
            EXCEPTION WHEN foreign_key_violation THEN
                RAISE NOTICE 'fk_payments_ride attached as NOT VALID due to orphaned records';
            END;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_message') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_message_ride') THEN
            ALTER TABLE chat_message
            ADD CONSTRAINT fk_chat_message_ride
            FOREIGN KEY (ride_id) REFERENCES ride(id) ON DELETE CASCADE NOT VALID;

            BEGIN
                ALTER TABLE chat_message VALIDATE CONSTRAINT fk_chat_message_ride;
            EXCEPTION WHEN foreign_key_violation THEN
                RAISE NOTICE 'fk_chat_message_ride attached as NOT VALID due to orphaned records';
            END;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rating') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rating_ride') THEN
            ALTER TABLE rating
            ADD CONSTRAINT fk_rating_ride
            FOREIGN KEY (ride_id) REFERENCES ride(id) ON DELETE SET NULL NOT VALID;

            BEGIN
                ALTER TABLE rating VALIDATE CONSTRAINT fk_rating_ride;
            EXCEPTION WHEN foreign_key_violation THEN
                RAISE NOTICE 'fk_rating_ride attached as NOT VALID due to orphaned records';
            END;
        END IF;
    END IF;
END $$;
