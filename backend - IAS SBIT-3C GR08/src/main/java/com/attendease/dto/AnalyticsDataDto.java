package com.attendease.dto;

import com.attendease.entity.TimeGranularity;
import java.time.LocalDateTime;
import java.util.Map;

public class AnalyticsDataDto {
    private String metricName;
    private LocalDateTime timestamp;
    private Long value;
    private Double percentage;
    private TimeGranularity granularity;
    private Map<String, Object> breakdown;

    // Constructors
    public AnalyticsDataDto() {}

    public AnalyticsDataDto(String metricName, LocalDateTime timestamp, Long value) {
        this.metricName = metricName;
        this.timestamp = timestamp;
        this.value = value;
    }

    // Getters and Setters
    public String getMetricName() {
        return metricName;
    }

    public void setMetricName(String metricName) {
        this.metricName = metricName;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public Long getValue() {
        return value;
    }

    public void setValue(Long value) {
        this.value = value;
    }

    public Double getPercentage() {
        return percentage;
    }

    public void setPercentage(Double percentage) {
        this.percentage = percentage;
    }

    public TimeGranularity getGranularity() {
        return granularity;
    }

    public void setGranularity(TimeGranularity granularity) {
        this.granularity = granularity;
    }

    public Map<String, Object> getBreakdown() {
        return breakdown;
    }

    public void setBreakdown(Map<String, Object> breakdown) {
        this.breakdown = breakdown;
    }
}
