-- Create analytics_cache table for caching expensive aggregations
CREATE TABLE analytics_cache (
    id BIGSERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_analytics_cache_expires_at ON analytics_cache(expires_at);
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
