package com.attendease.service;

import com.attendease.entity.LoginAttempt;
import com.attendease.entity.SecurityEvent;
import com.attendease.entity.SecurityEventSeverity;
import com.attendease.entity.SecurityEventType;
import com.attendease.repository.LoginAttemptRepository;
import com.attendease.repository.SecurityEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LoginSecurityService {

    private final LoginAttemptRepository loginAttemptRepository;
    private final SecurityEventRepository securityEventRepository;

    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    @SuppressWarnings("null")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAttempt(String email, HttpServletRequest request, boolean success) {
        String ip = request != null ? request.getRemoteAddr() : "unknown";
        
        LoginAttempt attempt = LoginAttempt.builder()
                .email(email.toLowerCase().trim())
                .ipAddress(ip)
                .success(success)
                .attemptedAt(LocalDateTime.now())
                .build();
        
        loginAttemptRepository.save(attempt);

        if (!success) {
            long recentFailures = loginAttemptRepository.countByEmailAndSuccessAndAttemptedAtAfter(
                    email.toLowerCase().trim(), false, LocalDateTime.now().minusMinutes(LOCKOUT_MINUTES));
            
            if (recentFailures == 3) {
                createEvent(email, ip, SecurityEventSeverity.MEDIUM, "Early warning: 3 failed attempts for " + email);
            } else if (recentFailures == MAX_ATTEMPTS) {
                createEvent(email, ip, SecurityEventSeverity.HIGH, "Brute-force detection: 5 failed attempts for " + email);
            } else if (recentFailures > MAX_ATTEMPTS && recentFailures % 5 == 0) {
                createEvent(email, ip, SecurityEventSeverity.CRITICAL, "Escalated brute-force: " + recentFailures + " failed attempts for " + email);
            }
        }
    }

    private void createEvent(String email, String ip, SecurityEventSeverity severity, String desc) {
        SecurityEvent event = new SecurityEvent();
        event.setType(SecurityEventType.FAILED_LOGIN);
        event.setSeverity(severity);
        event.setDescription(desc);
        event.setIpAddress(ip);
        event.setUserEmail(email);
        event.setAcknowledged(false);
        securityEventRepository.save(event);
    }
}
