package com.attendease.service;

import com.attendease.entity.AuditLog;
import com.attendease.entity.User;
import com.attendease.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @org.springframework.transaction.annotation.Transactional
    public void log(User user, String action, String entityType, Long entityId,
                    Map<String, Object> oldValues, Map<String, Object> newValues,
                    HttpServletRequest request) {
        AuditLog log = AuditLog.builder()
                .user(user)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .oldValues(oldValues)
                .newValues(newValues)
                .ipAddress(getClientIp(request))
                .userAgent(request != null ? request.getHeader("User-Agent") : null)
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(java.util.Objects.requireNonNull(log));
        System.out.println("[AUDIT LOG] Action: " + action + " | User: " + (user != null ? user.getEmail() : "System") + " | IP: " + log.getIpAddress());
    }

    public void log(User user, String action, String entityType, Long entityId,
                    HttpServletRequest request) {
        log(user, action, entityType, entityId, null, null, request);
    }

    public Page<AuditLog> getAll(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<AuditLog> searchAll(String search, Pageable pageable) {
        return auditLogRepository.searchAll(search, pageable);
    }

    public Page<AuditLog> getByUserId(Long userId, Pageable pageable) {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    private String getClientIp(HttpServletRequest request) {
        if (request == null) return null;
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String ip = request.getRemoteAddr();
        // Convert IPv6 localhost to IPv4 for better readability
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            return "127.0.0.1";
        }
        return ip;
    }
}
