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
import com.attendease.entity.SecurityEvent;
import com.attendease.entity.SecurityEventType;
import com.attendease.entity.SecurityEventSeverity;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasRole('STUDENT')")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class StudentController {

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
        private final PasswordEncoder passwordEncoder;
        private final SecurityEventRepository securityEventRepository;

        // ── Dashboard ──────────────────────────────────────────────────────
        @GetMapping("/dashboard")
        public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard(@AuthenticationPrincipal User student) {
                List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndStatus(student.getId(), "active");
                List<Map<String, Object>> courseData = new ArrayList<>();

                List<Map<String, Object>> activeSessions = new ArrayList<>();

                for (Enrollment e : enrollments) {
                        Course course = e.getCourse();
                        long total = attendanceRecordRepository.countByStudentIdAndCourseId(student.getId(),
                                        course.getId());
                        long present = attendanceRecordRepository.countByStudentIdAndCourseIdAndStatus(student.getId(),
                                        course.getId(), "present");
                        long late = attendanceRecordRepository.countByStudentIdAndCourseIdAndStatus(student.getId(),
                                        course.getId(),
                                        "late");

                        Map<String, Object> cd = new HashMap<>();
                        Map<String, Object> courseInfo = new HashMap<>();
                        courseInfo.put("id", course.getId());
                        courseInfo.put("courseCode", course.getCourseCode());
                        courseInfo.put("courseName", course.getCourseName());
                        courseInfo.put("description", course.getDescription());
                        courseInfo.put("section", course.getSection());
                        courseInfo.put("schedule", course.getSchedule());
                        courseInfo.put("room", course.getRoom());
                        courseInfo.put("coverColor", course.getCoverColor());

                        User t = course.getTeacher();
                        if (t != null) {
                                Map<String, Object> teacherData = new HashMap<>();
                                teacherData.put("id", t.getId());
                                teacherData.put("firstName", t.getFirstName());
                                teacherData.put("lastName", t.getLastName());
                                teacherData.put("email", t.getEmail());
                                teacherData.put("role", t.getRole());
                                courseInfo.put("teacher", teacherData);
                        }
                        
                        cd.put("course", courseInfo);
                        cd.put("totalSessions", total);
                        cd.put("presentCount", present + late);
                        cd.put("attendanceRate",
                                        total > 0 ? Math.round(((double) (present + late) / total) * 1000.0) / 10.0
                                                        : 0);
                        courseData.add(cd);

                        // Check for active sessions
                        attendanceSessionRepository.findByCourseIdAndStatus(course.getId(), "active").forEach(s -> {
                                boolean alreadySubmitted = attendanceRecordRepository.existsBySessionIdAndStudentId(
                                                s.getId(),
                                                student.getId());
                                Map<String, Object> sm = new HashMap<>();
                                sm.put("session", s);
                                sm.put("courseName", course.getCourseName());
                                sm.put("alreadySubmitted", alreadySubmitted);
                                activeSessions.add(sm);
                        });
                }

                Map<String, Object> data = new HashMap<>();
                data.put("courses", courseData);
                data.put("activeSessions", activeSessions);
                data.put("totalCourses", enrollments.size());

                return ResponseEntity.ok(ApiResponse.success(data));
        }

        // ── Courses ────────────────────────────────────────────────────────
        @GetMapping("/courses")
        public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCourses(
                        @AuthenticationPrincipal User student) {
                List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndStatus(student.getId(), "active");
                List<Map<String, Object>> courses = enrollments.stream().map(e -> {
                        Map<String, Object> m = new HashMap<>();
                        Course c = e.getCourse();

                        Map<String, Object> courseData = new HashMap<>();
                        courseData.put("id", c.getId());
                        courseData.put("courseCode", c.getCourseCode());
                        courseData.put("courseName", c.getCourseName());
                        courseData.put("description", c.getDescription());
                        courseData.put("joinCode", c.getJoinCode());
                        courseData.put("section", c.getSection());
                        courseData.put("schedule", c.getSchedule());
                        courseData.put("room", c.getRoom());
                        courseData.put("coverColor", c.getCoverColor());
                        courseData.put("status", c.getStatus());

                        User t = c.getTeacher();
                        if (t != null) {
                                Map<String, Object> teacherData = new HashMap<>();
                                teacherData.put("id", t.getId());
                                teacherData.put("firstName", t.getFirstName());
                                teacherData.put("lastName", t.getLastName());
                                teacherData.put("email", t.getEmail());
                                teacherData.put("role", t.getRole());
                                courseData.put("teacher", teacherData);
                        }

                        Map<String, Object> enrollmentData = new HashMap<>();
                        enrollmentData.put("id", e.getId());
                        enrollmentData.put("status", e.getStatus());
                        enrollmentData.put("enrolledAt", e.getEnrolledAt());

                        m.put("enrollment", enrollmentData);
                        m.put("course", courseData);
                        return m;
                }).toList();
                return ResponseEntity.ok(ApiResponse.success(courses));
        }

        @PostMapping("/courses/join")
        public ResponseEntity<ApiResponse<Enrollment>> joinCourse(
                        @RequestBody Map<String, String> body,
                        @AuthenticationPrincipal User student, HttpServletRequest request) {
                String joinCode = body.get("joinCode");
                Course course = courseRepository.findByJoinCode(joinCode.toUpperCase())
                                .orElseThrow(() -> new ResourceNotFoundException("Invalid join code"));

                if (enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), course.getId())) {
                        throw new BadRequestException("Already enrolled in this course");
                }

                Enrollment enrollment = Enrollment.builder()
                                .student(student).course(course).status("active").build();
                enrollment = enrollmentRepository.save(enrollment);
                auditService.log(student, "join_course", "enrollment", enrollment.getId(), request);
                return ResponseEntity.ok(ApiResponse.success("Joined course: " + course.getCourseName(), enrollment));
        }

        @GetMapping("/courses/{id}")
        public ResponseEntity<ApiResponse<Map<String, Object>>> getCourseDetail(
                        @PathVariable Long id, @AuthenticationPrincipal User student) {
                enrollmentRepository.findByStudentIdAndCourseId(student.getId(), id)
                                .filter(e -> "active".equals(e.getStatus()))
                                .orElseThrow(() -> new ResourceNotFoundException("Not enrolled in this course"));

                Course course = courseRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

                Map<String, Object> data = new HashMap<>();
                data.put("course", course);
                List<Enrollment> activeEnrollments = enrollmentRepository.findByCourseIdAndStatus(id, "active");
                List<Map<String, Object>> enrollmentData = activeEnrollments.stream().map(e -> {
                        User s = e.getStudent();
                        Map<String, Object> studentData = new HashMap<>();
                        studentData.put("id", s.getId());
                        studentData.put("firstName", s.getFirstName());
                        studentData.put("lastName", s.getLastName());
                        studentData.put("studentId", s.getStudentId());
                        studentData.put("avatarUrl", s.getAvatar());
                        studentData.put("role", s.getRole());

                        Map<String, Object> row = new HashMap<>();
                        row.put("id", e.getId());
                        row.put("status", e.getStatus());
                        row.put("student", studentData);
                        return row;
                }).toList();
                data.put("enrollments", enrollmentData);
                data.put("materials", courseMaterialRepository.findByCourseIdOrderByIsPinnedDescCreatedAtDesc(id));
                data.put("attendanceRecords",
                                attendanceRecordRepository.findByStudentIdAndCourseId(student.getId(), id));
                return ResponseEntity.ok(ApiResponse.success(data));
        }

        // ── Attendance ─────────────────────────────────────────────────────
        @PostMapping("/attendance/submit")
        public ResponseEntity<ApiResponse<AttendanceRecord>> submitAttendance(
                        @RequestBody Map<String, Object> body,
                        @AuthenticationPrincipal User student, HttpServletRequest request) {

                Long sessionId = Long.valueOf(body.get("sessionId").toString());
                String code = body.get("attendanceCode").toString().toUpperCase().trim();

                AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

                // Verify enrollment
                enrollmentRepository.findByStudentIdAndCourseId(student.getId(), session.getCourse().getId())
                                .filter(e -> "active".equals(e.getStatus()))
                                .orElseThrow(() -> new BadRequestException("Not enrolled in this course"));

                // Check duplicate
                if (attendanceRecordRepository.existsBySessionIdAndStudentId(sessionId, student.getId())) {
                        throw new BadRequestException("Already submitted attendance for this session");
                }

                // Verify code
                if (!session.getAttendanceCode().equals(code)) {
                        throw new BadRequestException("Invalid attendance code");
                }

                // Check session status
                if (!"active".equals(session.getStatus())) {
                        throw new BadRequestException("This attendance session is no longer active");
                }

                // Determine status (present vs late)
                LocalDateTime now = LocalDateTime.now();
                String status;

                // Check if late system is disabled for this session
                if (!session.getAllowLate()) {
                        // Late system disabled - everyone is "present" if within session time
                        if (now.isAfter(session.getEndTime())) {
                                throw new BadRequestException("Attendance window has closed");
                        }
                        status = "present";
                } else {
                        // Late system enabled - check threshold
                        LocalDateTime lateThreshold = session.getStartTime().plusMinutes(session.getLateMinutes());
                        
                        if (now.isAfter(session.getEndTime())) {
                                throw new BadRequestException("Attendance window has closed");
                        } else if (now.isAfter(lateThreshold)) {
                                status = "late";
                        } else {
                                status = "present";
                        }
                }

                AttendanceRecord record = AttendanceRecord.builder()
                                .session(session)
                                .student(student)
                                .course(session.getCourse())
                                .status(status)
                                .ipAddress(request.getRemoteAddr())
                                .deviceInfo(request.getHeader("User-Agent"))
                                .build();

                record = attendanceRecordRepository.save(record);
                auditService.log(student, "submit_attendance", "attendance_record", record.getId(), request);

                String message = "present".equals(status)
                                ? "Attendance recorded! You are marked as Present."
                                : "Attendance recorded as Late.";
                return ResponseEntity.ok(ApiResponse.success(message, record));
        }

    @GetMapping("/materials")
    public ResponseEntity<ApiResponse<List<CourseMaterial>>> getMaterials(
            @RequestParam Long courseId,
            @AuthenticationPrincipal User student) {
        enrollmentRepository.findByStudentIdAndCourseId(student.getId(), courseId)
                .filter(e -> "active".equals(e.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Not enrolled in this course"));

        return ResponseEntity.ok(ApiResponse.success(
                courseMaterialRepository.findByCourseIdOrderByIsPinnedDescCreatedAtDesc(courseId)));
    }

    @GetMapping("/materials/{materialId}/comments")
    public ResponseEntity<ApiResponse<List<Comment>>> getComments(@PathVariable Long materialId) {
        return ResponseEntity.ok(ApiResponse.success(commentRepository.findByMaterialIdWithUser(materialId)));
    }

    @PostMapping("/materials/{materialId}/comments")
    public ResponseEntity<ApiResponse<Comment>> addComment(
            @PathVariable Long materialId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User student) {
        CourseMaterial material = courseMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found"));
        
        Comment comment = Comment.builder()
                .course(material.getCourse())
                .material(material)
                .user(student)
                .content(body.get("content").toString())
                .isPrivate(body.containsKey("isPrivate") && (boolean) body.get("isPrivate"))
                .build();
        
        return ResponseEntity.ok(ApiResponse.success("Comment added", commentRepository.save(comment)));
    }

    @GetMapping("/materials/{materialId}/submission")
    public ResponseEntity<ApiResponse<AssignmentSubmission>> getSubmission(
            @PathVariable Long materialId, @AuthenticationPrincipal User student) {
        return ResponseEntity.ok(ApiResponse.success(
                assignmentSubmissionRepository.findByMaterialIdAndStudentId(materialId, student.getId()).orElse(null)));
    }

    @PostMapping("/submissions")
    public ResponseEntity<ApiResponse<AssignmentSubmission>> submitHomework(
            @RequestParam Long materialId,
            @RequestParam(required = false) MultipartFile file,
            @RequestParam(required = false) String content,
            @AuthenticationPrincipal User student,
            HttpServletRequest request) throws IOException {

        CourseMaterial material = courseMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        if (!"assignment".equals(material.getType())) {
            throw new BadRequestException("This material is not an assignment");
        }

        // Check if already submitted
        AssignmentSubmission submission = assignmentSubmissionRepository.findByMaterialIdAndStudentId(materialId, student.getId())
                .orElse(AssignmentSubmission.builder().material(material).student(student).build());

        submission.setContent(content);
        submission.setStatus("submitted");

        if (file != null && !file.isEmpty()) {
            String uploadDir = "uploads/submissions/" + materialId;
            Path uploadPath = Paths.get(uploadDir);
            Files.createDirectories(uploadPath);
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Files.copy(file.getInputStream(), uploadPath.resolve(fileName));
            submission.setFilePath(uploadDir + "/" + fileName);
            submission.setFileName(file.getOriginalFilename());
            submission.setFileSize((int) file.getSize());
        }

        submission = assignmentSubmissionRepository.save(submission);
        auditService.log(student, "submit_homework", "assignment_submission", submission.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Homework submitted successfully", submission));
    }

        // ── Messages ───────────────────────────────────────────────────────
        @GetMapping("/messages")
        public ResponseEntity<ApiResponse<List<Message>>> getMessages(@AuthenticationPrincipal User student) {
                return ResponseEntity.ok(ApiResponse.success(
                                messageRepository.findByReceiverIdOrderByCreatedAtDesc(student.getId())));
        }

        @PostMapping("/messages/send")
        public ResponseEntity<ApiResponse<Message>> sendMessage(
                        @RequestBody Map<String, Object> body, @AuthenticationPrincipal User student) {
                Long receiverId = Long.valueOf(body.get("receiverId").toString());
                User receiver = userRepository.findById(receiverId)
                                .orElseThrow(() -> new ResourceNotFoundException("Recipient not found"));

                Message msg = Message.builder()
                                .sender(student).receiver(receiver)
                                .subject(body.containsKey("subject") ? body.get("subject").toString() : null)
                                .content(body.get("content").toString())
                                .parentId(body.containsKey("parentId") ? Long.valueOf(body.get("parentId").toString()) : null)
                                .attachmentPath(body.containsKey("attachmentUrl") ? body.get("attachmentUrl").toString() : null)
                                .attachmentName(body.containsKey("attachmentName") ? body.get("attachmentName").toString() : null)
                                .attachmentType(body.containsKey("attachmentType") ? body.get("attachmentType").toString() : null)
                                .attachmentSize(body.containsKey("attachmentSize") ? Long.valueOf(body.get("attachmentSize").toString()) : null)
                                .build();
                return ResponseEntity.ok(ApiResponse.success("Message sent", messageRepository.save(msg)));
        }

        @GetMapping("/messages/group/{courseId}")
        public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getGroupMessages(
                        @PathVariable Long courseId, @AuthenticationPrincipal User student) {
                enrollmentRepository.findByStudentIdAndCourseId(student.getId(), courseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Not enrolled"));
                List<CourseMessage> messages = courseMessageRepository.findByCourseIdWithSender(courseId);
                messages.removeIf(m -> {
                        String deleted = m.getDeletedForUsers();
                        return deleted != null && deleted.contains("," + student.getId() + ",");
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
                        @RequestParam Long userId, @AuthenticationPrincipal User student) {
                return ResponseEntity.ok(ApiResponse.success(
                                messageRepository.findConversation(student.getId(), userId)));
        }

        @GetMapping("/messages/conversations")
        public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getConversations(
                        @AuthenticationPrincipal User student) {
                List<Message> allMessages = messageRepository.findAllByUser(student.getId());
                Map<Long, Map<String, Object>> convMap = new LinkedHashMap<>();

                for (Message m : allMessages) {
                        Long otherId = m.getSender().getId().equals(student.getId())
                                        ? m.getReceiver().getId() : m.getSender().getId();
                        if (!convMap.containsKey(otherId)) {
                                User other = m.getSender().getId().equals(student.getId())
                                                ? m.getReceiver() : m.getSender();
                                Map<String, Object> conv = new HashMap<>();
                                conv.put("userId", other.getId());
                                conv.put("firstName", other.getFirstName());
                                conv.put("lastName", other.getLastName());
                                conv.put("role", other.getRole());
                                conv.put("avatar", other.getAvatar());
                                conv.put("lastMessage", m.getContent());
                                conv.put("lastMessageTime", m.getCreatedAt());
                                conv.put("unreadCount", messageRepository.countBySenderIdAndReceiverIdAndIsRead(
                                                other.getId(), student.getId(), false));
                                convMap.put(otherId, conv);
                        }
                }
                return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(convMap.values())));
        }

        @GetMapping("/messages/contacts")
        public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getContacts(
                        @AuthenticationPrincipal User student) {
                List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndStatus(student.getId(), "active");
                Map<Long, Map<String, Object>> contactMap = new LinkedHashMap<>();
                for (Enrollment e : enrollments) {
                        User t = e.getCourse().getTeacher();
                        if (!contactMap.containsKey(t.getId())) {
                                Map<String, Object> contact = new HashMap<>();
                                contact.put("id", t.getId());
                                contact.put("firstName", t.getFirstName());
                                contact.put("lastName", t.getLastName());
                                contact.put("email", t.getEmail());
                                contact.put("role", t.getRole());
                                contactMap.put(t.getId(), contact);
                        }
                }
                return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(contactMap.values())));
        }

        @PostMapping("/messages/dm/read")
        @jakarta.transaction.Transactional
        public ResponseEntity<ApiResponse<Void>> markDmRead(
                        @RequestBody Map<String, Object> body,
                        @AuthenticationPrincipal User student) {
                Long userId = Long.valueOf(body.get("userId").toString());
                messageRepository.markAsRead(userId, student.getId());
                return ResponseEntity.ok(ApiResponse.success("Messages marked as read", null));
        }

        @PostMapping("/messages/upload")
        public ResponseEntity<ApiResponse<Map<String, Object>>> uploadMessageFile(
                        @RequestParam("file") MultipartFile file,
                        @AuthenticationPrincipal User student) throws IOException {
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
                        @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User student) {
                Message msg = messageRepository.findById(id)
                                .filter(m -> m.getSender().getId().equals(student.getId()))
                                .orElseThrow(() -> new ResourceNotFoundException("Message not found or not authorized"));
                messageRepository.delete(java.util.Objects.requireNonNull(msg));
                return ResponseEntity.ok(ApiResponse.success("Message deleted for everyone", null));
        }

        // Hide message for current user only
        @PostMapping("/messages/{id}/hide")
        @jakarta.transaction.Transactional
        public ResponseEntity<ApiResponse<Void>> hideMessage(
                        @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User student) {
                Message msg = messageRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

                if (msg.getSender().getId().equals(student.getId())) {
                        msg.setDeletedForSender(true);
                } else if (msg.getReceiver().getId().equals(student.getId())) {
                        msg.setDeletedForReceiver(true);
                }
                messageRepository.save(java.util.Objects.requireNonNull(msg));
                return ResponseEntity.ok(ApiResponse.success("Message hidden", null));
        }

        // Delete group message for everyone (only sender can do this)
        @DeleteMapping("/messages/group/{id}")
        @jakarta.transaction.Transactional
        public ResponseEntity<ApiResponse<Void>> deleteGroupMessageForEveryone(
                        @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User student) {
                CourseMessage msg = courseMessageRepository.findById(id)
                                .filter(m -> m.getSender().getId().equals(student.getId()))
                                .orElseThrow(() -> new ResourceNotFoundException("Message not found or not authorized"));
                courseMessageRepository.delete(java.util.Objects.requireNonNull(msg));
                return ResponseEntity.ok(ApiResponse.success("Group message deleted for everyone", null));
        }

        // Hide group message for current user
        @PostMapping("/messages/group/{id}/hide")
        @jakarta.transaction.Transactional
        public ResponseEntity<ApiResponse<Void>> hideGroupMessage(
                        @PathVariable @org.springframework.lang.NonNull Long id, @AuthenticationPrincipal User student) {
                CourseMessage msg = courseMessageRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
                String deleted = msg.getDeletedForUsers() == null ? "" : msg.getDeletedForUsers();
                if (!deleted.contains("," + student.getId() + ",")) {
                        deleted += "," + student.getId() + ",";
                        msg.setDeletedForUsers(deleted);
                        courseMessageRepository.save(java.util.Objects.requireNonNull(msg));
                }
                return ResponseEntity.ok(ApiResponse.success("Group message hidden", null));
        }


        @PostMapping("/messages/group")
        public ResponseEntity<ApiResponse<CourseMessage>> sendGroupMessage(
                        @RequestBody Map<String, Object> body, @AuthenticationPrincipal User student) {
                Long courseId = Long.valueOf(body.get("courseId").toString());
                enrollmentRepository.findByStudentIdAndCourseId(student.getId(), courseId)
                                .filter(e -> "active".equals(e.getStatus()))
                                .orElseThrow(() -> new BadRequestException("Not enrolled"));
                Course course = courseRepository.findById(courseId)
                                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
                CourseMessage msg = CourseMessage.builder()
                                .course(course).sender(student)
                                .content(body.get("content").toString())
                                .parentId(body.containsKey("parentId") ? Long.valueOf(body.get("parentId").toString()) : null)
                                .attachmentPath(body.containsKey("attachmentUrl") ? body.get("attachmentUrl").toString() : null)
                                .attachmentName(body.containsKey("attachmentName") ? body.get("attachmentName").toString() : null)
                                .attachmentType(body.containsKey("attachmentType") ? body.get("attachmentType").toString() : null)
                                .attachmentSize(body.containsKey("attachmentSize") ? Long.valueOf(body.get("attachmentSize").toString()) : null)
                                .build();
                return ResponseEntity.ok(ApiResponse.success("Message sent", courseMessageRepository.save(msg)));
        }

        // ── Profile ────────────────────────────────────────────────────────
        @PutMapping("/profile")
        public ResponseEntity<ApiResponse<Map<String, Object>>> updateProfile(
                        @RequestBody Map<String, String> body,
                        @AuthenticationPrincipal User student,
                        HttpServletRequest request) {

                if (body.containsKey("firstName")) student.setFirstName(body.get("firstName"));
                if (body.containsKey("lastName")) student.setLastName(body.get("lastName"));
                if (body.containsKey("department")) student.setDepartment(body.get("department"));

                student = userRepository.save(student);
                auditService.log(student, "update_profile", "user", student.getId(), request);
                return ResponseEntity.ok(ApiResponse.success("Profile updated", buildUserData(student)));
        }

        @PutMapping("/profile/password")
        public ResponseEntity<ApiResponse<Void>> changePassword(
                        @RequestBody Map<String, String> body,
                        @AuthenticationPrincipal User student,
                        HttpServletRequest request) {
                String currentPassword = body.get("currentPassword");
                String newPassword = body.get("newPassword");

                if (currentPassword == null || newPassword == null) {
                        throw new BadRequestException("Current and new password are required");
                }

                if (!passwordEncoder.matches(currentPassword, student.getPassword())) {
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

                student.setPassword(passwordEncoder.encode(newPassword));
                userRepository.save(student);
                auditService.log(student, "change_password", "user", student.getId(), request);

                // Alert Admin Dashboard
                SecurityEvent event = new SecurityEvent();
                event.setType(SecurityEventType.PASSWORD_CHANGE);
                event.setSeverity(SecurityEventSeverity.LOW);
                event.setDescription("Profile password changed by user: " + student.getEmail());
                event.setUserEmail(student.getEmail());
                event.setIpAddress(request.getRemoteAddr());
                event.setAcknowledged(false);
                securityEventRepository.save(event);

                return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
        }

        @PostMapping("/profile/avatar")
        public ResponseEntity<ApiResponse<Map<String, Object>>> uploadAvatar(
                        @RequestParam("file") MultipartFile file,
                        @AuthenticationPrincipal User student,
                        HttpServletRequest request) throws IOException {
                if (file == null || file.isEmpty()) {
                        throw new BadRequestException("Please select an image to upload");
                }

                String contentType = file.getContentType();
                if (contentType == null || !contentType.startsWith("image/")) {
                        throw new BadRequestException("Only image files are allowed");
                }

                String avatarPath = saveAvatar(file, student.getId());
                student.setAvatar(avatarPath);
                student = userRepository.save(student);
                auditService.log(student, "update_avatar", "user", student.getId(), request);

                return ResponseEntity.ok(ApiResponse.success("Avatar updated", buildUserData(student)));
        }

        @DeleteMapping("/profile/avatar")
        public ResponseEntity<ApiResponse<Map<String, Object>>> deleteAvatar(
                        @AuthenticationPrincipal User student,
                        HttpServletRequest request) {
                student.setAvatar(null);
                student = userRepository.save(student);
                auditService.log(student, "delete_avatar", "user", student.getId(), request);
                return ResponseEntity.ok(ApiResponse.success("Avatar removed", buildUserData(student)));
        }

        @PostMapping("/courses/{id}/leave")
        public ResponseEntity<ApiResponse<Void>> leaveCourse(
                        @PathVariable Long id, @AuthenticationPrincipal User student, HttpServletRequest request) {
                Enrollment enrollment = enrollmentRepository.findByStudentIdAndCourseId(student.getId(), id)
                                .filter(e -> "active".equals(e.getStatus()))
                                .orElseThrow(() -> new ResourceNotFoundException("Not enrolled"));
                enrollment.setStatus("dropped");
                enrollmentRepository.save(enrollment);
                auditService.log(student, "leave_course", "enrollment", enrollment.getId(), request);
                return ResponseEntity.ok(ApiResponse.success("Left course", null));
        }

        private String saveAvatar(MultipartFile file, Long userId) throws IOException {
                String uploadDir = "uploads/avatars/" + userId;
                Path uploadPath = Paths.get(uploadDir);
                Files.createDirectories(uploadPath);

                String rawName = file.getOriginalFilename();
                String originalName = (rawName != null && !rawName.isEmpty()) ? rawName : "avatar";
                String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
                String fileName = System.currentTimeMillis() + "_" + safeName;

                Path target = uploadPath.resolve(fileName);
                Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
                return "/uploads/avatars/" + userId + "/" + fileName;
        }

        private Map<String, Object> buildUserData(User user) {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", user.getId());
                userData.put("email", user.getEmail());
                userData.put("firstName", user.getFirstName());
                userData.put("lastName", user.getLastName());
                userData.put("fullName", user.getFullName());
                userData.put("role", user.getRole());
                userData.put("department", user.getDepartment());
                userData.put("avatar", user.getAvatar());
                return userData;
        }
}
