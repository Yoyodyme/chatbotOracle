package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.EstatusTarea;
import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.repository.EstatusTareaRepository;
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
        Locale spanish = new Locale("es", "MX");

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
                    item.put("mes", entry.getKey().getMonth().getDisplayName(TextStyle.SHORT, spanish));
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
        Locale spanish = new Locale("es", "MX");
        LocalDateTime ahora = LocalDateTime.now();
        List<Tarea> recientes;

        switch (periodo) {
            case "day":
                recientes = tareaRepository.findAll().stream()
                        .filter(t -> t.getCreadoEn() != null && t.getCreadoEn().isAfter(ahora.minusDays(14)))
                        .collect(Collectors.toList());
                DateTimeFormatter fmtDia = DateTimeFormatter.ofPattern("d MMM", spanish);
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
                                e.getKey().getMonth().getDisplayName(TextStyle.SHORT, spanish),
                                e.getValue()))
                        .collect(Collectors.toList());

            default: // week
                recientes = tareaRepository.findAll().stream()
                        .filter(t -> t.getCreadoEn() != null && t.getCreadoEn().isAfter(ahora.minusDays(70)))
                        .collect(Collectors.toList());
                WeekFields iso = WeekFields.ISO;
                DateTimeFormatter fmtSem = DateTimeFormatter.ofPattern("d MMM", spanish);
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
