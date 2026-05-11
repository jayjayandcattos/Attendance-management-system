package com.attendease.repository;

import com.attendease.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    Page<AuditLog> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);
    Page<AuditLog> findByEntityTypeOrderByCreatedAtDesc(String entityType, Pageable pageable);

    @Query("SELECT l FROM AuditLog l WHERE l.action IN ('login', 'logout') AND l.createdAt >= :start AND l.createdAt <= :end ORDER BY l.createdAt DESC")
    java.util.List<AuditLog> findLoginLogoutBetween(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("""
            SELECT l
            FROM AuditLog l
            LEFT JOIN l.user u
            WHERE (:search IS NULL OR :search = ''
                OR lower(l.action) LIKE lower(concat('%', :search, '%'))
                OR lower(l.entityType) LIKE lower(concat('%', :search, '%'))
                OR lower(l.ipAddress) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(u.email, '')) LIKE lower(concat('%', :search, '%'))
                OR lower(concat(coalesce(u.firstName, ''), ' ', coalesce(u.lastName, ''))) LIKE lower(concat('%', :search, '%')))
            ORDER BY l.createdAt DESC
            """)
    Page<AuditLog> searchAll(@Param("search") String search, Pageable pageable);
}
