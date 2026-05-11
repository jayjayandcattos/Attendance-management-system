package com.attendease.repository;

import com.attendease.entity.UserMfaSecret;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserMfaSecretRepository extends JpaRepository<UserMfaSecret, Long> {
    Optional<UserMfaSecret> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
