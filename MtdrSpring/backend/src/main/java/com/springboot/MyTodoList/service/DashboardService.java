package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.EstatusTarea;
import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.repository.EstatusTareaRepository;
import com.springboot.MyTodoList.repository.SprintRepository;
import com.springboot.MyTodoList.repository.TareaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    @Autowired
    private TareaRepository tareaRepository;

    @Autowired
    private EstatusTareaRepository estatusRepository;

    @Autowired
    private SprintRepository sprintRepository;

    private Long getIdEstatusDone() {
        return estatusRepository.findAll().stream()
                .filter(e -> e.getOrden() != null)
                .max(Comparator.comparingLong(EstatusTarea::getOrden))
                .map(EstatusTarea::getIdEstatus)
                .orElse(-1L);
    }

    private boolean esBug(Tarea t) {
        String titulo = (t.getTitulo() != null ? t.getTitulo() : "").toLowerCase();
        String desc = (t.getDescripcion() != null ? t.getDescripcion() : "").toLowerCase();
        return titulo.contains("bug") || desc.contains("bug");
    }

    public Map<String, Object> getStats() {
        Long idDone = getIdEstatusDone();
        List<Tarea> todas = tareaRepository.findAll();

        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime inicioMesActual = ahora.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime inicioMesAnterior = inicioMesActual.minusMonths(1);

        List<Tarea> cerradas = todas.stream()
                .filter(t -> t.getEstatus() != null && idDone.equals(t.getEstatus().getIdEstatus()))
                .collect(Collectors.toList());

        long featuresTotal = cerradas.stream().filter(t -> !esBug(t)).count();
        long featuresMesActual = cerradas.stream()
                .filter(t -> !esBug(t) && t.getActualizadoEn() != null
                        && !t.getActualizadoEn().isBefore(inicioMesActual))
                .count();
        long featuresMesAnterior = cerradas.stream()
                .filter(t -> !esBug(t) && t.getActualizadoEn() != null
                        && !t.getActualizadoEn().isBefore(inicioMesAnterior)
                        && t.getActualizadoEn().isBefore(inicioMesActual))
                .count();

        long bugsTotal = cerradas.stream().filter(this::esBug).count();
        long bugsMesActual = cerradas.stream()
                .filter(t -> esBug(t) && t.getActualizadoEn() != null
                        && !t.getActualizadoEn().isBefore(inicioMesActual))
                .count();
        long bugsMesAnterior = cerradas.stream()
                .filter(t -> esBug(t) && t.getActualizadoEn() != null
                        && !t.getActualizadoEn().isBefore(inicioMesAnterior)
                        && t.getActualizadoEn().isBefore(inicioMesActual))
                .count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("featuresCerradas", featuresTotal);
        result.put("featuresMesActual", featuresMesActual);
        result.put("featuresMesAnterior", featuresMesAnterior);
        result.put("bugsCerrados", bugsTotal);
        result.put("bugsMesActual", bugsMesActual);
        result.put("bugsMesAnterior", bugsMesAnterior);
        return result;
    }

    public Map<String, Object> getSprintProgress() {
        Long idDone = getIdEstatusDone();
        List<Tarea> todas = tareaRepository.findAll();
        long total = todas.size();
        long done = todas.stream()
                .filter(t -> t.getEstatus() != null && idDone.equals(t.getEstatus().getIdEstatus()))
                .count();
        double pct = total > 0 ? (done * 100.0 / total) : 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", total);
        result.put("completadas", done);
        result.put("porcentaje", (long) Math.round(pct));
        result.put("restantes", total - done);
        return result;
    }

    public List<Map<String, Object>> getTimeComparison() {
        Long idDone = getIdEstatusDone();
        Locale locale = Locale.ENGLISH;

        List<Tarea> cerradas = tareaRepository.findAll().stream()
                .filter(t -> t.getEstatus() != null && idDone.equals(t.getEstatus().getIdEstatus()))
                .filter(t -> t.getActualizadoEn() != null)
                .filter(t -> t.getActualizadoEn().isAfter(LocalDateTime.now().minusMonths(6)))
                .collect(Collectors.toList());

        Map<YearMonth, List<Tarea>> porMes = cerradas.stream()
                .collect(Collectors.groupingBy(t -> YearMonth.from(t.getActualizadoEn())));

        return porMes.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    List<Tarea> ts = entry.getValue();
                    double realProm = ts.stream().mapToDouble(t -> {
                        if (t.getHorasReales() != null && t.getHorasReales() > 0) return t.getHorasReales();
                        if (t.getCreadoEn() != null) {
                            long horas = Duration.between(t.getCreadoEn(), t.getActualizadoEn()).toHours();
                            return horas > 0 ? horas : 1.0;
                        }
                        return 4.0;
                    }).average().orElse(0);
                    double estimadoProm = ts.stream()
                            .mapToDouble(t -> t.getHorasEstimadas() != null && t.getHorasEstimadas() > 0
                                    ? t.getHorasEstimadas() : 4.0)
                            .average().orElse(4.0);

                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("mes", entry.getKey().getMonth().getDisplayName(TextStyle.SHORT, locale));
                    item.put("horasReales", Math.round(realProm * 10.0) / 10.0);
                    item.put("horasEstimadas", Math.round(estimadoProm * 10.0) / 10.0);
                    return item;
                })
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getTeamVelocity() {
        Long idDone = getIdEstatusDone();
        List<Tarea> cerradas = tareaRepository.findAll().stream()
                .filter(t -> t.getEstatus() != null && idDone.equals(t.getEstatus().getIdEstatus()))
                .filter(t -> t.getActualizadoEn() != null)
                .collect(Collectors.toList());

        String[] abrevs = {"L", "M", "Mi", "J", "V", "S", "D"};
        Map<DayOfWeek, Long> porDia = cerradas.stream()
                .collect(Collectors.groupingBy(t -> t.getActualizadoEn().getDayOfWeek(), Collectors.counting()));

        return Arrays.stream(DayOfWeek.values())
                .map(dia -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("dia", abrevs[dia.getValue() - 1]);
                    item.put("tareas", porDia.getOrDefault(dia, 0L));
                    return item;
                })
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getPersonalWork() {
        List<Tarea> conAsignado = tareaRepository.findAll().stream()
                .filter(t -> t.getUsuarioAsignado() != null)
                .collect(Collectors.toList());

        int total = conAsignado.size();
        if (total == 0) return Collections.emptyList();

        Map<Long, List<Tarea>> porUsuario = conAsignado.stream()
                .collect(Collectors.groupingBy(t -> t.getUsuarioAsignado().getIdUsuario()));

        return porUsuario.entrySet().stream()
                .map(entry -> {
                    Usuario u = entry.getValue().get(0).getUsuarioAsignado();
                    int count = entry.getValue().size();
                    double pct = (count * 100.0 / total);
                    String nombre = (u.getNombreCompleto() != null && !u.getNombreCompleto().isBlank())
                            ? u.getNombreCompleto().split(" ")[0]
                            : u.getNombreUsuario();
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("nombre", nombre);
                    item.put("tareas", count);
                    item.put("porcentaje", Math.round(pct * 100.0) / 100.0);
                    return item;
                })
                .sorted((a, b) -> Integer.compare((Integer) b.get("tareas"), (Integer) a.get("tareas")))
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getDistribucionEstatus() {
        List<EstatusTarea> estatuses = estatusRepository.findAll().stream()
                .sorted(Comparator.comparingLong(e -> e.getOrden() != null ? e.getOrden() : 0L))
                .collect(Collectors.toList());

        List<Tarea> todas = tareaRepository.findAll();
        int total = todas.size();

        return estatuses.stream()
                .map(est -> {
                    long count = todas.stream()
                            .filter(t -> t.getEstatus() != null && est.getIdEstatus().equals(t.getEstatus().getIdEstatus()))
                            .count();
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("estatus", est.getNombre());
                    item.put("cantidad", count);
                    item.put("porcentaje", total > 0 ? (int) Math.round(count * 100.0 / total) : 0);
                    return item;
                })
                .filter(item -> (long) item.get("cantidad") > 0)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getHoras(String periodo) {
        Locale locale = Locale.ENGLISH;
        LocalDateTime ahora = LocalDateTime.now();
        List<Tarea> recientes;

        switch (periodo) {
            case "day":
                recientes = tareaRepository.findAll().stream()
                        .filter(t -> t.getCreadoEn() != null && t.getCreadoEn().isAfter(ahora.minusDays(14)))
                        .collect(Collectors.toList());
                DateTimeFormatter fmtDia = DateTimeFormatter.ofPattern("d MMM", locale);
                return recientes.stream()
                        .collect(Collectors.groupingBy(t -> t.getCreadoEn().toLocalDate()))
                        .entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .map(e -> buildHorasItem(e.getKey().format(fmtDia), e.getValue()))
                        .collect(Collectors.toList());

            case "month":
                recientes = tareaRepository.findAll().stream()
                        .filter(t -> t.getCreadoEn() != null && t.getCreadoEn().isAfter(ahora.minusMonths(12)))
                        .collect(Collectors.toList());
                return recientes.stream()
                        .collect(Collectors.groupingBy(t -> YearMonth.from(t.getCreadoEn())))
                        .entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .map(e -> buildHorasItem(
                                e.getKey().getMonth().getDisplayName(TextStyle.SHORT, locale),
                                e.getValue()))
                        .collect(Collectors.toList());

            default: // week
                recientes = tareaRepository.findAll().stream()
                        .filter(t -> t.getCreadoEn() != null && t.getCreadoEn().isAfter(ahora.minusDays(70)))
                        .collect(Collectors.toList());
                WeekFields iso = WeekFields.ISO;
                DateTimeFormatter fmtSem = DateTimeFormatter.ofPattern("d MMM", locale);
                return recientes.stream()
                        .collect(Collectors.groupingBy(
                                t -> t.getCreadoEn().toLocalDate().with(iso.dayOfWeek(), 1)))
                        .entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .map(e -> buildHorasItem(e.getKey().format(fmtSem), e.getValue()))
                        .collect(Collectors.toList());
        }
    }

    private Map<String, Object> buildHorasItem(String label, List<Tarea> ts) {
        double estimadas = ts.stream()
                .mapToDouble(t -> t.getHorasEstimadas() != null && t.getHorasEstimadas() > 0
                        ? t.getHorasEstimadas() : 4.0)
                .sum();
        double reales = ts.stream()
                .mapToDouble(t -> t.getHorasReales() != null ? t.getHorasReales() : 0.0)
                .sum();
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("periodo", label);
        item.put("horasEstimadas", Math.round(estimadas * 10.0) / 10.0);
        item.put("horasReales", Math.round(reales * 10.0) / 10.0);
        return item;
    }

    private List<Map<String, Object>> getHorasPorSprint(String sprintName) {
        // LÓGICA para 'current' o SPRINT ESPECÍFICO
        Sprint sprint = null;

        if ("current".equals(sprintName)) {
            // Buscar sprint activo (activo == true)
            sprint = sprintRepository.findAll().stream()
                    .filter(s -> "ACTIVO".equalsIgnoreCase(s.getEstado()))
                    .findFirst()
                    .orElse(null);
        } else {
            // Buscar sprint por nombre específico (ej. "Sprint 0")
            sprint = sprintRepository.findAll().stream()
                    .filter(s -> sprintName.equals(s.getNombre()))
                    .findFirst()
                    .orElse(null);
        }

        // Si no se encuentra sprint válido, retornar vacío
        if (sprint == null) {
            return Collections.emptyList();
        }

        // FILTRADO Y RETORNO DE HORAS POR SPRINT
        // Manejo defensivo: evitar NullPointerException si tarea.getSprint() es nulo
        final Sprint finalSprint = sprint;
        List<Tarea> tareasSprint = tareaRepository.findAll().stream()
                .filter(t -> t.getSprint() != null && finalSprint.getIdSprint().equals(t.getSprint().getIdSprint()))
                .collect(Collectors.toList());

        // Calcular horas estimadas (default 4.0 si es nulo)
        double horasEstimadas = tareasSprint.stream()
                .mapToDouble(t -> t.getHorasEstimadas() != null && t.getHorasEstimadas() > 0
                        ? t.getHorasEstimadas() : 4.0)
                .sum();

        // Calcular horas reales (default 0.0 si es nulo)
        double horasReales = tareasSprint.stream()
                .mapToDouble(t -> t.getHorasReales() != null ? t.getHorasReales() : 0.0)
                .sum();

        // Construir respuesta en formato esperado por el gráfico
        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("periodo", sprint.getNombre());
        resultado.put("horasEstimadas", Math.round(horasEstimadas * 10.0) / 10.0);
        resultado.put("horasReales", Math.round(horasReales * 10.0) / 10.0);

        return Collections.singletonList(resultado);
    }

    private String getNombreCorto(Usuario u) {
        if (u.getNombreCompleto() != null && !u.getNombreCompleto().isBlank()) {
            return u.getNombreCompleto().split(" ")[0];
        }
        return u.getNombreUsuario() != null ? u.getNombreUsuario() : "Desconocido";
    }

    private String getEstadoSprint(Sprint s) {
        if ("ACTIVO".equalsIgnoreCase(s.getEstado())) return "ACTIVE";
        if (s.getFechaFin() != null && s.getFechaFin().isBefore(java.time.LocalDate.now())) return "PASADO";
        return "FUTURO";
    }

    private List<Sprint> getSprintsOrdenados() {
        return sprintRepository.findAll().stream()
                .filter(s -> s.getFechaInicio() != null)
                .filter(s -> s.getNombre() != null && !s.getNombre().isBlank())
                .sorted(Comparator.comparing(Sprint::getFechaInicio))
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getKpiPorSprint() {
        Long idDone = getIdEstatusDone();
        List<Sprint> sprints = getSprintsOrdenados();
        List<Tarea> todas = tareaRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Sprint sprint : sprints) {
            Map<String, Long> countPorUsuario = new LinkedHashMap<>();
            for (Tarea t : todas) {
                if (t.getSprint() == null || !sprint.getIdSprint().equals(t.getSprint().getIdSprint())) continue;
                String usuario = t.getUsuarioAsignado() != null ? getNombreCorto(t.getUsuarioAsignado()) : "Sin asignar";
                boolean done = t.getEstatus() != null && idDone.equals(t.getEstatus().getIdEstatus());
                countPorUsuario.merge(usuario, done ? 1L : 0L, Long::sum);
            }
            for (Map.Entry<String, Long> e : countPorUsuario.entrySet()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("sprint", sprint.getNombre() != null ? sprint.getNombre() : "Sin nombre");
                item.put("usuario", e.getKey());
                item.put("tasksCompletadas", e.getValue());
                result.add(item);
            }
        }
        return result;
    }

    public List<Map<String, Object>> getHorasRealesPorSprint() {
        List<Sprint> sprints = getSprintsOrdenados();
        List<Tarea> todas = tareaRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Sprint sprint : sprints) {
            Map<String, Double> horasPorUsuario = new LinkedHashMap<>();
            for (Tarea t : todas) {
                if (t.getSprint() == null || !sprint.getIdSprint().equals(t.getSprint().getIdSprint())) continue;
                String usuario = t.getUsuarioAsignado() != null ? getNombreCorto(t.getUsuarioAsignado()) : "Sin asignar";
                double horas = t.getHorasReales() != null ? t.getHorasReales() : 0.0;
                horasPorUsuario.merge(usuario, horas, Double::sum);
            }
            for (Map.Entry<String, Double> e : horasPorUsuario.entrySet()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("sprint", sprint.getNombre() != null ? sprint.getNombre() : "Sin nombre");
                item.put("usuario", e.getKey());
                item.put("horasReales", Math.round(e.getValue() * 10.0) / 10.0);
                result.add(item);
            }
        }
        return result;
    }

    public List<Map<String, Object>> getResumenSprints() {
        Long idDone = getIdEstatusDone();
        List<Sprint> sprints = getSprintsOrdenados();
        List<Tarea> todas = tareaRepository.findAll();

        return sprints.stream().map(sprint -> {
            List<Tarea> tareasSprint = todas.stream()
                    .filter(t -> t.getSprint() != null && sprint.getIdSprint().equals(t.getSprint().getIdSprint()))
                    .collect(Collectors.toList());

            long totalTareas = tareasSprint.size();
            long completadas = tareasSprint.stream()
                    .filter(t -> t.getEstatus() != null && idDone.equals(t.getEstatus().getIdEstatus()))
                    .count();
            double horasEstimadas = tareasSprint.stream()
                    .mapToDouble(t -> t.getHorasEstimadas() != null ? t.getHorasEstimadas() : 0.0)
                    .sum();
            double horasReales = tareasSprint.stream()
                    .mapToDouble(t -> t.getHorasReales() != null ? t.getHorasReales() : 0.0)
                    .sum();
            long porcentaje = totalTareas > 0 ? (completadas * 100 / totalTareas) : 0;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("sprint", sprint.getNombre() != null ? sprint.getNombre() : "Sin nombre");
            item.put("estado", getEstadoSprint(sprint));
            item.put("totalTareas", totalTareas);
            item.put("completadas", completadas);
            item.put("horasEstimadas", Math.round(horasEstimadas * 10.0) / 10.0);
            item.put("horasReales", Math.round(horasReales * 10.0) / 10.0);
            item.put("porcentaje", porcentaje);
            return item;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getContribucionesPorSprint() {
        List<Sprint> sprints = getSprintsOrdenados();
        List<Tarea> todas = tareaRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Sprint sprint : sprints) {
            Map<String, Integer> countPorUsuario = new LinkedHashMap<>();
            for (Tarea t : todas) {
                if (t.getSprint() == null || !sprint.getIdSprint().equals(t.getSprint().getIdSprint())) continue;
                String usuario = t.getUsuarioAsignado() != null ? getNombreCorto(t.getUsuarioAsignado()) : "Sin asignar";
                countPorUsuario.merge(usuario, 1, Integer::sum);
            }
            for (Map.Entry<String, Integer> e : countPorUsuario.entrySet()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("sprint", sprint.getNombre() != null ? sprint.getNombre() : "Sin nombre");
                item.put("usuario", e.getKey());
                item.put("tareas", e.getValue());
                result.add(item);
            }
        }
        return result;
    }

    public Map<String, Object> getKpiPersonal(Long idUsuario) {
        Long idDone = getIdEstatusDone();
        List<Sprint> sprints = getSprintsOrdenados();
        List<Tarea> tareasFiltradas = tareaRepository.findAll().stream()
                .filter(t -> t.getUsuarioAsignado() != null
                        && idUsuario.equals(t.getUsuarioAsignado().getIdUsuario()))
                .collect(Collectors.toList());

        List<Map<String, Object>> kpiSprint   = new ArrayList<>();
        List<Map<String, Object>> horasSprint  = new ArrayList<>();
        List<Map<String, Object>> contribSprint = new ArrayList<>();

        for (Sprint sprint : sprints) {
            List<Tarea> ts = tareasFiltradas.stream()
                    .filter(t -> t.getSprint() != null
                            && sprint.getIdSprint().equals(t.getSprint().getIdSprint()))
                    .collect(Collectors.toList());
            if (ts.isEmpty()) continue;

            String nombre    = getNombreCorto(ts.get(0).getUsuarioAsignado());
            String sprintNom = sprint.getNombre() != null ? sprint.getNombre() : "Sin nombre";

            long completadas = ts.stream()
                    .filter(t -> t.getEstatus() != null && idDone.equals(t.getEstatus().getIdEstatus()))
                    .count();
            double horasReales = ts.stream()
                    .mapToDouble(t -> t.getHorasReales() != null ? t.getHorasReales() : 0.0)
                    .sum();

            Map<String, Object> kpi = new LinkedHashMap<>();
            kpi.put("sprint", sprintNom);
            kpi.put("usuario", nombre);
            kpi.put("tasksCompletadas", completadas);
            kpiSprint.add(kpi);

            Map<String, Object> horas = new LinkedHashMap<>();
            horas.put("sprint", sprintNom);
            horas.put("usuario", nombre);
            horas.put("horasReales", Math.round(horasReales * 10.0) / 10.0);
            horasSprint.add(horas);

            Map<String, Object> contrib = new LinkedHashMap<>();
            contrib.put("sprint", sprintNom);
            contrib.put("usuario", nombre);
            contrib.put("tareas", ts.size());
            contribSprint.add(contrib);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("kpiPorSprint",             kpiSprint);
        result.put("horasPorSprint",           horasSprint);
        result.put("contribucionesPorSprint",  contribSprint);
        return result;
    }

    public List<Map<String, Object>> getContribuciones() {
        LocalDateTime inicioMes = LocalDateTime.now()
                .withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);

        List<Tarea> esteMes = tareaRepository.findAll().stream()
                .filter(t -> t.getCreadoEn() != null && !t.getCreadoEn().isBefore(inicioMes))
                .filter(t -> t.getUsuarioAsignado() != null)
                .collect(Collectors.toList());

        if (esteMes.isEmpty()) {
            esteMes = tareaRepository.findAll().stream()
                    .filter(t -> t.getUsuarioAsignado() != null)
                    .collect(Collectors.toList());
        }

        Map<Long, List<Tarea>> porUsuario = esteMes.stream()
                .collect(Collectors.groupingBy(t -> t.getUsuarioAsignado().getIdUsuario()));

        return porUsuario.entrySet().stream()
                .map(entry -> {
                    Usuario u = entry.getValue().get(0).getUsuarioAsignado();
                    String nombre = (u.getNombreCompleto() != null && !u.getNombreCompleto().isBlank())
                            ? u.getNombreCompleto().split(" ")[0]
                            : u.getNombreUsuario();
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("usuario", nombre);
                    item.put("tareas", entry.getValue().size());
                    return item;
                })
                .sorted((a, b) -> Integer.compare((Integer) b.get("tareas"), (Integer) a.get("tareas")))
                .collect(Collectors.toList());
    }
}
