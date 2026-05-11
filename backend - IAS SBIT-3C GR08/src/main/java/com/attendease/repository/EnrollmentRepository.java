package com.attendease.repository;

import com.attendease.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    List<Enrollment> findByCourseIdAndStatus(Long courseId, String status);
    List<Enrollment> findByStudentIdAndStatus(Long studentId, String status);
    Optional<Enrollment> findByStudentIdAndCourseId(Long studentId, Long courseId);
    boolean existsByStudentIdAndCourseId(Long studentId, Long courseId);
    long countByCourseIdAndStatus(Long courseId, String status);
}
