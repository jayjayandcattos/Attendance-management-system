package com.attendease.repository;

import com.attendease.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByCourseIdOrderByCreatedAtDesc(Long courseId);

    @Query("SELECT c FROM Comment c JOIN FETCH c.user WHERE c.material.id = :materialId ORDER BY c.createdAt ASC")
    List<Comment> findByMaterialIdWithUser(Long materialId);

    List<Comment> findByMaterialIdOrderByCreatedAtAsc(Long materialId);
}
