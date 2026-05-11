package com.attendease.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import org.hibernate.annotations.Formula;

@Entity
@Table(name = "course_materials")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourseMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Formula("(SELECT COUNT(*) FROM assignment_submissions s WHERE s.material_id = {alias}.id)")
    private Integer submissionCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(nullable = false)
    private String type; // file, link, announcement, assignment

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_size")
    private Integer fileSize;

    @Column(name = "external_link")
    private String externalLink;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Builder.Default
    @Column(name = "is_pinned")
    private Boolean isPinned = false;

    @Builder.Default
    @Column(name = "is_closed")
    private Boolean isClosed = false;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
