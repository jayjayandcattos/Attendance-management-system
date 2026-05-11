package com.attendease.repository;

import com.attendease.entity.DashboardWidgetPreference;
import com.attendease.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DashboardWidgetPreferenceRepository extends JpaRepository<DashboardWidgetPreference, Long> {
    
    List<DashboardWidgetPreference> findByUserOrderByPositionAsc(User user);
    
    Optional<DashboardWidgetPreference> findByUserAndWidgetId(User user, String widgetId);
    
    void deleteByUserAndWidgetId(User user, String widgetId);
}
