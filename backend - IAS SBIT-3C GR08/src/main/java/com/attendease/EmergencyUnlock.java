package com.attendease;

import com.attendease.repository.LoginAttemptRepository;
import com.attendease.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Emergency unlock utility - ONLY enabled when explicitly configured.
 * This component resets passwords and unlocks accounts for emergency recovery.
 * NEVER enable this in production without explicit need.
 */
@Component
@Profile("emergency-unlock")
public class EmergencyUnlock implements CommandLineRunner {

    private final UserRepository userRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Value("${app.emergency.admin-password:}")
    private String adminPassword;

    @Value("${app.emergency.teacher-password:}")
    private String teacherPassword;

    @Value("${app.emergency.student-password:}")
    private String studentPassword;

    public EmergencyUnlock(UserRepository userRepository, LoginAttemptRepository loginAttemptRepository, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.loginAttemptRepository = loginAttemptRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        System.err.println("WARNING: Emergency unlock profile is active. This should only be used for recovery.");
        
        // Validate that custom passwords are configured (reject hardcoded defaults)
        if (adminPassword == null || adminPassword.isBlank() ||
            teacherPassword == null || teacherPassword.isBlank() ||
            studentPassword == null || studentPassword.isBlank()) {
            throw new IllegalStateException(
                "Emergency unlock requires custom passwords via app.emergency.* properties. " +
                "Do not use default passwords. Set app.emergency.admin-password, " +
                "app.emergency.teacher-password, and app.emergency.student-password."
            );
        }

        // Validate password strength
        validateEmergencyPassword(adminPassword);
        validateEmergencyPassword(teacherPassword);
        validateEmergencyPassword(studentPassword);
        
        // 1. Clear all failed attempts
        loginAttemptRepository.deleteAll();
        
        // 2. Reset sessions and passwords
        userRepository.findAll().forEach(user -> {
            user.setStatus("active");
            user.setCurrentSessionId(null);
            
            if ("admin".equals(user.getRole())) {
                user.setPassword(passwordEncoder.encode(adminPassword));
            } else if ("teacher".equals(user.getRole())) {
                user.setPassword(passwordEncoder.encode(teacherPassword));
            } else if ("student".equals(user.getRole())) {
                user.setPassword(passwordEncoder.encode(studentPassword));
            }
            
            userRepository.save(user);
        });
        
        System.err.println("EMERGENCY: Accounts unlocked with configured passwords. Remove 'emergency-unlock' profile immediately.");
    }

    private void validateEmergencyPassword(String password) {
        if (password.length() < 12) {
            throw new IllegalArgumentException("Emergency passwords must be at least 12 characters long");
        }
    }
}
