ALTER TABLE users ADD COLUMN verification_code VARCHAR(10);
ALTER TABLE users ADD COLUMN email_code_expiry TIMESTAMP;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'pending';
