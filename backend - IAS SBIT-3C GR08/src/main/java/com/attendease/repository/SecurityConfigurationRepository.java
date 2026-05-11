package com.attendease.repository;

import com.attendease.entity.SecurityConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SecurityConfigurationRepository extends JpaRepository<SecurityConfiguration, Long> {
    
    Optional<SecurityConfiguration> findByConfigKey(String configKey);
}
