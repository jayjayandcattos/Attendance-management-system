package com.attendease.controller;

import com.attendease.dto.ApiResponse;
import com.attendease.entity.User;
import com.attendease.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/activity")
@RequiredArgsConstructor
public class ActivityController {

    private final AuditService auditService;

    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<String>> logBatchActivities(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, List<Map<String, Object>>> payload,
            HttpServletRequest request) {
        
        List<Map<String, Object>> activities = payload.get("activities");
        
        if (activities == null || activities.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success("No activities to log"));
        }

        // Log each activity
        for (Map<String, Object> activity : activities) {
            String action = (String) activity.get("action");
            String entityType = (String) activity.get("entityType");
            Object entityIdObj = activity.get("entityId");
            Long entityId = entityIdObj != null ? 
                (entityIdObj instanceof Integer ? ((Integer) entityIdObj).longValue() : (Long) entityIdObj) 
                : null;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> details = (Map<String, Object>) activity.get("details");

            // Log the activity
            auditService.log(user, action, entityType, entityId, null, details, request);
        }

        return ResponseEntity.ok(ApiResponse.success("Activities logged successfully"));
    }

    @PostMapping("/log")
    public ResponseEntity<ApiResponse<String>> logActivity(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> activity,
            HttpServletRequest request) {
        
        String action = (String) activity.get("action");
        String entityType = (String) activity.get("entityType");
        Object entityIdObj = activity.get("entityId");
        Long entityId = entityIdObj != null ? 
            (entityIdObj instanceof Integer ? ((Integer) entityIdObj).longValue() : (Long) entityIdObj) 
            : null;
        
        @SuppressWarnings("unchecked")
        Map<String, Object> details = (Map<String, Object>) activity.get("details");

        auditService.log(user, action, entityType, entityId, null, details, request);

        return ResponseEntity.ok(ApiResponse.success("Activity logged"));
    }
}
