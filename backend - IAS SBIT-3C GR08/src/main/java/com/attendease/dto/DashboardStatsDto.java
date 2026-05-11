package com.attendease.dto;

public class DashboardStatsDto {
    private StatCard totalUsers;
    private StatCard totalCourses;
    private StatCard activeStudents;
    private StatCard todayLogins;
    private StatCard securityEvents;
    private StatCard systemHealth;

    public static class StatCard {
        private String label;
        private Long value;
        private Double trend; // Percentage change
        private String trendDirection; // UP, DOWN, STABLE
        private String icon;
        private String color;

        public StatCard() {}

        public StatCard(String label, Long value, Double trend, String trendDirection) {
            this.label = label;
            this.value = value;
            this.trend = trend;
            this.trendDirection = trendDirection;
        }

        // Getters and Setters
        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public Long getValue() {
            return value;
        }

        public void setValue(Long value) {
            this.value = value;
        }

        public Double getTrend() {
            return trend;
        }

        public void setTrend(Double trend) {
            this.trend = trend;
        }

        public String getTrendDirection() {
            return trendDirection;
        }

        public void setTrendDirection(String trendDirection) {
            this.trendDirection = trendDirection;
        }

        public String getIcon() {
            return icon;
        }

        public void setIcon(String icon) {
            this.icon = icon;
        }

        public String getColor() {
            return color;
        }

        public void setColor(String color) {
            this.color = color;
        }
    }

    // Getters and Setters
    public StatCard getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(StatCard totalUsers) {
        this.totalUsers = totalUsers;
    }

    public StatCard getTotalCourses() {
        return totalCourses;
    }

    public void setTotalCourses(StatCard totalCourses) {
        this.totalCourses = totalCourses;
    }

    public StatCard getActiveStudents() {
        return activeStudents;
    }

    public void setActiveStudents(StatCard activeStudents) {
        this.activeStudents = activeStudents;
    }

    public StatCard getTodayLogins() {
        return todayLogins;
    }

    public void setTodayLogins(StatCard todayLogins) {
        this.todayLogins = todayLogins;
    }

    public StatCard getSecurityEvents() {
        return securityEvents;
    }

    public void setSecurityEvents(StatCard securityEvents) {
        this.securityEvents = securityEvents;
    }

    public StatCard getSystemHealth() {
        return systemHealth;
    }

    public void setSystemHealth(StatCard systemHealth) {
        this.systemHealth = systemHealth;
    }
}
