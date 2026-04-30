package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }

    @GetMapping("/sprint")
    public ResponseEntity<Map<String, Object>> sprint() {
        return ResponseEntity.ok(dashboardService.getSprintProgress());
    }

    @GetMapping("/time-comparison")
    public ResponseEntity<List<Map<String, Object>>> timeComparison() {
        return ResponseEntity.ok(dashboardService.getTimeComparison());
    }

    @GetMapping("/team-velocity")
    public ResponseEntity<List<Map<String, Object>>> teamVelocity() {
        return ResponseEntity.ok(dashboardService.getTeamVelocity());
    }

    @GetMapping("/personal-work")
    public ResponseEntity<List<Map<String, Object>>> personalWork() {
        return ResponseEntity.ok(dashboardService.getPersonalWork());
    }

    @GetMapping("/status-distribution")
    public ResponseEntity<List<Map<String, Object>>> statusDistribution() {
        return ResponseEntity.ok(dashboardService.getDistribucionEstatus());
    }

    @GetMapping("/weekly-hours")
    public ResponseEntity<List<Map<String, Object>>> weeklyHours(
            @RequestParam(defaultValue = "week") String periodo) {
        return ResponseEntity.ok(dashboardService.getHoras(periodo));
    }

    @GetMapping("/contributions")
    public ResponseEntity<List<Map<String, Object>>> contributions() {
        return ResponseEntity.ok(dashboardService.getContribuciones());
    }
}
