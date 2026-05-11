package com.attendease.repository;

import com.attendease.entity.AttendanceSession;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {
    List<AttendanceSession> findByCourseId(Long courseId);
    List<AttendanceSession> findByCourseIdAndStatus(Long courseId, String status);
    @EntityGraph(attributePaths = {"course"})
    List<AttendanceSession> findByTeacherIdOrderByStartTimeDesc(Long teacherId);

    List<AttendanceSession> findByTeacherId(Long teacherId);
    Optional<AttendanceSession> findByAttendanceCodeAndStatus(String code, String status);
    boolean existsByCourseIdAndStatus(Long courseId, String status);
}
