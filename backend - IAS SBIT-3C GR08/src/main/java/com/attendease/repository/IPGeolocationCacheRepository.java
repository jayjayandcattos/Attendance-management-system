package com.attendease.repository;

import com.attendease.entity.IPGeolocationCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface IPGeolocationCacheRepository extends JpaRepository<IPGeolocationCache, Long> {
    
    Optional<IPGeolocationCache> findByIpAddressAndExpiresAtAfter(String ipAddress, LocalDateTime now);
    
    @Modifying
    @Query("DELETE FROM IPGeolocationCache g WHERE g.expiresAt < :now")
    void deleteExpiredCache(LocalDateTime now);
}
