UPDATE audit_logs SET created_at = NOW() WHERE created_at IS NULL;
