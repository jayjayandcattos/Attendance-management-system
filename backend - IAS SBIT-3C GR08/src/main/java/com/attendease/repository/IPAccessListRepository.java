package com.attendease.repository;

import com.attendease.entity.IPAccessList;
import com.attendease.entity.IPAccessType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IPAccessListRepository extends JpaRepository<IPAccessList, Long> {
    
    List<IPAccessList> findByType(IPAccessType type);
    
    Optional<IPAccessList> findByIpAddress(String ipAddress);
    
    @Query("SELECT i FROM IPAccessList i WHERE i.type = :type AND " +
           "(i.expiresAt IS NULL OR i.expiresAt > :now)")
    List<IPAccessList> findActiveByType(IPAccessType type, LocalDateTime now);
    
    void deleteByIpAddress(String ipAddress);
    
    boolean existsByIpAddress(String ipAddress);
}
