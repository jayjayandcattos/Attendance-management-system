-- Create ip_access_lists table for IP blocking and whitelisting
CREATE TABLE ip_access_lists (
    id BIGSERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL, -- BLOCKLIST, WHITELIST
    reason VARCHAR(500),
    added_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_ip_access_lists_type ON ip_access_lists(type);
CREATE INDEX idx_ip_access_lists_expires_at ON ip_access_lists(expires_at);
