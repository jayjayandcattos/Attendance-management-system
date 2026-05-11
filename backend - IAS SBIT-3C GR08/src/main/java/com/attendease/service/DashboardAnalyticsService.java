package com.attendease.service;

import com.attendease.dto.AnalyticsDataDto;
import com.attendease.dto.DashboardStatsDto;
import com.attendease.dto.SystemHealthDto;
import com.attendease.entity.LoginAttempt;
import com.attendease.entity.TimeGranularity;
import com.attendease.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.nio.file.FileStore;
import java.nio.file.FileSystems;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardAnalyticsService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final SecurityEventRepository securityEventRepository;

    public DashboardAnalyticsService(
            UserRepository userRepository,
            CourseRepository courseRepository,
            LoginAttemptRepository loginAttemptRepository,
            SecurityEventRepository securityEventRepository) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.loginAttemptRepository = loginAttemptRepository;
        this.securityEventRepository = securityEventRepository;
    }

    public DashboardStatsDto getDashboardStats() {
        DashboardStatsDto stats = new DashboardStatsDto();
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime yesterday = now.minusDays(1);
        LocalDateTime lastWeek = now.minusDays(7);
        LocalDateTime today = now.toLocalDate().atStartOfDay();

        // Total Users
        long totalUsers = userRepository.count();
        long usersLastWeek = userRepository.countByCreatedAtBefore(lastWeek);
        double userTrend = calculateTrend(totalUsers, usersLastWeek);
        
        DashboardStatsDto.StatCard totalUsersCard = new DashboardStatsDto.StatCard();
        totalUsersCard.setLabel("Total Users");
        totalUsersCard.setValue(totalUsers);
        totalUsersCard.setTrend(userTrend);
        totalUsersCard.setTrendDirection(getTrendDirection(userTrend));
        totalUsersCard.setIcon("users");
        totalUsersCard.setColor("blue");
        stats.setTotalUsers(totalUsersCard);

        // Total Courses
        long totalCourses = courseRepository.count();
        long coursesLastWeek = courseRepository.countByCreatedAtBefore(lastWeek);
        double courseTrend = calculateTrend(totalCourses, coursesLastWeek);
        
        DashboardStatsDto.StatCard totalCoursesCard = new DashboardStatsDto.StatCard();
        totalCoursesCard.setLabel("Total Courses");
        totalCoursesCard.setValue(totalCourses);
        totalCoursesCard.setTrend(courseTrend);
        totalCoursesCard.setTrendDirection(getTrendDirection(courseTrend));
        totalCoursesCard.setIcon("book");
        totalCoursesCard.setColor("green");
        stats.setTotalCourses(totalCoursesCard);

        // Active Students (students who logged in within last 7 days)
        long activeStudents = loginAttemptRepository.countDistinctEmailBySuccessAndAttemptedAtAfter(true, lastWeek);
        long activeStudentsYesterday = loginAttemptRepository.countDistinctEmailBySuccessAndAttemptedAtBetween(
            true, lastWeek.minusDays(1), yesterday);
        double activeStudentsTrend = calculateTrend(activeStudents, activeStudentsYesterday);
        
        DashboardStatsDto.StatCard activeStudentsCard = new DashboardStatsDto.StatCard();
        activeStudentsCard.setLabel("Active Students (7d)");
        activeStudentsCard.setValue(activeStudents);
        activeStudentsCard.setTrend(activeStudentsTrend);
        activeStudentsCard.setTrendDirection(getTrendDirection(activeStudentsTrend));
        activeStudentsCard.setIcon("user-check");
        activeStudentsCard.setColor("purple");
        stats.setActiveStudents(activeStudentsCard);

        // Today's Logins
        long todayLogins = loginAttemptRepository.countBySuccessAndAttemptedAtAfter(true, today);
        long yesterdayLogins = loginAttemptRepository.countBySuccessAndAttemptedAtBetween(
            true, yesterday.toLocalDate().atStartOfDay(), today);
        double loginTrend = calculateTrend(todayLogins, yesterdayLogins);
        
        DashboardStatsDto.StatCard todayLoginsCard = new DashboardStatsDto.StatCard();
        todayLoginsCard.setLabel("Today's Logins");
        todayLoginsCard.setValue(todayLogins);
        todayLoginsCard.setTrend(loginTrend);
        todayLoginsCard.setTrendDirection(getTrendDirection(loginTrend));
        todayLoginsCard.setIcon("login");
        todayLoginsCard.setColor("indigo");
        stats.setTodayLogins(todayLoginsCard);

        // Security Events (last 24 hours)
        long securityEvents = securityEventRepository.countByCreatedAtAfter(yesterday);
        long securityEventsYesterday = securityEventRepository.countByCreatedAtBetween(
            yesterday.minusDays(1), yesterday);
        double securityTrend = calculateTrend(securityEvents, securityEventsYesterday);
        
        DashboardStatsDto.StatCard securityEventsCard = new DashboardStatsDto.StatCard();
        securityEventsCard.setLabel("Security Events (24h)");
        securityEventsCard.setValue(securityEvents);
        securityEventsCard.setTrend(securityTrend);
        securityEventsCard.setTrendDirection(getTrendDirection(securityTrend));
        securityEventsCard.setIcon("shield");
        securityEventsCard.setColor(securityEvents > 0 ? "red" : "green");
        stats.setSecurityEvents(securityEventsCard);

        // System Health (simplified)
        SystemHealthDto health = getSystemHealth();
        String healthStatus = determineOverallHealth(health);
        
        DashboardStatsDto.StatCard systemHealthCard = new DashboardStatsDto.StatCard();
        systemHealthCard.setLabel("System Health");
        systemHealthCard.setValue(healthStatus.equals("HEALTHY") ? 100L : 
                                  healthStatus.equals("WARNING") ? 75L : 50L);
        systemHealthCard.setTrend(0.0);
        systemHealthCard.setTrendDirection("STABLE");
        systemHealthCard.setIcon("activity");
        systemHealthCard.setColor(healthStatus.equals("HEALTHY") ? "green" : 
                                  healthStatus.equals("WARNING") ? "yellow" : "red");
        stats.setSystemHealth(systemHealthCard);

        return stats;
    }

    public List<AnalyticsDataDto> getUserGrowthData(LocalDateTime startDate, LocalDateTime endDate) {
        TimeGranularity granularity = determineGranularity(startDate, endDate);
        List<AnalyticsDataDto> data = new ArrayList<>();

        LocalDateTime current = startDate;
        while (current.isBefore(endDate)) {
            LocalDateTime next = getNextInterval(current, granularity);
            LocalDateTime ceiling = next.isAfter(endDate) ? endDate : next;
            long count = userRepository.countByCreatedAtBefore(ceiling);
            
            AnalyticsDataDto point = new AnalyticsDataDto();
            point.setMetricName("user_growth");
            point.setTimestamp(current);
            point.setValue(count);
            point.setGranularity(granularity);
            data.add(point);
            
            current = next;
        }

        // Ensure we have a final point at exactly endDate to show current status
        if (data.isEmpty() || !data.get(data.size() - 1).getTimestamp().isEqual(endDate)) {
            AnalyticsDataDto finalPoint = new AnalyticsDataDto();
            finalPoint.setMetricName("user_growth");
            finalPoint.setTimestamp(endDate);
            finalPoint.setValue(userRepository.count());
            finalPoint.setGranularity(granularity);
            data.add(finalPoint);
        }

        return data;
    }

    public List<AnalyticsDataDto> getLoginActivityData(LocalDateTime startDate, LocalDateTime endDate) {
        TimeGranularity granularity = determineGranularity(startDate, endDate);
        List<AnalyticsDataDto> data = new ArrayList<>();

        LocalDateTime current = startDate;
        while (current.isBefore(endDate)) {
            LocalDateTime next = getNextInterval(current, granularity);
            LocalDateTime ceiling = next.isAfter(endDate) ? endDate : next;
            long count = loginAttemptRepository.countBySuccessAndAttemptedAtBetween(true, current, ceiling);
            
            AnalyticsDataDto point = new AnalyticsDataDto();
            point.setMetricName("login_activity");
            point.setTimestamp(current);
            point.setValue(count);
            point.setGranularity(granularity);
            data.add(point);
            
            current = next;
        }

        // Add today's activity as the last point
        if (data.isEmpty() || !data.get(data.size() - 1).getTimestamp().isEqual(endDate)) {
            LocalDateTime todayStart = endDate.toLocalDate().atStartOfDay();
            long count = loginAttemptRepository.countBySuccessAndAttemptedAtBetween(true, todayStart, endDate);
            
            AnalyticsDataDto finalPoint = new AnalyticsDataDto();
            finalPoint.setMetricName("login_activity");
            finalPoint.setTimestamp(endDate);
            finalPoint.setValue(count);
            finalPoint.setGranularity(granularity);
            data.add(finalPoint);
        }

        return data;
    }

    public Map<String, Long> getUsersByRole() {
        Map<String, Long> roleDistribution = new HashMap<>();
        roleDistribution.put("STUDENT", userRepository.countByRole("student"));
        roleDistribution.put("TEACHER", userRepository.countByRole("teacher"));
        roleDistribution.put("ADMIN", userRepository.countByRole("admin"));
        return roleDistribution;
    }

    public Map<String, Long> getCoursesByStatus() {
        Map<String, Long> statusDistribution = new HashMap<>();
        statusDistribution.put("ACTIVE", courseRepository.countByStatus("active"));
        statusDistribution.put("DRAFT", courseRepository.countByStatus("draft"));
        statusDistribution.put("ARCHIVED", courseRepository.countByStatus("archived"));
        return statusDistribution;
    }

    public SystemHealthDto getSystemHealth() {
        SystemHealthDto health = new SystemHealthDto();

        // CPU Metrics
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        SystemHealthDto.CpuMetric cpu = new SystemHealthDto.CpuMetric();
        double cpuLoad = osBean.getSystemLoadAverage();
        int processors = osBean.getAvailableProcessors();
        double cpuUsage = (cpuLoad / processors) * 100;
        
        cpu.setUsage(Math.max(0, Math.min(100, cpuUsage)));
        cpu.setCores(processors);
        cpu.setStatus(cpuUsage > 95 ? "CRITICAL" : cpuUsage > 80 ? "WARNING" : "HEALTHY");
        health.setCpu(cpu);

        // Memory Metrics
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        SystemHealthDto.MemoryMetric memory = new SystemHealthDto.MemoryMetric();
        long usedMemory = memoryBean.getHeapMemoryUsage().getUsed();
        long maxMemory = memoryBean.getHeapMemoryUsage().getMax();
        double memoryPercentage = (double) usedMemory / maxMemory * 100;
        
        memory.setUsed(usedMemory / (1024 * 1024)); // Convert to MB
        memory.setTotal(maxMemory / (1024 * 1024));
        memory.setPercentage(memoryPercentage);
        memory.setStatus(memoryPercentage > 95 ? "CRITICAL" : memoryPercentage > 85 ? "WARNING" : "HEALTHY");
        health.setMemory(memory);

        // Disk Metrics
        try {
            FileStore store = FileSystems.getDefault().getFileStores().iterator().next();
            SystemHealthDto.DiskMetric disk = new SystemHealthDto.DiskMetric();
            long totalSpace = store.getTotalSpace();
            long usableSpace = store.getUsableSpace();
            long usedSpace = totalSpace - usableSpace;
            double diskPercentage = (double) usedSpace / totalSpace * 100;
            
            disk.setUsed(usedSpace / (1024 * 1024 * 1024)); // Convert to GB
            disk.setTotal(totalSpace / (1024 * 1024 * 1024));
            disk.setPercentage(diskPercentage);
            disk.setStatus(diskPercentage > 90 ? "CRITICAL" : diskPercentage > 80 ? "WARNING" : "HEALTHY");
            health.setDisk(disk);
        } catch (Exception e) {
            // Fallback if disk metrics unavailable
            SystemHealthDto.DiskMetric disk = new SystemHealthDto.DiskMetric();
            disk.setStatus("UNKNOWN");
            health.setDisk(disk);
        }

        // Application Metrics
        SystemHealthDto.ApplicationMetric app = new SystemHealthDto.ApplicationMetric();
        app.setActiveSessions(0); // Would need session tracking
        app.setDbConnections(10); // Would need actual connection pool stats
        app.setMaxDbConnections(20);
        app.setAvgResponseTime(150.0); // Would need actual metrics
        health.setApplication(app);

        // History (last 24 hours, hourly)
        List<SystemHealthDto.HealthHistoryPoint> history = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        
        for (int i = 24; i >= 0; i--) {
            SystemHealthDto.HealthHistoryPoint point = new SystemHealthDto.HealthHistoryPoint();
            LocalDateTime time = now.minusHours(i);
            point.setTimestamp(time.format(formatter));
            // Simulate historical data (in real implementation, would fetch from metrics store)
            point.setCpuUsage(cpuUsage + (Math.random() * 10 - 5));
            point.setMemoryUsage(memoryPercentage + (Math.random() * 5 - 2.5));
            point.setDiskUsage(health.getDisk().getPercentage());
            history.add(point);
        }
        health.setHistory(history);

        return health;
    }

    private double calculateTrend(long current, long previous) {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return ((double) (current - previous) / previous) * 100;
    }

    private String getTrendDirection(double trend) {
        if (Math.abs(trend) < 1.0) return "STABLE";
        return trend > 0 ? "UP" : "DOWN";
    }

    private String determineOverallHealth(SystemHealthDto health) {
        if (health.getCpu().getStatus().equals("CRITICAL") || 
            health.getMemory().getStatus().equals("CRITICAL") ||
            health.getDisk().getStatus().equals("CRITICAL")) {
            return "CRITICAL";
        }
        if (health.getCpu().getStatus().equals("WARNING") || 
            health.getMemory().getStatus().equals("WARNING") ||
            health.getDisk().getStatus().equals("WARNING")) {
            return "WARNING";
        }
        return "HEALTHY";
    }

    private TimeGranularity determineGranularity(LocalDateTime start, LocalDateTime end) {
        long hours = ChronoUnit.HOURS.between(start, end);
        if (hours <= 24) return TimeGranularity.HOURLY;
        if (hours <= 720) return TimeGranularity.DAILY; // 30 days
        if (hours <= 2160) return TimeGranularity.WEEKLY; // 90 days
        return TimeGranularity.MONTHLY;
    }

    private LocalDateTime getNextInterval(LocalDateTime current, TimeGranularity granularity) {
        return switch (granularity) {
            case HOURLY -> current.plusHours(1);
            case DAILY -> current.plusDays(1);
            case WEEKLY -> current.plusWeeks(1);
            case MONTHLY -> current.plusMonths(1);
        };
    }

    public List<Map<String, Object>> getRecentLoginIPs() {
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        // This is a simplified approach. In a real app, we might use a custom query for performance.
        List<LoginAttempt> recentAttempts = loginAttemptRepository.findAll();
        
        return recentAttempts.stream()
            .filter(a -> a.getAttemptedAt().isAfter(weekAgo))
            .filter(a -> a.getIpAddress() != null)
            .collect(Collectors.groupingBy(LoginAttempt::getIpAddress))
            .entrySet().stream()
            .map(entry -> {
                Map<String, Object> map = new HashMap<>();
                map.put("ipAddress", entry.getKey());
                map.put("lastSeen", entry.getValue().stream()
                    .map(LoginAttempt::getAttemptedAt)
                    .max(LocalDateTime::compareTo)
                    .orElse(null));
                map.put("totalAttempts", (long) entry.getValue().size());
                map.put("failures", entry.getValue().stream().filter(a -> !a.getSuccess()).count());
                return map;
            })
            .sorted((a, b) -> ((LocalDateTime) b.get("lastSeen")).compareTo((LocalDateTime) a.get("lastSeen")))
            .limit(20)
            .collect(Collectors.toList());
    }
}
