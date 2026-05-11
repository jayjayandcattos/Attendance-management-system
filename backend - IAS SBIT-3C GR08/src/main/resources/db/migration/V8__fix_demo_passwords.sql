-- V8: Fix demo account passwords
-- admin123 for admin, teacher123 for teacher, student123 for students
UPDATE users SET password = '$2a$10$ox0rza1D7m1lDoVNcEXV1OoiRHAIyMT01VNwL68wYlFrh.1muXbuy' WHERE email = 'admin@lms.com';
UPDATE users SET password = '$2a$10$mCzcV/vMBXYe9X.LlnKJaejr.ZQ6i.CcDaePzG0QRxOLtXMhryWrC' WHERE email = 'teacher@lms.com';
UPDATE users SET password = '$2a$10$K73EJKSwaCScISCs3a0dWePixerIvBycZ6mlL2yDbIrDSOiBAlFfq' WHERE email LIKE 'student%@lms.com';
