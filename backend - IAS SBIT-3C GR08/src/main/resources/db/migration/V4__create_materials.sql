-- V4: Course Materials and Assignment Submissions
CREATE TABLE course_materials (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('file', 'link', 'announcement', 'assignment')),
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INT,
    external_link VARCHAR(500),
    due_date TIMESTAMP,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_materials_course ON course_materials(course_id);
CREATE INDEX idx_materials_type ON course_materials(type);

CREATE TABLE assignment_submissions (
    id BIGSERIAL PRIMARY KEY,
    material_id BIGINT NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INT,
    content TEXT,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late')),
    grade VARCHAR(50),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_material ON assignment_submissions(material_id);
CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);
