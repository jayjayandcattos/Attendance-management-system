package com.attendease.repository;

import com.attendease.entity.CourseMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseMessageRepository extends JpaRepository<CourseMessage, Long> {

    @Query("SELECT cm FROM CourseMessage cm JOIN FETCH cm.sender WHERE cm.course.id = :courseId ORDER BY cm.createdAt ASC")
    List<CourseMessage> findByCourseIdWithSender(Long courseId);

    List<CourseMessage> findByCourseIdOrderByCreatedAtAsc(Long courseId);

    List<CourseMessage> findByCourseIdAndIsPinnedOrderByCreatedAtDesc(Long courseId, Boolean isPinned);
}
