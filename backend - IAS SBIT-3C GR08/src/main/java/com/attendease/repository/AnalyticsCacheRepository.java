package com.attendease.repository;

import com.attendease.entity.AnalyticsCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface AnalyticsCacheRepository extends JpaRepository<AnalyticsCache, Long> {
    
    Optional<AnalyticsCache> findByCacheKeyAndExpiresAtAfter(String cacheKey, LocalDateTime now);
    
    @Modifying
    @Query("DELETE FROM AnalyticsCache a WHERE a.expiresAt < :now")
    void deleteExpiredCache(LocalDateTime now);
}
