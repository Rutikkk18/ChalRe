-- =========================================================================
-- ChalRe Payment Safety Migration — MySQL 8 (Development)
-- =========================================================================

-- 1. Create seat_holds table
CREATE TABLE IF NOT EXISTS seat_holds (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ride_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    seats_held INT NOT NULL DEFAULT 1,
    hold_reference VARCHAR(64) NOT NULL UNIQUE,
    razorpay_order_id VARCHAR(100) UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ORDER',
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    last_reconciled_at DATETIME,
    CONSTRAINT fk_seat_holds_ride FOREIGN KEY (ride_id) REFERENCES ride(id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_holds_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_seat_holds_active (ride_id, status, expires_at),
    INDEX idx_seat_holds_order_id (razorpay_order_id),
    INDEX idx_seat_holds_reference (hold_reference)
) ENGINE=InnoDB;

-- 2. Create refund_outbox table
CREATE TABLE IF NOT EXISTS refund_outbox (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    razorpay_payment_id VARCHAR(100) NOT NULL,
    amount_paise BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    receipt VARCHAR(40) NOT NULL,
    razorpay_refund_id VARCHAR(100),
    claim_token VARCHAR(64),
    claimed_at DATETIME,
    retry_count INT NOT NULL DEFAULT 0,
    last_attempt_at DATETIME,
    failure_reason TEXT,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_refund_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
    INDEX idx_refund_outbox_claim (status, last_attempt_at, retry_count),
    INDEX idx_refund_outbox_payment (payment_id)
) ENGINE=InnoDB;

-- 3. Create webhook_events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
    claim_token VARCHAR(64),
    claimed_at DATETIME,
    received_at DATETIME NOT NULL,
    last_attempt_at DATETIME,
    processed_at DATETIME,
    INDEX idx_webhook_events_claim (status, last_attempt_at)
) ENGINE=InnoDB;
