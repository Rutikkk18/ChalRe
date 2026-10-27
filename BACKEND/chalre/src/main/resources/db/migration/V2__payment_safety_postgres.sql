-- =========================================================================
-- ChalRe Payment Safety Migration — PostgreSQL (Production)
-- Dialect: org.hibernate.spatial.dialect.postgis.PostgisPG95Dialect
-- =========================================================================

-- 1. Create seat_holds table
CREATE TABLE IF NOT EXISTS seat_holds (
    id BIGSERIAL PRIMARY KEY,
    ride_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    seats_held INT NOT NULL DEFAULT 1,
    hold_reference VARCHAR(64) NOT NULL UNIQUE,
    razorpay_order_id VARCHAR(100) UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ORDER',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    last_reconciled_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_seat_holds_ride FOREIGN KEY (ride_id) REFERENCES ride(id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_holds_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_active 
ON seat_holds (ride_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_seat_holds_order_id 
ON seat_holds (razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_seat_holds_reference 
ON seat_holds (hold_reference);

-- 2. Create refund_outbox table
CREATE TABLE IF NOT EXISTS refund_outbox (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    razorpay_payment_id VARCHAR(100) NOT NULL,
    amount_paise BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    receipt VARCHAR(40) NOT NULL,
    razorpay_refund_id VARCHAR(100),
    claim_token VARCHAR(64),
    claimed_at TIMESTAMP WITHOUT TIME ZONE,
    retry_count INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITHOUT TIME ZONE,
    failure_reason TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    CONSTRAINT fk_refund_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE INDEX IF NOT EXISTS idx_refund_outbox_claim 
ON refund_outbox (status, last_attempt_at, retry_count);

CREATE INDEX IF NOT EXISTS idx_refund_outbox_payment 
ON refund_outbox (payment_id);

-- 3. Create webhook_events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
    claim_token VARCHAR(64),
    claimed_at TIMESTAMP WITHOUT TIME ZONE,
    received_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    last_attempt_at TIMESTAMP WITHOUT TIME ZONE,
    processed_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_claim 
ON webhook_events (status, last_attempt_at);
