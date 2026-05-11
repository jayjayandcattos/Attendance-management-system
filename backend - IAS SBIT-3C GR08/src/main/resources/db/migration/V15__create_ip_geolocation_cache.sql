-- Create ip_geolocation_cache table for caching geolocation lookups
CREATE TABLE ip_geolocation_cache (
    id BIGSERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    city VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    cached_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_ip_geolocation_cache_ip ON ip_geolocation_cache(ip_address);
CREATE INDEX idx_ip_geolocation_cache_expires_at ON ip_geolocation_cache(expires_at);
