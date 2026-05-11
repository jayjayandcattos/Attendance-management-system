-- Add attendance late preferences to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS attendance_late_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS attendance_late_minutes INTEGER DEFAULT 15;

-- Add comments for documentation
COMMENT ON COLUMN users.attendance_late_enabled IS 'Whether late marking system is enabled for this teacher';
COMMENT ON COLUMN users.attendance_late_minutes IS 'Default late threshold in minutes for attendance sessions';
