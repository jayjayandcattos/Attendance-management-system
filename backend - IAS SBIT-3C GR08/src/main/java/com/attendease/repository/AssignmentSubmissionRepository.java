package com.attendease.repository;

import com.attendease.entity.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"student"})
    List<AssignmentSubmission> findByMaterialId(Long materialId);
    Optional<AssignmentSubmission> findByMaterialIdAndStudentId(Long materialId, Long studentId);
    boolean existsByMaterialIdAndStudentId(Long materialId, Long studentId);
}
