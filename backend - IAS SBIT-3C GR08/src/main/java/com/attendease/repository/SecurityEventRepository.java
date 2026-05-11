package com.attendease.repository;

import com.attendease.entity.SecurityEvent;
import com.attendease.entity.SecurityEventSeverity;
import com.attendease.entity.SecurityEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {
    
    Page<SecurityEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);
    
    Page<SecurityEvent> findByTypeAndCreatedAtBetweenOrderByCreatedAtDesc(
            SecurityEventType type, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
    
    Page<SecurityEvent> findBySeverityAndCreatedAtBetweenOrderByCreatedAtDesc(
            SecurityEventSeverity severity, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
    
    Page<SecurityEvent> findByTypeAndSeverityAndCreatedAtBetweenOrderByCreatedAtDesc(
            SecurityEventType type, SecurityEventSeverity severity, 
            LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
    
    @Query("SELECT e FROM SecurityEvent e WHERE " +
           "(:type IS NULL OR e.type = :type) AND " +
           "(:severity IS NULL OR e.severity = :severity) AND " +
           "e.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY e.createdAt DESC")
    Page<SecurityEvent> findByFilters(
            @Param("type") SecurityEventType type,
            @Param("severity") SecurityEventSeverity severity,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);
    
    List<SecurityEvent> findByIpAddressAndTypeAndCreatedAtAfter(
            String ipAddress, SecurityEventType type, LocalDateTime after);
    
    List<SecurityEvent> findByUserEmailAndTypeAndCreatedAtAfter(
            String userEmail, SecurityEventType type, LocalDateTime after);
    
    long countBySeverityAndCreatedAtAfter(SecurityEventSeverity severity, LocalDateTime after);
    
    long countByCreatedAtAfter(LocalDateTime after);
    
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT e.countryCode, COUNT(e) FROM SecurityEvent e WHERE e.createdAt > :after GROUP BY e.countryCode ORDER BY COUNT(e) DESC")
    List<Object[]> getCountryBreakdown(@Param("after") LocalDateTime after);
}
