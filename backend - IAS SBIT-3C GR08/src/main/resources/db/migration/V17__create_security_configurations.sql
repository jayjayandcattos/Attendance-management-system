-- Create security_configurations table for storing configurable security parameters
CREATE TABLE security_configurations (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value VARCHAR(500) NOT NULL,
    description VARCHAR(1000),
    updated_by BIGINT REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default security configurations
INSERT INTO security_configurations (config_key, config_value, description) VALUES
('failed_login_threshold', '5', 'Number of failed login attempts before triggering alert'),
('failed_login_window_minutes', '15', 'Time window in minutes for failed login detection'),
('login_attempt_retention_days', '90', 'Number of days to retain login attempt records'),
('suspicious_activity_multi_country_threshold', '3', 'Number of different countries within 24 hours to flag as suspicious'),
('suspicious_activity_multi_country_window_hours', '24', 'Time window in hours for multi-country detection'),
('suspicious_activity_multi_ip_threshold', '5', 'Number of different IPs within 1 hour to flag as suspicious'),
('suspicious_activity_multi_ip_window_minutes', '60', 'Time window in minutes for multi-IP detection'),
('suspicious_activity_rapid_actions_threshold', '10', 'Number of destructive actions within 5 minutes to flag as suspicious'),
('suspicious_activity_rapid_actions_window_minutes', '5', 'Time window in minutes for rapid action detection'),
('suspicious_activity_account_enumeration_threshold', '20', 'Number of different accounts accessed from one IP within 10 minutes'),
('suspicious_activity_account_enumeration_window_minutes', '10', 'Time window in minutes for account enumeration detection');
