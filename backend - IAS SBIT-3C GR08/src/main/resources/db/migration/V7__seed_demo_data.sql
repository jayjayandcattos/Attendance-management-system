-- V7: Seed demo data
-- Password for all demo accounts: hashed via BCrypt at app startup (setup endpoint)
-- Using BCrypt hash of 'admin123' for admin, 'teacher123' for teacher, 'student123' for students
INSERT INTO users (email, password, first_name, last_name, role, status) VALUES
('admin@lms.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System', 'Administrator', 'admin', 'active');

INSERT INTO users (email, password, first_name, last_name, role, department, status) VALUES
('teacher@lms.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'John', 'Smith', 'teacher', 'Computer Science', 'active');

INSERT INTO users (email, password, first_name, last_name, role, student_id, department, status) VALUES
('student1@lms.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Alice', 'Johnson', 'student', 'STU001', 'Computer Science', 'active'),
('student2@lms.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Bob', 'Williams', 'student', 'STU002', 'Computer Science', 'active'),
('student3@lms.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Carol', 'Davis', 'student', 'STU003', 'Information Technology', 'active');

-- Default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('site_name', 'AttendEase LMS', 'System name'),
('default_attendance_duration', '10', 'Default attendance window duration in minutes'),
('allow_late_attendance', '1', 'Allow late attendance submissions'),
('late_threshold_minutes', '5', 'Minutes after which attendance is marked late'),
('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('allowed_file_types', 'pdf,ppt,pptx,doc,docx,xls,xlsx,jpg,png,mp4', 'Allowed file extensions');

-- Demo course
INSERT INTO courses (teacher_id, course_code, course_name, description, join_code, section, schedule, room, cover_color) VALUES
(2, 'CS101', 'Introduction to Programming', 'Learn the fundamentals of programming using Python.', 'ABC123', 'Section A', 'MWF 9:00 AM - 10:30 AM', 'Room 301', '#4285F4');

-- Enroll demo students
INSERT INTO enrollments (student_id, course_id) VALUES
(3, 1),
(4, 1),
(5, 1);
