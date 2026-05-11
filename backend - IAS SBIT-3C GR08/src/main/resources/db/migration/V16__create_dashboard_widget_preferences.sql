-- Create dashboard_widget_preferences table for storing user dashboard layouts
CREATE TABLE dashboard_widget_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_id VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, widget_id)
);

-- Create index for efficient querying
CREATE INDEX idx_dashboard_widget_preferences_user_id ON dashboard_widget_preferences(user_id);
