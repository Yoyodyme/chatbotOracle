package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.service.DashboardService;
import com.springboot.MyTodoList.service.DeepSeekService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * REST controller exposing read-only analytics aggregations and an AI report generator
 * under the {@code /api/dashboard} base path.
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private DeepSeekService deepSeekService;

    /**
     * Returns counts of closed features and bugs, broken down by current and previous month.
     *
     * @return HTTP 200 with a map containing feature and bug totals per time window
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }

    /**
     * Returns overall completion progress across all records as a percentage.
     *
     * @return HTTP 200 with total, completed, remaining counts and a rounded percentage
     */
    @GetMapping("/sprint")
    public ResponseEntity<Map<String, Object>> sprint() {
        return ResponseEntity.ok(dashboardService.getSprintProgress());
    }

    /**
     * Returns per-month average real vs. estimated hours for the last six months.
     *
     * @return HTTP 200 with a time-ordered list of monthly hour averages
     */
    @GetMapping("/time-comparison")
    public ResponseEntity<List<Map<String, Object>>> timeComparison() {
        return ResponseEntity.ok(dashboardService.getTimeComparison());
    }

    /**
     * Returns the count of completed records grouped by day of the week.
     *
     * @return HTTP 200 with a list of seven entries, one per weekday
     */
    @GetMapping("/team-velocity")
    public ResponseEntity<List<Map<String, Object>>> teamVelocity() {
        return ResponseEntity.ok(dashboardService.getTeamVelocity());
    }

    /**
     * Returns each user's share of total assigned records as a count and percentage,
     * sorted descending by count.
     *
     * @return HTTP 200 with a ranked list of per-user assignment shares
     */
    @GetMapping("/personal-work")
    public ResponseEntity<List<Map<String, Object>>> personalWork() {
        return ResponseEntity.ok(dashboardService.getPersonalWork());
    }

    /**
     * Returns the count and percentage of records in each lifecycle state,
     * ordered by the state's display order; states with zero records are omitted.
     *
     * @return HTTP 200 with a list of per-status distribution entries
     */
    @GetMapping("/status-distribution")
    public ResponseEntity<List<Map<String, Object>>> statusDistribution() {
        return ResponseEntity.ok(dashboardService.getDistribucionEstatus());
    }

    /**
     * Returns aggregated estimated and real hours grouped by the requested time period.
     *
     * @param periodo grouping granularity: {@code "day"} (last 14 days),
     *                {@code "week"} (last 10 weeks, default), or {@code "month"} (last 12 months)
     * @return HTTP 200 with a time-ordered list of period-level hour totals
     */
    @GetMapping("/weekly-hours")
    public ResponseEntity<List<Map<String, Object>>> weeklyHours(
            @RequestParam(defaultValue = "week") String periodo) {
        return ResponseEntity.ok(dashboardService.getHoras(periodo));
    }

    /**
     * Returns a ranked list of assigned records per user for the current month;
     * falls back to all records when the current month has no assignments.
     *
     * @return HTTP 200 with per-user contribution counts sorted descending
     */
    @GetMapping("/contributions")
    public ResponseEntity<List<Map<String, Object>>> contributions() {
        return ResponseEntity.ok(dashboardService.getContribuciones());
    }

    /**
     * Returns the number of completed records per user per iteration,
     * across all iterations that have a start date.
     *
     * @return HTTP 200 with a flat list of sprint-user-completions entries
     */
    @GetMapping("/kpi-por-sprint")
    public ResponseEntity<List<Map<String, Object>>> kpiPorSprint() {
        return ResponseEntity.ok(dashboardService.getKpiPorSprint());
    }

    /**
     * Returns total real hours logged per user per iteration,
     * across all iterations that have a start date.
     *
     * @return HTTP 200 with a flat list of sprint-user-hours entries
     */
    @GetMapping("/horas-por-sprint")
    public ResponseEntity<List<Map<String, Object>>> horasPorSprint() {
        return ResponseEntity.ok(dashboardService.getHorasRealesPorSprint());
    }

    /**
     * Returns a summary row per iteration: total records, completed count,
     * estimated and real hours, completion percentage, and lifecycle state.
     *
     * @return HTTP 200 with an iteration-ordered list of summary objects
     */
    @GetMapping("/resumen-sprints")
    public ResponseEntity<List<Map<String, Object>>> resumenSprints() {
        return ResponseEntity.ok(dashboardService.getResumenSprints());
    }

    /**
     * Returns task counts per user per iteration across all iterations,
     * regardless of completion status.
     *
     * @return HTTP 200 with a flat list of sprint-user-task-count entries
     */
    @GetMapping("/contribuciones-por-sprint")
    public ResponseEntity<List<Map<String, Object>>> contribucionesPorSprint() {
        return ResponseEntity.ok(dashboardService.getContribucionesPorSprint());
    }

    /**
     * Returns KPI, hours, and contribution data scoped to a single user across all iterations.
     *
     * @param idUsuario surrogate key of the account to generate the personal view for
     * @return HTTP 200 with a map containing three sub-lists: kpiPorSprint, horasPorSprint,
     *         and contribucionesPorSprint
     */
    @GetMapping("/kpi-personal")
    public ResponseEntity<Map<String, Object>> kpiPersonal(@RequestParam Long idUsuario) {
        return ResponseEntity.ok(dashboardService.getKpiPersonal(idUsuario));
    }

    /**
     * Submits the provided dashboard data to the AI service and returns a generated text report.
     *
     * @param datos a map of dashboard metrics to include in the report prompt
     * @return HTTP 200 with the generated report text, or HTTP 500 when the AI service fails
     */
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
