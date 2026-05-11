package com.attendease.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AttendanceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(name = "session_title")
    private String sessionTitle;

    @Column(name = "attendance_code", nullable = false)
    private String attendanceCode;

    @Column(name = "qr_code_data")
    private String qrCodeData;

    @Builder.Default
    @Column(name = "duration_minutes")
    private Integer durationMinutes = 10;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Builder.Default
    private String status = "pending";

    @Builder.Default
    @Column(name = "allow_late")
    private Boolean allowLate = true;

    @Builder.Default
    @Column(name = "late_minutes")
    private Integer lateMinutes = 5;

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
