package com.attendease.repository;

import com.attendease.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(String role);
    List<User> findByStatus(String status);
    List<User> findByRoleAndStatus(String role, String status);
    long countByRole(String role);
    long countByStatus(String status);
    long countByCreatedAtBefore(LocalDateTime before);
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
