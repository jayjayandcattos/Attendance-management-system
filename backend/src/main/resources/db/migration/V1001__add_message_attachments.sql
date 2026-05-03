-- Add attachment support to messages and course_messages
ALTER TABLE messages
    ADD COLUMN attachment_path VARCHAR(500) NULL,
    ADD COLUMN attachment_name VARCHAR(255) NULL,
    ADD COLUMN attachment_type VARCHAR(50) NULL,
    ADD COLUMN attachment_size BIGINT NULL;

ALTER TABLE course_messages
    ADD COLUMN attachment_path VARCHAR(500) NULL,
    ADD COLUMN attachment_name VARCHAR(255) NULL,
    ADD COLUMN attachment_type VARCHAR(50) NULL,
    ADD COLUMN attachment_size BIGINT NULL;
