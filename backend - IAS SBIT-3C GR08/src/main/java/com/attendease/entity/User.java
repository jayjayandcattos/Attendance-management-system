package com.attendease.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    @JsonIgnore
    private String password;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(nullable = false)
    private String role; // admin, teacher, student

    private String avatar;

    @Column(name = "student_id")
    private String studentId;

    private String department;

    @Column(name = "phone_number")
    private String phoneNumber;

    private String bio;

    private String gender;

    private String birthday;

    @Column(nullable = false)
    private String status; // active, inactive, pending

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    @Builder.Default
    @Column(name = "mfa_enabled")
    private Boolean mfaEnabled = false;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "verification_code")
    private String verificationCode;

    @Column(name = "email_code_expiry")
    private LocalDateTime emailCodeExpiry;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "current_session_id")
    private String currentSessionId;

    @Builder.Default
    @Column(name = "attendance_late_enabled")
    private Boolean attendanceLateEnabled = true;

    @Builder.Default
    @Column(name = "attendance_late_minutes")
    private Integer attendanceLateMinutes = 15;

    public String getFullName() {
        return firstName + " " + lastName;
    }
}
