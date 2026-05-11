package com.attendease.repository;

import com.attendease.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    List<Course> findByTeacherIdAndStatusNot(Long teacherId, String status);
    Optional<Course> findByJoinCode(String joinCode);
    boolean existsByJoinCode(String joinCode);
    long countByStatus(String status);
    long countByCreatedAtBefore(java.time.LocalDateTime date);
    List<Course> findByStatus(String status);
    List<Course> findByStatusNot(String status);
}
