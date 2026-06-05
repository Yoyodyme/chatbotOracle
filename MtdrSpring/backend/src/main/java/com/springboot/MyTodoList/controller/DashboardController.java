package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.service.DashboardService;
import com.springboot.MyTodoList.service.DeepSeekService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private DeepSeekService deepSeekService;

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

    @GetMapping("/kpi-por-sprint")
    public ResponseEntity<List<Map<String, Object>>> kpiPorSprint() {
        return ResponseEntity.ok(dashboardService.getKpiPorSprint());
    }

    @GetMapping("/horas-por-sprint")
    public ResponseEntity<List<Map<String, Object>>> horasPorSprint() {
        return ResponseEntity.ok(dashboardService.getHorasRealesPorSprint());
    }

    @GetMapping("/resumen-sprints")
    public ResponseEntity<List<Map<String, Object>>> resumenSprints() {
        return ResponseEntity.ok(dashboardService.getResumenSprints());
    }

    @GetMapping("/contribuciones-por-sprint")
    public ResponseEntity<List<Map<String, Object>>> contribucionesPorSprint() {
        return ResponseEntity.ok(dashboardService.getContribucionesPorSprint());
    }

    @GetMapping("/kpi-personal")
    public ResponseEntity<Map<String, Object>> kpiPersonal(@RequestParam Long idUsuario) {
        return ResponseEntity.ok(dashboardService.getKpiPersonal(idUsuario));
    }

    @PostMapping("/generar-reporte")
    public ResponseEntity<Map<String, String>> generarReporte(
            @RequestBody Map<String, Object> datos) {
        try {
            String reporte = deepSeekService.generarReporteSprint(datos);
            return ResponseEntity.ok(Map.of("reporte", reporte));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to generate report: " + e.getMessage()));
        }
    }
}
