package com.attendease.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "login_attempts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoginAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(name = "ip_address")
    private String ipAddress;

    @Builder.Default
    private Boolean success = false;

    @Builder.Default
    @Column(name = "attempted_at")
    private LocalDateTime attemptedAt = LocalDateTime.now();
}
