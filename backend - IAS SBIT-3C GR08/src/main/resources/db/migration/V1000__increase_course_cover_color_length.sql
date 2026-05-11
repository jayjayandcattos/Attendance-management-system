-- V26: Increase course cover color length to support images and data URLs
ALTER TABLE courses ALTER COLUMN cover_color TYPE TEXT;
