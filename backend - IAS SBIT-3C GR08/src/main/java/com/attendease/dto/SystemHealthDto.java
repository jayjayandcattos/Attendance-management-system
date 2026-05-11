package com.attendease.dto;

import java.util.List;

public class SystemHealthDto {
    private CpuMetric cpu;
    private MemoryMetric memory;
    private DiskMetric disk;
    private ApplicationMetric application;
    private List<HealthHistoryPoint> history;

    public static class CpuMetric {
        private Double usage;
        private String status; // HEALTHY, WARNING, CRITICAL
        private Integer cores;

        public Double getUsage() {
            return usage;
        }

        public void setUsage(Double usage) {
            this.usage = usage;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public Integer getCores() {
            return cores;
        }

        public void setCores(Integer cores) {
            this.cores = cores;
        }
    }

    public static class MemoryMetric {
        private Long used;
        private Long total;
        private Double percentage;
        private String status;

        public Long getUsed() {
            return used;
        }

        public void setUsed(Long used) {
            this.used = used;
        }

        public Long getTotal() {
            return total;
        }

        public void setTotal(Long total) {
            this.total = total;
        }

        public Double getPercentage() {
            return percentage;
        }

        public void setPercentage(Double percentage) {
            this.percentage = percentage;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }

    public static class DiskMetric {
        private Long used;
        private Long total;
        private Double percentage;
        private String status;

        public Long getUsed() {
            return used;
        }

        public void setUsed(Long used) {
            this.used = used;
        }

        public Long getTotal() {
            return total;
        }

        public void setTotal(Long total) {
            this.total = total;
        }

        public Double getPercentage() {
            return percentage;
        }

        public void setPercentage(Double percentage) {
            this.percentage = percentage;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }

    public static class ApplicationMetric {
        private Integer activeSessions;
        private Integer dbConnections;
        private Integer maxDbConnections;
        private Double avgResponseTime;

        public Integer getActiveSessions() {
            return activeSessions;
        }

        public void setActiveSessions(Integer activeSessions) {
            this.activeSessions = activeSessions;
        }

        public Integer getDbConnections() {
            return dbConnections;
        }

        public void setDbConnections(Integer dbConnections) {
            this.dbConnections = dbConnections;
        }

        public Integer getMaxDbConnections() {
            return maxDbConnections;
        }

        public void setMaxDbConnections(Integer maxDbConnections) {
            this.maxDbConnections = maxDbConnections;
        }

        public Double getAvgResponseTime() {
            return avgResponseTime;
        }

        public void setAvgResponseTime(Double avgResponseTime) {
            this.avgResponseTime = avgResponseTime;
        }
    }

    public static class HealthHistoryPoint {
        private String timestamp;
        private Double cpuUsage;
        private Double memoryUsage;
        private Double diskUsage;

        public String getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(String timestamp) {
            this.timestamp = timestamp;
        }

        public Double getCpuUsage() {
            return cpuUsage;
        }

        public void setCpuUsage(Double cpuUsage) {
            this.cpuUsage = cpuUsage;
        }

        public Double getMemoryUsage() {
            return memoryUsage;
        }

        public void setMemoryUsage(Double memoryUsage) {
            this.memoryUsage = memoryUsage;
        }

        public Double getDiskUsage() {
            return diskUsage;
        }

        public void setDiskUsage(Double diskUsage) {
            this.diskUsage = diskUsage;
        }
    }

    // Getters and Setters
    public CpuMetric getCpu() {
        return cpu;
    }

    public void setCpu(CpuMetric cpu) {
        this.cpu = cpu;
    }

    public MemoryMetric getMemory() {
        return memory;
    }

    public void setMemory(MemoryMetric memory) {
        this.memory = memory;
    }

    public DiskMetric getDisk() {
        return disk;
    }

    public void setDisk(DiskMetric disk) {
        this.disk = disk;
    }

    public ApplicationMetric getApplication() {
        return application;
    }

    public void setApplication(ApplicationMetric application) {
        this.application = application;
    }

    public List<HealthHistoryPoint> getHistory() {
        return history;
    }

    public void setHistory(List<HealthHistoryPoint> history) {
        this.history = history;
    }
}
