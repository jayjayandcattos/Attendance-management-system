package com.attendease.repository;

import com.attendease.entity.CourseMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseMaterialRepository extends JpaRepository<CourseMaterial, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"teacher"})
    List<CourseMaterial> findByCourseIdOrderByIsPinnedDescCreatedAtDesc(Long courseId);
    List<CourseMaterial> findByCourseIdAndType(Long courseId, String type);
    long countByCourseId(Long courseId);
}
