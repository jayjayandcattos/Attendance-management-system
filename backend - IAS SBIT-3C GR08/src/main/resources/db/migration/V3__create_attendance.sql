-- V3: Attendance Sessions and Records
CREATE TABLE attendance_sessions (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_title VARCHAR(255),
    attendance_code VARCHAR(10) NOT NULL,
    qr_code_data TEXT,
    duration_minutes INT DEFAULT 10,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed', 'expired')),
    allow_late BOOLEAN DEFAULT TRUE,
    late_minutes INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_att_sessions_course ON attendance_sessions(course_id);
CREATE INDEX idx_att_sessions_code ON attendance_sessions(attendance_code);
CREATE INDEX idx_att_sessions_status ON attendance_sessions(status);
CREATE INDEX idx_att_sessions_times ON attendance_sessions(start_time, end_time);

CREATE TABLE attendance_records (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'excused')),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    device_info VARCHAR(255),
    notes TEXT,
    UNIQUE (session_id, student_id)
);

CREATE INDEX idx_att_records_session ON attendance_records(session_id);
CREATE INDEX idx_att_records_student ON attendance_records(student_id);
CREATE INDEX idx_att_records_status ON attendance_records(status);
