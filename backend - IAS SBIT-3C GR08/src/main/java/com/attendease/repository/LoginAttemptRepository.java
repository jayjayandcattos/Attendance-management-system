package com.attendease.repository;

import com.attendease.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {
    long countByEmailAndSuccessAndAttemptedAtAfter(String email, Boolean success, LocalDateTime after);
    void deleteByEmail(String email);
    List<LoginAttempt> findByEmailOrderByAttemptedAtDesc(String email);
    long countBySuccessAndAttemptedAtAfter(Boolean success, LocalDateTime after);
    long countBySuccessAndAttemptedAtBetween(Boolean success, LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT COUNT(DISTINCT l.email) FROM LoginAttempt l WHERE l.success = :success AND l.attemptedAt > :after")
    long countDistinctEmailBySuccessAndAttemptedAtAfter(Boolean success, LocalDateTime after);
    
    @Query("SELECT COUNT(DISTINCT l.email) FROM LoginAttempt l WHERE l.success = :success AND l.attemptedAt BETWEEN :start AND :end")
    long countDistinctEmailBySuccessAndAttemptedAtBetween(Boolean success, LocalDateTime start, LocalDateTime end);
}
