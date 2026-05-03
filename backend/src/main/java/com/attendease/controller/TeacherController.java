package com.attendease.controller;

import com.attendease.dto.ApiResponse;
import com.attendease.entity.*;
import com.attendease.exception.BadRequestException;
import com.attendease.exception.ResourceNotFoundException;
import com.attendease.repository.*;
import com.attendease.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;
import com.attendease.entity.SecurityEvent;
import com.attendease.entity.SecurityEventType;
import com.attendease.entity.SecurityEventSeverity;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasAnyRole('TEACHER', 'PROFESSOR')")
@RequiredArgsConstructor
public class TeacherController {

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final MessageRepository messageRepository;
    private final CourseMessageRepository courseMessageRepository;
    private final UserRepository userRepository;
    private final AssignmentSubmissionRepository assignmentSubmissionRepository;
    private final CommentRepository commentRepository;
    private final AuditService auditService;
    private final SecurityEventRepository securityEventRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Dashboard ──────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard(@AuthenticationPrincipal User teacher) {
        List<Course> courses = courseRepository.findByTeacherIdAndStatusNot(teacher.getId(), "deleted");
        Map<String, Object> data = new HashMap<>();
        data.put("courses", courses);
        data.put("totalCourses", courses.size());

        // Active sessions (auto-close expired ones)
        List<Map<String, Object>> activeSessionsList = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Course c : courses) {
            List<AttendanceSession> sessions = attendanceSessionRepository.findByCourseIdAndStatus(c.getId(), "active");
            for (AttendanceSession s : sessions) {
                if (s.getEndTime().isBefore(now)) {
                    s.setStatus("closed");
                    attendanceSessionRepository.save(java.util.Objects.requireNonNull(s));
                    // Mark absent students for this auto-closed session
                    List<Enrollment> enrolls = enrollmentRepository.findByCourseIdAndStatus(c.getId(), "active");
                    for (Enrollment e : enrolls) {
                        if (!attendanceRecordRepository.existsBySessionIdAndStudentId(s.getId(),
                                e.getStudent().getId())) {
                            attendanceRecordRepository.save(java.util.Objects.requireNonNull(AttendanceRecord.builder()
                                    .session(s).student(e.getStudent()).course(c).status("absent").build()));
                        }
                    }
                } else {
                    Map<String, Object> sessionMap = new HashMap<>();
                    sessionMap.put("session", s);
                    sessionMap.put("courseName", c.getCourseName());
                    sessionMap.put("submissions", attendanceRecordRepository.findBySessionId(s.getId()).size());
                    sessionMap.put("enrolled", enrollmentRepository.countByCourseIdAndStatus(c.getId(), "active"));
                    activeSessionsList.add(sessionMap);
                }
            }
        }
        data.put("activeSessions", activeSessionsList);

        // Recent closed sessions (last 5)
        List<AttendanceSession> allSessions = attendanceSessionRepository.findByTeacherId(teacher.getId());
        List<Map<String, Object>> recentSessions = new ArrayList<>();
        allSessions.stream()
                .filter(s -> "closed".equals(s.getStatus()))
                .sorted(Comparator.comparing(AttendanceSession::getStartTime).reversed())
                .limit(5)
                .forEach(s -> {
                    Map<String, Object> sessionMap = new HashMap<>();
                    sessionMap.put("session", s);
                    sessionMap.put("courseName", s.getCourse().getCourseName());
                    sessionMap.put("submissions", attendanceRecordRepository.findBySessionId(s.getId()).size());
                    sessionMap.put("enrolled",
                            enrollmentRepository.countByCourseIdAndStatus(s.getCourse().getId(), "active"));
                    recentSessions.add(sessionMap);
                });
        data.put("recentSessions", recentSessions);

        // Total students (across all courses)
        long totalStudents = 0;
        long totalSessions = 0;
        for (Course c : courses) {
            totalStudents += enrollmentRepository.countByCourseIdAndStatus(c.getId(), "active");
            totalSessions += attendanceSessionRepository.findByCourseId(c.getId()).size();
        }
        data.put("totalStudents", totalStudents);
        data.put("totalSessions", totalSessions);
        data.put("teacherName", teacher.getFirstName());

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // ── Courses CRUD ───────────────────────────────────────────────────
    @GetMapping("/courses")
    public ResponseEntity<ApiResponse<List<Course>>> getCourses(@AuthenticationPrincipal User teacher) {
        return ResponseEntity.ok(ApiResponse.success(
                courseRepository.findByTeacherIdAndStatusNot(teacher.getId(), "deleted")));
    }

    @PostMapping("/courses")
    public ResponseEntity<ApiResponse<Course>> createCourse(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User teacher,
            HttpServletRequest request) {

        String joinCode;
        do {
            joinCode = generateCode(6);
        } while (courseRepository.existsByJoinCode(joinCode));

        String coverColor = body.getOrDefault("coverColor", "#4285F4");

        Course course = Course.builder()
                .teacher(teacher)
                .courseCode(body.get("courseCode"))
                .courseName(body.get("courseName"))
                .description(body.get("description"))
                .joinCode(joinCode)
                .section(body.get("section"))
                .schedule(body.get("schedule"))
                .room(body.get("room"))
                .coverColor(coverColor)
                .status("active")
                .build();

        course = courseRepository.save(java.util.Objects.requireNonNull(course));
        auditService.log(teacher, "create_course", "course", java.util.Objects.requireNonNull(course.getId()), request);

        return ResponseEntity.ok(ApiResponse.success("Course created! Join code: " + joinCode, course));
    }

    @GetMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCourseDetail(
            @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User teacher) {
        Course course = courseRepository.findById(id)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        Map<String, Object> data = new HashMap<>();
        data.put("course", course);
        List<Enrollment> activeEnrollments = enrollmentRepository.findByCourseIdAndStatus(id, "active");
        List<Map<String, Object>> enrollmentData = activeEnrollments.stream()
                .map(this::mapEnrollment)
                .toList();
        data.put("enrollments", enrollmentData);
        data.put("materials", courseMaterialRepository.findByCourseIdOrderByIsPinnedDescCreatedAtDesc(id));
        // sessions (auto-close expired)
        List<AttendanceSession> sessions = attendanceSessionRepository.findByCourseId(id);
        LocalDateTime now = LocalDateTime.now();
        for (AttendanceSession s : sessions) {
            if ("active".equals(s.getStatus()) && s.getEndTime().isBefore(now)) {
                s.setStatus("closed");
                attendanceSessionRepository.save(java.util.Objects.requireNonNull(s));
                // Mark absent
                List<Enrollment> enrolls = enrollmentRepository.findByCourseIdAndStatus(id, "active");
                for (Enrollment e : enrolls) {
                    if (!attendanceRecordRepository.existsBySessionIdAndStudentId(s.getId(), e.getStudent().getId())) {
                        attendanceRecordRepository.save(java.util.Objects.requireNonNull(AttendanceRecord.builder()
                                .session(s).student(e.getStudent()).course(course).status("absent").build()));
                    }
                }
            }
        }
        data.put("sessions", sessions);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<Course>> updateCourse(
            @PathVariable @org.springframework.lang.NonNull Long id, @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        Course course = courseRepository.findById(id)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (body.containsKey("courseCode"))
            course.setCourseCode(body.get("courseCode"));
        if (body.containsKey("courseName"))
            course.setCourseName(body.get("courseName"));
        if (body.containsKey("description"))
            course.setDescription(body.get("description"));
        if (body.containsKey("section"))
            course.setSection(body.get("section"));
        if (body.containsKey("schedule"))
            course.setSchedule(body.get("schedule"));
        if (body.containsKey("room"))
            course.setRoom(body.get("room"));
        if (body.containsKey("coverColor"))
            course.setCoverColor(body.get("coverColor"));

        course = courseRepository.save(java.util.Objects.requireNonNull(course));
        auditService.log(teacher, "update_course", "course", id, request);
        return ResponseEntity.ok(ApiResponse.success("Course updated", course));
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(
            @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User teacher,
            HttpServletRequest request) {
        Course course = courseRepository.findById(id)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        course.setStatus("deleted");
        courseRepository.save(java.util.Objects.requireNonNull(course));
        auditService.log(teacher, "delete_course", "course", id, request);
        return ResponseEntity.ok(ApiResponse.success("Course deleted", null));
    }

    @PostMapping("/courses/{id}/archive")
    public ResponseEntity<ApiResponse<Course>> archiveCourse(
            @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User teacher,
            HttpServletRequest request) {
        Course course = courseRepository.findById(id)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        course.setStatus("archived");
        course = courseRepository.save(course);
        auditService.log(teacher, "archive_course", "course", id, request);
        return ResponseEntity.ok(ApiResponse.success("Course archived", course));
    }

    @PostMapping("/courses/{id}/unarchive")
    public ResponseEntity<ApiResponse<Course>> unarchiveCourse(
            @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User teacher,
            HttpServletRequest request) {
        Course course = courseRepository.findById(id)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        course.setStatus("active");
        course = courseRepository.save(course);
        auditService.log(teacher, "unarchive_course", "course", id, request);
        return ResponseEntity.ok(ApiResponse.success("Course unarchived", course));
    }

    // ── Attendance ─────────────────────────────────────────────────────
    @PostMapping("/attendance/create")
    @jakarta.transaction.Transactional
    public ResponseEntity<ApiResponse<AttendanceSession>> createSession(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {

        Long courseId = Long.valueOf(body.get("courseId").toString());
        courseRepository.findById(java.util.Objects.requireNonNull(courseId))
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (attendanceSessionRepository.existsByCourseIdAndStatus(courseId, "active")) {
            throw new BadRequestException("An active session already exists for this course");
        }

        String code;
        do {
            code = generateCode(6);
        } while (attendanceSessionRepository.findByAttendanceCodeAndStatus(code, "active").isPresent());

        int duration = body.containsKey("duration") ? Integer.parseInt(body.get("duration").toString()) : 10;
        
        // Determine late settings: override > teacher preference > system default
        boolean allowLate;
        int lateMinutes;
        
        if (body.containsKey("allowLate")) {
            allowLate = Boolean.parseBoolean(body.get("allowLate").toString());
            lateMinutes = body.containsKey("lateMinutes") ? Integer.parseInt(body.get("lateMinutes").toString()) : 15;
        } else if (body.containsKey("lateMinutes")) {
            // Per-session override provided
            lateMinutes = Integer.parseInt(body.get("lateMinutes").toString());
            allowLate = true;
        } else {
            // Use teacher preferences
            allowLate = teacher.getAttendanceLateEnabled() != null ? teacher.getAttendanceLateEnabled() : true;
            lateMinutes = teacher.getAttendanceLateMinutes() != null ? teacher.getAttendanceLateMinutes() : 15;
        }
        
        LocalDateTime now = LocalDateTime.now();

        AttendanceSession session = AttendanceSession.builder()
                .course(courseRepository.findById(java.util.Objects.requireNonNull(courseId)).get())
                .teacher(teacher)
                .sessionTitle(body.containsKey("sessionTitle") ? body.get("sessionTitle").toString() : null)
                .attendanceCode(code)
                .durationMinutes(duration)
                .startTime(now)
                .endTime(now.plusMinutes(duration))
                .status("active")
                .allowLate(allowLate)
                .lateMinutes(lateMinutes)
                .build();

        session = attendanceSessionRepository.save(java.util.Objects.requireNonNull(session));
        auditService.log(teacher, "create_attendance_session", "attendance_session", session.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Attendance session started! Code: " + code, session));
    }

    @PostMapping("/attendance/{id}/close")
    @jakarta.transaction.Transactional
    public ResponseEntity<ApiResponse<Void>> closeSession(
            @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User teacher,
            HttpServletRequest request) {
        AttendanceSession session = attendanceSessionRepository.findById(id)
                .filter(s -> s.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        session.setStatus("closed");
        attendanceSessionRepository.save(java.util.Objects.requireNonNull(session));

        // Mark absent students
        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdAndStatus(session.getCourse().getId(),
                "active");
        for (Enrollment e : enrollments) {
            if (!attendanceRecordRepository.existsBySessionIdAndStudentId(id, e.getStudent().getId())) {
                AttendanceRecord record = AttendanceRecord.builder()
                        .session(session)
                        .student(e.getStudent())
                        .course(session.getCourse())
                        .status("absent")
                        .build();
                attendanceRecordRepository.save(java.util.Objects.requireNonNull(record));
            }
        }

        auditService.log(teacher, "close_attendance_session", "attendance_session", id, request);
        return ResponseEntity.ok(ApiResponse.success("Session closed", null));
    }

    @PostMapping("/attendance/{id}/reopen")
    @jakarta.transaction.Transactional
    public ResponseEntity<ApiResponse<AttendanceSession>> reopenSession(
            @PathVariable @org.springframework.lang.NonNull Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal User teacher,
            HttpServletRequest request) {
        AttendanceSession session = attendanceSessionRepository.findById(id)
                .filter(s -> s.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if ("active".equals(session.getStatus())) {
            throw new BadRequestException("Session is already active");
        }

        // Auto-close any expired active session for this course first
        List<AttendanceSession> activeSessions = attendanceSessionRepository
                .findByCourseIdAndStatus(session.getCourse().getId(), "active");
        LocalDateTime now = LocalDateTime.now();
        for (AttendanceSession as : activeSessions) {
            if (as.getEndTime().isBefore(now)) {
                as.setStatus("closed");
                attendanceSessionRepository.save(java.util.Objects.requireNonNull(as));
                // Mark absent
                List<Enrollment> enrolls = enrollmentRepository.findByCourseIdAndStatus(session.getCourse().getId(),
                        "active");
                for (Enrollment e : enrolls) {
                    if (!attendanceRecordRepository.existsBySessionIdAndStudentId(as.getId(), e.getStudent().getId())) {
                        attendanceRecordRepository.save(java.util.Objects.requireNonNull(AttendanceRecord.builder()
                                .session(as).student(e.getStudent()).course(session.getCourse()).status("absent")
                                .build()));
                    }
                }
            }
        }

        // Now check if another active session exists
        if (attendanceSessionRepository.existsByCourseIdAndStatus(session.getCourse().getId(), "active")) {
            throw new BadRequestException("Another active session already exists for this course");
        }

        // Remove auto-generated absent records
        List<AttendanceRecord> absentRecords = attendanceRecordRepository.findBySessionId(id);
        for (AttendanceRecord r : absentRecords) {
            if ("absent".equals(r.getStatus()) && r.getSubmittedAt() == null) {
                attendanceRecordRepository.delete(r);
            }
        }

        // Generate new code and reopen
        String code;
        do {
            code = generateCode(6);
        } while (attendanceSessionRepository.findByAttendanceCodeAndStatus(code, "active").isPresent());

        session.setStatus("active");
        session.setAttendanceCode(code);
        session.setStartTime(now);

        int duration = 10;
        if (body != null && body.containsKey("duration")) {
            duration = Integer.parseInt(body.get("duration").toString());
            session.setDurationMinutes(duration);
        } else if (session.getDurationMinutes() != null) {
            duration = session.getDurationMinutes();
        }

        // Update late settings if provided, otherwise keep existing or use teacher preferences
        if (body != null && body.containsKey("lateMinutes")) {
            int lateMinutes = Integer.parseInt(body.get("lateMinutes").toString());
            session.setLateMinutes(lateMinutes);
            session.setAllowLate(true);
        } else if (session.getLateMinutes() == null) {
            // Session doesn't have late settings, use teacher preferences
            boolean allowLate = teacher.getAttendanceLateEnabled() != null ? teacher.getAttendanceLateEnabled() : true;
            int lateMinutes = teacher.getAttendanceLateMinutes() != null ? teacher.getAttendanceLateMinutes() : 15;
            session.setAllowLate(allowLate);
            session.setLateMinutes(lateMinutes);
        }
        // else: keep existing session's late settings

        session.setEndTime(now.plusMinutes(duration));
        session = attendanceSessionRepository.save(session);

        auditService.log(teacher, "reopen_attendance_session", "attendance_session", id, request);
        return ResponseEntity.ok(ApiResponse.success("Session reopened! New code: " + code, session));
    }

    @PostMapping("/attendance/{id}/extend")
    public ResponseEntity<ApiResponse<AttendanceSession>> extendSession(
            @PathVariable @org.springframework.lang.NonNull Long id, @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher) {
        AttendanceSession session = attendanceSessionRepository.findById(id)
                .filter(s -> s.getTeacher().getId().equals(teacher.getId()) && "active".equals(s.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Active session not found"));

        int extra = body.containsKey("extraMinutes") ? Integer.parseInt(body.get("extraMinutes").toString()) : 5;
        session.setEndTime(session.getEndTime().plusMinutes(extra));
        session.setDurationMinutes(session.getDurationMinutes() + extra);
        session = attendanceSessionRepository.save(session);
        return ResponseEntity.ok(ApiResponse.success("Session extended by " + extra + " minutes", session));
    }

    @GetMapping("/attendance/sessions")
    public ResponseEntity<ApiResponse<List<AttendanceSession>>> getSessions(@AuthenticationPrincipal User teacher) {
        return ResponseEntity.ok(
                ApiResponse.success(attendanceSessionRepository.findByTeacherIdOrderByStartTimeDesc(teacher.getId())));
    }

    @GetMapping("/attendance/records/{sessionId}")
    public ResponseEntity<ApiResponse<List<AttendanceRecord>>> getRecords(@PathVariable Long sessionId) {
        return ResponseEntity.ok(ApiResponse.success(attendanceRecordRepository.findBySessionId(sessionId)));
    }

    @PutMapping("/attendance/records/{id}")
    public ResponseEntity<ApiResponse<AttendanceRecord>> updateRecord(
            @PathVariable @org.springframework.lang.NonNull Long id, @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        AttendanceRecord record = attendanceRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found"));
        if (body.containsKey("status"))
            record.setStatus(body.get("status"));
        if (body.containsKey("notes"))
            record.setNotes(body.get("notes"));
        record = attendanceRecordRepository.save(java.util.Objects.requireNonNull(record));
        auditService.log(teacher, "update_attendance_record", "attendance_record", id, request);
        return ResponseEntity.ok(ApiResponse.success("Record updated", record));
    }

    // ── Materials ──────────────────────────────────────────────────────
    @GetMapping("/materials")
    public ResponseEntity<ApiResponse<List<CourseMaterial>>> getMaterials(
            @RequestParam Long courseId, @AuthenticationPrincipal User teacher) {
        return ResponseEntity.ok(ApiResponse.success(
                courseMaterialRepository.findByCourseIdOrderByIsPinnedDescCreatedAtDesc(courseId)));
    }

    @PostMapping(value = "/materials", consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<List<CourseMaterial>>> createMaterial(
            @RequestParam("courseIds") String courseIds,
            @RequestParam("type") String type,
            @RequestParam("title") String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String externalLink,
            @RequestParam(required = false) String dueDate,
            @RequestParam(required = false) MultipartFile file,
            @AuthenticationPrincipal User teacher,
            HttpServletRequest request) throws IOException {

        List<CourseMaterial> createdItems = new ArrayList<>();
        String[] ids = courseIds.split(",");

        for (String idStr : ids) {
            Long courseId = Long.valueOf(idStr.trim());
            Course course = courseRepository.findById(java.util.Objects.requireNonNull(courseId))
                    .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                    .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));

            CourseMaterial material = CourseMaterial.builder()
                    .course(course).teacher(teacher).type(type).title(title)
                    .description(description).externalLink(externalLink)
                    .dueDate(dueDate != null && !dueDate.isEmpty() ? LocalDateTime.parse(dueDate) : null)
                    .isPinned(false).isClosed(false).build();

            // Handle file upload for both file and assignment types
            if (("file".equals(type) || "assignment".equals(type)) && file != null && !file.isEmpty()) {
                String uploadDir = "uploads/materials/" + courseId;
                Path uploadPath = Paths.get(uploadDir);
                Files.createDirectories(uploadPath);
                String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                Files.copy(file.getInputStream(), uploadPath.resolve(fileName));
                material.setFilePath(uploadDir + "/" + fileName);
                material.setFileName(file.getOriginalFilename());
                material.setFileSize((int) file.getSize());
            }

            material = courseMaterialRepository.save(java.util.Objects.requireNonNull(material));
            createdItems.add(material);
            auditService.log(teacher, "create_material", "course_material", material.getId(), request);
        }

        return ResponseEntity
                .ok(ApiResponse.success("Material added to " + createdItems.size() + " courses", createdItems));
    }

    @PostMapping("/materials/{id}/share")
    public ResponseEntity<ApiResponse<Void>> shareMaterial(
            @PathVariable @org.springframework.lang.NonNull Long id,
            @RequestParam String courseIds,
            @AuthenticationPrincipal User teacher,
            HttpServletRequest request) {
        CourseMaterial material = courseMaterialRepository.findById(id)
                .filter(m -> m.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Material not found"));

        String[] ids = courseIds.split(",");
        for (String idStr : ids) {
            Long courseId = Long.valueOf(idStr.trim());
            if (material.getCourse().getId().equals(courseId))
                continue;

            Course course = courseRepository.findById(java.util.Objects.requireNonNull(courseId))
                    .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                    .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));

            CourseMaterial copy = CourseMaterial.builder()
                    .course(course).teacher(teacher).type(material.getType())
                    .title(material.getTitle()).description(material.getDescription())
                    .externalLink(material.getExternalLink()).dueDate(material.getDueDate())
                    .filePath(material.getFilePath()).fileName(material.getFileName())
                    .fileSize(material.getFileSize()).isPinned(false).isClosed(false).build();
            courseMaterialRepository.save(java.util.Objects.requireNonNull(copy));
        }
        auditService.log(teacher, "share_material", "course_material", id, request);
        return ResponseEntity.ok(ApiResponse.success("Material shared successfully", null));
    }

    @GetMapping("/materials/{materialId}/comments")

    public ResponseEntity<ApiResponse<List<Comment>>> getComments(@PathVariable Long materialId) {
        return ResponseEntity.ok(ApiResponse.success(commentRepository.findByMaterialIdWithUser(materialId)));
    }

    @PostMapping("/materials/{materialId}/comments")
    public ResponseEntity<ApiResponse<Comment>> addComment(
            @PathVariable @org.springframework.lang.NonNull Long materialId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher) {
        CourseMaterial material = courseMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found"));

        Comment comment = Comment.builder()
                .course(material.getCourse())
                .material(material)
                .user(teacher)
                .content(body.get("content").toString())
                .isPrivate(body.containsKey("isPrivate") && (boolean) body.get("isPrivate"))
                .build();

        return ResponseEntity.ok(ApiResponse.success("Comment added",
                commentRepository.save(java.util.Objects.requireNonNull(comment))));
    }

    @GetMapping("/materials/{materialId}/submissions")
    public ResponseEntity<ApiResponse<List<AssignmentSubmission>>> getSubmissions(@PathVariable Long materialId) {
        return ResponseEntity.ok(ApiResponse.success(assignmentSubmissionRepository.findByMaterialId(materialId)));
    }

    @PutMapping("/submissions/{id}")
    public ResponseEntity<ApiResponse<AssignmentSubmission>> gradeSubmission(
            @PathVariable @org.springframework.lang.NonNull Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher) {
        AssignmentSubmission submission = assignmentSubmissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        if (body.containsKey("grade"))
            submission.setGrade(body.get("grade").toString());
        if (body.containsKey("feedback"))
            submission.setFeedback(body.get("feedback").toString());
        submission.setStatus("graded");

        return ResponseEntity.ok(ApiResponse.success("Submission graded",
                assignmentSubmissionRepository.save(java.util.Objects.requireNonNull(submission))));
    }

    @DeleteMapping("/materials/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMaterial(
            @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User teacher,
            HttpServletRequest request) {
        CourseMaterial material = courseMaterialRepository.findById(id)
                .filter(m -> m.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Material not found"));

        if (material.getFilePath() != null) {
            try {
                Files.deleteIfExists(Paths.get(material.getFilePath()));
            } catch (IOException ignored) {
            }
        }

        courseMaterialRepository.delete(material);
        auditService.log(teacher, "delete_material", "course_material", id, request);
        return ResponseEntity.ok(ApiResponse.success("Material deleted", null));
    }

    // ── Messages ───────────────────────────────────────────────────────
    @PostMapping("/messages/send")
    public ResponseEntity<ApiResponse<Message>> sendMessage(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        Long receiverId = Long.valueOf(body.get("receiverId").toString());
        User receiver = userRepository.findById(java.util.Objects.requireNonNull(receiverId))
                .orElseThrow(() -> new ResourceNotFoundException("Recipient not found"));

        Message msg = Message.builder()
                .sender(teacher).receiver(receiver)
                .subject(body.containsKey("subject") ? body.get("subject").toString() : null)
                .content(body.get("content").toString())
                .parentId(body.containsKey("parentId") ? Long.valueOf(body.get("parentId").toString()) : null)
                .attachmentPath(body.containsKey("attachmentUrl") ? body.get("attachmentUrl").toString() : null)
                .attachmentName(body.containsKey("attachmentName") ? body.get("attachmentName").toString() : null)
                .attachmentType(body.containsKey("attachmentType") ? body.get("attachmentType").toString() : null)
                .attachmentSize(body.containsKey("attachmentSize") ? Long.valueOf(body.get("attachmentSize").toString()) : null)
                .build();
        msg = messageRepository.save(java.util.Objects.requireNonNull(msg));
        auditService.log(teacher, "send_dm", "message", msg.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Message sent", msg));
    }

    @PostMapping("/messages/group")
    public ResponseEntity<ApiResponse<CourseMessage>> sendGroupMessage(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        Long courseId = Long.valueOf(body.get("courseId").toString());
        Course course = courseRepository.findById(java.util.Objects.requireNonNull(courseId))
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        CourseMessage msg = CourseMessage.builder()
                .course(course).sender(teacher)
                .content(body.get("content").toString())
                .parentId(body.containsKey("parentId") ? Long.valueOf(body.get("parentId").toString()) : null)
                .attachmentPath(body.containsKey("attachmentUrl") ? body.get("attachmentUrl").toString() : null)
                .attachmentName(body.containsKey("attachmentName") ? body.get("attachmentName").toString() : null)
                .attachmentType(body.containsKey("attachmentType") ? body.get("attachmentType").toString() : null)
                .attachmentSize(body.containsKey("attachmentSize") ? Long.valueOf(body.get("attachmentSize").toString()) : null)
                .build();
        msg = courseMessageRepository.save(java.util.Objects.requireNonNull(msg));
        return ResponseEntity.ok(ApiResponse.success("Group message sent", msg));
    }

    @PostMapping("/messages/broadcast")
    public ResponseEntity<ApiResponse<Void>> broadcast(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        Long courseId = Long.valueOf(body.get("courseId").toString());
        Course course = courseRepository.findById(java.util.Objects.requireNonNull(courseId))
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        String subject = body.containsKey("subject") ? body.get("subject").toString()
                : "[" + course.getCourseName() + "] Announcement";
        String content = body.get("content").toString();

        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdAndStatus(courseId, "active");
        for (Enrollment e : enrollments) {
            Message msg = Message.builder()
                    .sender(teacher).receiver(e.getStudent()).course(course)
                    .subject(subject).content(content).build();
            messageRepository.save(java.util.Objects.requireNonNull(msg));
        }

        auditService.log(teacher, "broadcast_message", "course", courseId, request);
        return ResponseEntity.ok(ApiResponse.success("Broadcast sent to " + enrollments.size() + " students", null));
    }

    @GetMapping("/messages/group/{courseId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getGroupMessages(
            @PathVariable @org.springframework.lang.NonNull Long courseId, @AuthenticationPrincipal User teacher) {
        courseRepository.findById(courseId)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        List<CourseMessage> messages = courseMessageRepository.findByCourseIdWithSender(courseId);
        // Filter out messages deleted for this user
        messages.removeIf(m -> {
            String deleted = m.getDeletedForUsers();
            return deleted != null && deleted.contains("," + teacher.getId() + ",");
        });

        List<Map<String, Object>> data = messages.stream().map(m -> {
            Map<String, Object> sender = new HashMap<>();
            sender.put("id", m.getSender().getId());
            sender.put("firstName", m.getSender().getFirstName());
            sender.put("lastName", m.getSender().getLastName());
            sender.put("role", m.getSender().getRole());
            sender.put("avatarUrl", m.getSender().getAvatar());

            Map<String, Object> item = new HashMap<>();
            item.put("id", m.getId());
            item.put("content", m.getContent());
            item.put("createdAt", m.getCreatedAt());
            item.put("parentId", m.getParentId());
            item.put("attachmentPath", m.getAttachmentPath());
            item.put("attachmentName", m.getAttachmentName());
            item.put("attachmentType", m.getAttachmentType());
            item.put("attachmentSize", m.getAttachmentSize());
            item.put("sender", sender);
            return item;
        }).toList();

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/messages/dm")
    public ResponseEntity<ApiResponse<List<Message>>> getDmMessages(
            @RequestParam Long userId, @AuthenticationPrincipal User teacher) {
        return ResponseEntity.ok(ApiResponse.success(
                messageRepository.findConversation(teacher.getId(), userId)));
    }

    @GetMapping("/messages/conversations")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getConversations(
            @AuthenticationPrincipal User teacher) {
        List<Message> allMessages = messageRepository.findAllByUser(teacher.getId());
        Map<Long, Map<String, Object>> convMap = new LinkedHashMap<>();

        for (Message m : allMessages) {
            Long otherId = m.getSender().getId().equals(teacher.getId())
                    ? m.getReceiver().getId()
                    : m.getSender().getId();
            if (!convMap.containsKey(otherId)) {
                User other = m.getSender().getId().equals(teacher.getId())
                        ? m.getReceiver()
                        : m.getSender();
                Map<String, Object> conv = new HashMap<>();
                conv.put("userId", other.getId());
                conv.put("firstName", other.getFirstName());
                conv.put("lastName", other.getLastName());
                conv.put("role", other.getRole());
                conv.put("avatar", other.getAvatar());
                conv.put("lastMessage", m.getContent());
                conv.put("lastMessageTime", m.getCreatedAt());
                conv.put("unreadCount", messageRepository.countBySenderIdAndReceiverIdAndIsRead(
                        other.getId(), teacher.getId(), false));
                convMap.put(otherId, conv);
            }
        }
        return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(convMap.values())));
    }

    @GetMapping("/messages/contacts")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getContacts(
            @AuthenticationPrincipal User teacher) {
        List<Course> courses = courseRepository.findByTeacherIdAndStatusNot(teacher.getId(), "deleted");
        Map<Long, Map<String, Object>> contactMap = new LinkedHashMap<>();
        for (Course c : courses) {
            List<Enrollment> enrollments = enrollmentRepository.findByCourseIdAndStatus(c.getId(), "active");
            for (Enrollment e : enrollments) {
                User s = e.getStudent();
                if (!contactMap.containsKey(s.getId())) {
                    Map<String, Object> contact = new HashMap<>();
                    contact.put("id", s.getId());
                    contact.put("firstName", s.getFirstName());
                    contact.put("lastName", s.getLastName());
                    contact.put("email", s.getEmail());
                    contact.put("role", s.getRole());
                    contactMap.put(s.getId(), contact);
                }
            }
        }

        // Include other active teachers for direct collaboration
        List<User> allUsers = userRepository.findAll();
        for (User u : allUsers) {
            if (u.getId().equals(teacher.getId()))
                continue;
            String role = u.getRole() != null ? u.getRole().toLowerCase() : "";
            String status = u.getStatus() != null ? u.getStatus().toLowerCase() : "";
            if (!role.contains("teacher") || !"active".equals(status))
                continue;
            if (!contactMap.containsKey(u.getId())) {
                Map<String, Object> contact = new HashMap<>();
                contact.put("id", u.getId());
                contact.put("firstName", u.getFirstName());
                contact.put("lastName", u.getLastName());
                contact.put("email", u.getEmail());
                contact.put("role", u.getRole());
                contactMap.put(u.getId(), contact);
            }
        }

        return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(contactMap.values())));
    }

    @PostMapping("/messages/dm/read")
    @jakarta.transaction.Transactional
    public ResponseEntity<ApiResponse<Void>> markDmRead(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher) {
        Long userId = Long.valueOf(body.get("userId").toString());
        messageRepository.markAsRead(userId, teacher.getId());
        return ResponseEntity.ok(ApiResponse.success("Messages marked as read", null));
    }

    @PostMapping("/messages/upload")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadMessageFile(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User teacher) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please select a file to upload");
        }

        String uploadDir = "uploads/messages";
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);

        String contentType = file.getContentType();
        String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Files.copy(file.getInputStream(), uploadPath.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);

        String attachmentType = "file";
        if (contentType != null) {
            if (contentType.startsWith("image/")) attachmentType = "image";
            else if (contentType.startsWith("video/")) attachmentType = "video";
        }

        Map<String, Object> result = new HashMap<>();
        result.put("url", "/uploads/messages/" + fileName);
        result.put("name", file.getOriginalFilename());
        result.put("type", attachmentType);
        result.put("size", file.getSize());

        return ResponseEntity.ok(ApiResponse.success("File uploaded", result));
    }

    // Delete message for everyone (only sender can do this)
    @DeleteMapping("/messages/{id}")
    @jakarta.transaction.Transactional
    public ResponseEntity<ApiResponse<Void>> deleteMessageForEveryone(
            @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User teacher) {
        Message msg = messageRepository.findById(id)
                .filter(m -> m.getSender().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Message not found or not authorized"));
        messageRepository.delete(java.util.Objects.requireNonNull(msg));
        return ResponseEntity.ok(ApiResponse.success("Message deleted for everyone", null));
    }

    // Hide message for current user only
    @PostMapping("/messages/{id}/hide")
    @jakarta.transaction.Transactional
    public ResponseEntity<ApiResponse<Void>> hideMessage(
            @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User teacher) {
        Message msg = messageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (msg.getSender().getId().equals(teacher.getId())) {
            msg.setDeletedForSender(true);
        } else if (msg.getReceiver().getId().equals(teacher.getId())) {
            msg.setDeletedForReceiver(true);
        }
        messageRepository.save(java.util.Objects.requireNonNull(msg));
        return ResponseEntity.ok(ApiResponse.success("Message hidden", null));
    }

    // Delete group message for everyone (only sender can do this)
    @DeleteMapping("/messages/group/{id}")
    @jakarta.transaction.Transactional
    public ResponseEntity<ApiResponse<Void>> deleteGroupMessageForEveryone(
            @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User teacher) {
        CourseMessage msg = courseMessageRepository.findById(id)
                .filter(m -> m.getSender().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Message not found or not authorized"));
        courseMessageRepository.delete(java.util.Objects.requireNonNull(msg));
        return ResponseEntity.ok(ApiResponse.success("Group message deleted for everyone", null));
    }

    // Hide group message for current user
    @PostMapping("/messages/group/{id}/hide")
    @jakarta.transaction.Transactional
    public ResponseEntity<ApiResponse<Void>> hideGroupMessage(
            @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User teacher) {
        CourseMessage msg = courseMessageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
        String deleted = msg.getDeletedForUsers() == null ? "" : msg.getDeletedForUsers();
        if (!deleted.contains("," + teacher.getId() + ",")) {
            deleted += "," + teacher.getId() + ",";
            msg.setDeletedForUsers(deleted);
            courseMessageRepository.save(java.util.Objects.requireNonNull(msg));
        }
        return ResponseEntity.ok(ApiResponse.success("Group message hidden", null));
    }

    // ── Reports ────────────────────────────────────────────────────────
    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReport(
            @RequestParam @org.springframework.lang.NonNull Long courseId, @AuthenticationPrincipal User teacher) {
        Course course = courseRepository.findById(courseId)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        List<AttendanceSession> sessions = attendanceSessionRepository.findByCourseId(courseId);
        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdAndStatus(courseId, "active");

        List<Map<String, Object>> studentsData = new ArrayList<>();
        for (Enrollment e : enrollments) {
            User s = e.getStudent();
            long present = attendanceRecordRepository.countByStudentIdAndCourseIdAndStatus(s.getId(), courseId,
                    "present");
            long late = attendanceRecordRepository.countByStudentIdAndCourseIdAndStatus(s.getId(), courseId, "late");
            long absent = attendanceRecordRepository.countByStudentIdAndCourseIdAndStatus(s.getId(), courseId,
                    "absent");

            Map<String, Object> sd = new HashMap<>();
            sd.put("id", s.getId());
            sd.put("name", s.getFullName());
            sd.put("studentId", s.getStudentId());
            sd.put("email", s.getEmail());
            sd.put("present", present);
            sd.put("late", late);
            sd.put("absent", absent);
            long total = present + late + absent;
            sd.put("rate", total > 0 ? Math.round(((double) (present + late) / total) * 1000.0) / 10.0 : 100);
            studentsData.add(sd);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("course", course);
        data.put("students", studentsData);
        data.put("totalSessions", sessions.size());
        data.put("totalStudents", enrollments.size());

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/reports/student")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStudentReport(
            @RequestParam @org.springframework.lang.NonNull Long courseId,
            @RequestParam @org.springframework.lang.NonNull Long studentId,
            @AuthenticationPrincipal User teacher) {
        Course course = courseRepository.findById(courseId)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        List<AttendanceSession> sessions = attendanceSessionRepository.findByCourseId(courseId);
        List<Map<String, Object>> records = new ArrayList<>();

        for (AttendanceSession session : sessions) {
            Map<String, Object> record = new HashMap<>();
            record.put("sessionId", session.getId());
            record.put("sessionTitle", session.getSessionTitle());
            record.put("date", session.getStartTime());
            record.put("durationMinutes", session.getDurationMinutes());

            List<AttendanceRecord> attendanceRecords = attendanceRecordRepository.findBySessionId(session.getId());
            AttendanceRecord studentRecord = attendanceRecords.stream()
                    .filter(r -> r.getStudent().getId().equals(studentId))
                    .findFirst().orElse(null);

            if (studentRecord != null) {
                record.put("status", studentRecord.getStatus());
                record.put("submittedAt", studentRecord.getSubmittedAt());
            } else {
                record.put("status", session.getStatus().equals("active") ? "pending" : "absent");
                record.put("submittedAt", null);
            }
            records.add(record);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("student", Map.of(
                "id", student.getId(),
                "name", student.getFullName(),
                "studentId", student.getStudentId() != null ? student.getStudentId() : "",
                "email", student.getEmail()));
        data.put("course", Map.of("courseCode", course.getCourseCode(), "courseName", course.getCourseName()));
        data.put("records", records);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // ── Profile ────────────────────────────────────────────────────────
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateProfile(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        
        if (body.containsKey("firstName"))
            teacher.setFirstName(body.get("firstName"));
        if (body.containsKey("lastName"))
            teacher.setLastName(body.get("lastName"));
        if (body.containsKey("department"))
            teacher.setDepartment(body.get("department"));

        teacher = userRepository.save(java.util.Objects.requireNonNull(teacher));
        auditService.log(teacher, "update_profile", "user", teacher.getId(), request);

        Map<String, Object> userData = new HashMap<>();
        userData.put("id", teacher.getId());
        userData.put("email", teacher.getEmail());
        userData.put("firstName", teacher.getFirstName());
        userData.put("lastName", teacher.getLastName());
        userData.put("fullName", teacher.getFullName());
        userData.put("role", teacher.getRole());
        userData.put("department", teacher.getDepartment());
        userData.put("avatar", teacher.getAvatar());
        return ResponseEntity.ok(ApiResponse.success("Profile updated", userData));
    }

    @PostMapping("/profile/avatar")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User teacher,
            HttpServletRequest request) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please select an image to upload");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("Only image files are allowed");
        }

        String avatarPath = saveAvatar(file, teacher.getId());
        teacher.setAvatar(avatarPath);
        teacher = userRepository.save(java.util.Objects.requireNonNull(teacher));
        auditService.log(teacher, "update_avatar", "user", teacher.getId(), request);

        Map<String, Object> userData = new HashMap<>();
        userData.put("id", teacher.getId());
        userData.put("email", teacher.getEmail());
        userData.put("firstName", teacher.getFirstName());
        userData.put("lastName", teacher.getLastName());
        userData.put("fullName", teacher.getFullName());
        userData.put("role", teacher.getRole());
        userData.put("department", teacher.getDepartment());
        userData.put("avatar", teacher.getAvatar());
        return ResponseEntity.ok(ApiResponse.success("Avatar updated", userData));
    }

    @DeleteMapping("/profile/avatar")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteAvatar(
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        teacher.setAvatar(null);
        teacher = userRepository.save(teacher);
        auditService.log(teacher, "delete_avatar", "user", teacher.getId(), request);

        Map<String, Object> userData = new HashMap<>();
        userData.put("id", teacher.getId());
        userData.put("email", teacher.getEmail());
        userData.put("firstName", teacher.getFirstName());
        userData.put("lastName", teacher.getLastName());
        userData.put("fullName", teacher.getFullName());
        userData.put("role", teacher.getRole());
        userData.put("department", teacher.getDepartment());
        userData.put("avatar", teacher.getAvatar());
        return ResponseEntity.ok(ApiResponse.success("Avatar removed", userData));
    }

    @PutMapping("/profile/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || newPassword == null) {
            throw new BadRequestException("Current and new password are required");
        }

        if (!passwordEncoder.matches(currentPassword, teacher.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        if (newPassword.length() < 8) {
            throw new BadRequestException("New password must be at least 8 characters");
        }

        // New requirements check
        boolean hasDigit = false;
        boolean hasSpecial = false;
        String specialChars = "!@#$%^&*()-_=+[]{}|;:,.<>?";
        for (char c : newPassword.toCharArray()) {
            if (Character.isDigit(c)) hasDigit = true;
            else if (specialChars.contains(String.valueOf(c))) hasSpecial = true;
        }
        if (!hasDigit || !hasSpecial) {
            throw new BadRequestException("Password must contain at least one number and one special character");
        }

        teacher.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(java.util.Objects.requireNonNull(teacher));
        auditService.log(teacher, "change_password", "user", teacher.getId(), request);

        // Alert Admin Dashboard
        SecurityEvent event = new SecurityEvent();
        event.setType(SecurityEventType.PASSWORD_CHANGE);
        event.setSeverity(SecurityEventSeverity.LOW);
        event.setDescription("Profile password changed by user: " + teacher.getEmail());
        event.setUserEmail(teacher.getEmail());
        event.setIpAddress(request.getRemoteAddr());
        event.setAcknowledged(false);
        securityEventRepository.save(event);

        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    // ── Settings ───────────────────────────────────────────────────────
    @GetMapping("/settings/attendance")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttendanceSettings(
            @AuthenticationPrincipal User teacher) {
        Map<String, Object> settings = new HashMap<>();
        settings.put("lateEnabled", teacher.getAttendanceLateEnabled() != null ? teacher.getAttendanceLateEnabled() : true);
        settings.put("lateMinutes", teacher.getAttendanceLateMinutes() != null ? teacher.getAttendanceLateMinutes() : 15);
        return ResponseEntity.ok(ApiResponse.success(settings));
    }

    @PutMapping("/settings/attendance")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateAttendanceSettings(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher,
            HttpServletRequest request) {
        
        if (body.containsKey("lateEnabled")) {
            teacher.setAttendanceLateEnabled((Boolean) body.get("lateEnabled"));
        }
        
        if (body.containsKey("lateMinutes")) {
            int lateMinutes = Integer.parseInt(body.get("lateMinutes").toString());
            if (lateMinutes < 1) {
                throw new BadRequestException("Late threshold must be at least 1 minute");
            }
            if (lateMinutes > 1440) {
                throw new BadRequestException("Late threshold cannot exceed 1440 minutes (24 hours)");
            }
            teacher.setAttendanceLateMinutes(lateMinutes);
        }
        
        teacher = userRepository.save(teacher);
        auditService.log(teacher, "update_attendance_settings", "user", teacher.getId(), request);
        
        Map<String, Object> settings = new HashMap<>();
        settings.put("lateEnabled", teacher.getAttendanceLateEnabled());
        settings.put("lateMinutes", teacher.getAttendanceLateMinutes());
        
        return ResponseEntity.ok(ApiResponse.success("Attendance settings updated", settings));
    }

    // ── Helpers ────────────────────────────────────────────────────────
    private String generateCode(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < length; i++)
            sb.append(chars.charAt(random.nextInt(chars.length())));
        return sb.toString();
    }

    private Map<String, Object> mapEnrollment(Enrollment enrollment) {
        User student = enrollment.getStudent();

        Map<String, Object> studentData = new HashMap<>();
        if (student != null) {
            studentData.put("id", student.getId());
            studentData.put("firstName", student.getFirstName());
            studentData.put("lastName", student.getLastName());
            studentData.put("email", student.getEmail());
            studentData.put("studentId", student.getStudentId());
            studentData.put("role", student.getRole());
            studentData.put("status", student.getStatus());
        }

        Map<String, Object> enrollmentData = new HashMap<>();
        enrollmentData.put("id", enrollment.getId());
        enrollmentData.put("status", enrollment.getStatus());
        enrollmentData.put("enrolledAt", enrollment.getEnrolledAt());
        enrollmentData.put("student", studentData);
        return enrollmentData;
    }

    private String saveAvatar(MultipartFile file, Long userId) throws IOException {
        String uploadDir = "uploads/avatars/" + userId;
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);

        String originalName = file.getOriginalFilename();
        if (originalName == null)
            originalName = "avatar";
        String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String fileName = System.currentTimeMillis() + "_" + safeName;

        Path target = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/avatars/" + userId + "/" + fileName;
    }
}
