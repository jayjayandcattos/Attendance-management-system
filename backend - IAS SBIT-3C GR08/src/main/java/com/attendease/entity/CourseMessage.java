package com.attendease.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "course_messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourseMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false)
    private String content;

    @Builder.Default
    @Column(name = "is_pinned")
    private Boolean isPinned = false;

    @Builder.Default
    @Column(name = "deleted_for_users")
    private String deletedForUsers = "";

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "attachment_path")
    private String attachmentPath;

    @Column(name = "attachment_name")
    private String attachmentName;

    @Column(name = "attachment_type")
    private String attachmentType;

    @Column(name = "attachment_size")
    private Long attachmentSize;
}
