package com.attendease.repository;

import com.attendease.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"student"})
    List<AttendanceRecord> findBySessionId(Long sessionId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"session"})
    List<AttendanceRecord> findByStudentIdAndCourseId(Long studentId, Long courseId);
    Optional<AttendanceRecord> findBySessionIdAndStudentId(Long sessionId, Long studentId);
    boolean existsBySessionIdAndStudentId(Long sessionId, Long studentId);
    long countByStudentIdAndCourseIdAndStatus(Long studentId, Long courseId, String status);
    long countByStudentIdAndCourseId(Long studentId, Long courseId);

    @Query("SELECT ar.status, COUNT(ar) FROM AttendanceRecord ar WHERE ar.course.id = :courseId GROUP BY ar.status")
    List<Object[]> countByStatusGroupedByCourse(Long courseId);
}
