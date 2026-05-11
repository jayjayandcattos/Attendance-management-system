package com.attendease.dto;

import com.attendease.entity.AuditLog;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLogDto {
    private Long id;
    private String action;
    private String entityType;
    private Long entityId;
    private Map<String, Object> oldValues;
    private Map<String, Object> newValues;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime createdAt;
    
    // User information
    private Long userId;
    private String userName;
    private String userEmail;
    private String userRole;
    
    // Computed field for details JSON
    private String details;
    
    public static AuditLogDto fromEntity(AuditLog log) {
        AuditLogDtoBuilder builder = AuditLogDto.builder()
                .id(log.getId())
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .oldValues(log.getOldValues())
                .newValues(log.getNewValues())
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .createdAt(log.getCreatedAt());
        
        // Map user information if user exists
        if (log.getUser() != null) {
            builder.userId(log.getUser().getId())
                   .userName(log.getUser().getFirstName() + " " + log.getUser().getLastName())
                   .userEmail(log.getUser().getEmail())
                   .userRole(log.getUser().getRole());
        }
        
        // Create details JSON string
        if (log.getOldValues() != null || log.getNewValues() != null) {
            StringBuilder details = new StringBuilder("{\n");
            if (log.getOldValues() != null && !log.getOldValues().isEmpty()) {
                details.append("  \"oldValues\": ").append(log.getOldValues()).append(",\n");
            }
            if (log.getNewValues() != null && !log.getNewValues().isEmpty()) {
                details.append("  \"newValues\": ").append(log.getNewValues()).append("\n");
            }
            details.append("}");
            builder.details(details.toString());
        } else {
            builder.details("{}");
        }
        
        return builder.build();
    }
}
