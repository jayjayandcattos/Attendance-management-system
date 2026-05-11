-- Create security_events table for tracking security-related events
CREATE TABLE security_events (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    ip_address VARCHAR(45),
    user_email VARCHAR(255),
    country_code VARCHAR(2),
    city VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by BIGINT REFERENCES users(id),
    acknowledged_at TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_security_events_type ON security_events(type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX idx_security_events_user_email ON security_events(user_email);
