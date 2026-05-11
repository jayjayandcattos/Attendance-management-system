-- V9: Add soft delete columns for messages
ALTER TABLE messages ADD COLUMN deleted_for_sender BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN deleted_for_receiver BOOLEAN DEFAULT FALSE;

ALTER TABLE course_messages ADD COLUMN deleted_for_users TEXT DEFAULT '';
