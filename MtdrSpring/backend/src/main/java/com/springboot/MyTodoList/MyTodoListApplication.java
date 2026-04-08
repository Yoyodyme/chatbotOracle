package com.springboot.MyTodoList;

import com.springboot.MyTodoList.model.*;
import com.springboot.MyTodoList.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@SpringBootApplication
public class MyTodoListApplication {

    public static void main(String[] args) {
        SpringApplication.run(MyTodoListApplication.class, args);
    }

    @Bean
    CommandLineRunner testDB(
            RolService rolService,
            EstatusTareaService estatusTareaService,
            PrioridadTareaService prioridadTareaService,
            EquipoService equipoService,
            UsuarioService usuarioService,
            TareaService tareaService,
            ComentarioTareaService comentarioTareaService,
            EvidenciaTareaService evidenciaTareaService,
            LogTareaService logTareaService,
            MiembroEquipoService miembroEquipoService) {
        
        return args -> {
            System.out.println("\n========== INICIANDO PRUEBAS DE BASE DE DATOS ==========\n");

            // 1. PRUEBAS - LECTURA DE ESTATUS
            System.out.println("--- 1. LEYENDO ESTATUS DE TAREAS ---");
            List<EstatusTarea> estatus = estatusTareaService.obtenerTodosLosEstatus();
            estatus.forEach(e -> System.out.println("  Estatus: " + e.getNombre() + " (ID: " + e.getIdEstatus() + ")"));
            System.out.println("  Total de Estatus: " + estatus.size() + "\n");

            // 2. PRUEBAS - LECTURA DE PRIORIDADES
            System.out.println("--- 2. LEYENDO PRIORIDADES DE TAREAS ---");
            List<PrioridadTarea> prioridades = prioridadTareaService.obtenerTodasLasPrioridades();
            prioridades.forEach(p -> System.out.println("  Prioridad: " + p.getNombre() + " (ID: " + p.getIdPrioridad() + ")"));
            System.out.println("  Total de Prioridades: " + prioridades.size() + "\n");

            // 3. PRUEBAS - LECTURA DE ROLES
            System.out.println("--- 3. LEYENDO ROLES ---");
            List<Rol> roles = rolService.obtenerTodosLosRoles();
            roles.forEach(r -> System.out.println("  Rol: " + r.getNombre() + " - " + r.getDescripcion()));
            System.out.println("  Total de Roles: " + roles.size() + "\n");

            // 4. PRUEBAS - LECTURA DE EQUIPOS
            System.out.println("--- 4. LEYENDO EQUIPOS ---");
            List<Equipo> equipos = equipoService.obtenerTodosLosEquipos();
            equipos.forEach(eq -> System.out.println("  Equipo: " + eq.getNombre() + " (ID: " + eq.getIdEquipo() + ")"));
            System.out.println("  Total de Equipos: " + equipos.size() + "\n");

            // 5. PRUEBAS - LECTURA DE USUARIOS
            System.out.println("--- 5. LEYENDO USUARIOS ---");
            List<Usuario> usuarios = usuarioService.obtenerTodosLosUsuarios();
            usuarios.forEach(u -> System.out.println(
                "  Usuario: " + u.getNombreUsuario() + 
                " (" + u.getNombreCompleto() + ")" +
                " - Rol: " + (u.getRol() != null ? u.getRol().getNombre() : "N/A")));
            System.out.println("  Total de Usuarios: " + usuarios.size() + "\n");

            // 6. PRUEBAS - LECTURA DE TAREAS
            System.out.println("--- 6. LEYENDO TAREAS ---");
            List<Tarea> tareas = tareaService.obtenerTodosLasTareas();
            tareas.forEach(t -> {
                String estatus_nombre = t.getEstatus() != null ? t.getEstatus().getNombre() : "N/A";
                String usuario = t.getUsuarioAsignado() != null ? t.getUsuarioAsignado().getNombreUsuario() : "Sin asignar";
                System.out.println("  Tarea: " + t.getTitulo() + 
                    " | Estatus: " + estatus_nombre + 
                    " | Asignado a: " + usuario);
            });
            System.out.println("  Total de Tareas: " + tareas.size() + "\n");

            // 7. PRUEBAS - LECTURA DE COMENTARIOS
            System.out.println("--- 7. LEYENDO COMENTARIOS DE TAREAS ---");
            List<ComentarioTarea> comentarios = comentarioTareaService.obtenerTodosLosComentarios();
            comentarios.forEach(c -> {
                String tarea = c.getTarea() != null ? c.getTarea().getTitulo() : "N/A";
                String autor = c.getUsuarioAutor() != null ? c.getUsuarioAutor().getNombreUsuario() : "N/A";
                System.out.println("  Comentario en '" + tarea + "' por " + autor + ": " + c.getCuerpo());
            });
            System.out.println("  Total de Comentarios: " + comentarios.size() + "\n");

            // 8. PRUEBAS - LECTURA DE EVIDENCIAS
            System.out.println("--- 8. LEYENDO EVIDENCIAS DE TAREAS ---");
            List<EvidenciaTarea> evidencias = evidenciaTareaService.obtenerTodasLasEvidencias();
            evidencias.forEach(e -> {
                String tarea = e.getTarea() != null ? e.getTarea().getTitulo() : "N/A";
                System.out.println("  Evidencia de '" + tarea + "': " + e.getUrlArchivo() + " | Nota: " + e.getNota());
            });
            System.out.println("  Total de Evidencias: " + evidencias.size() + "\n");

            // 9. PRUEBAS - LECTURA DE MIEMBROS DE EQUIPO
            System.out.println("--- 9. LEYENDO MIEMBROS DE EQUIPOS ---");
            List<MiembroEquipo> miembros = miembroEquipoService.obtenerTodosLosMiembros();
            miembros.forEach(m -> {
                String equipo = m.getEquipo() != null ? m.getEquipo().getNombre() : "N/A";
                String usuario = m.getUsuario() != null ? m.getUsuario().getNombreUsuario() : "N/A";
                System.out.println("  " + usuario + " es miembro de: " + equipo);
            });
            System.out.println("  Total de Miembros de Equipo: " + miembros.size() + "\n");

            // 10. PRUEBAS - LECTURA DE LOGS
            System.out.println("--- 10. LEYENDO LOGS DE TAREAS ---");
            List<LogTarea> logs = logTareaService.obtenerTodosLosLogs();
            logs.forEach(l -> {
                String tarea = l.getTarea() != null ? l.getTarea().getTitulo() : "N/A";
                String usuario = l.getUsuario() != null ? l.getUsuario().getNombreUsuario() : "N/A";
                System.out.println("  Log en '" + tarea + "' por " + usuario + ": " + l.getMensaje());
            });
            System.out.println("  Total de Logs: " + logs.size() + "\n");

            // 11. PRUEBAS - BÚSQUEDAS ESPECÍFICAS
            System.out.println("--- 11. PRUEBAS DE BÚSQUEDAS ESPECÍFICAS ---");
            
            // Obtener tareas por usuario asignado
            if (!usuarios.isEmpty()) {
                Long idUsuario = usuarios.get(0).getIdUsuario();
                List<Tarea> tareasDelUsuario = tareaService.obtenerTareasPorUsuarioAsignado(idUsuario);
                System.out.println("  Tareas asignadas a " + usuarios.get(0).getNombreUsuario() + 
                    ": " + tareasDelUsuario.size());
            }

            // Obtener tareas por estatus
            if (!estatus.isEmpty()) {
                List<Tarea> tareasPorEstatus = tareaService.obtenerTareasPorEstatus(estatus.get(0).getIdEstatus());
                System.out.println("  Tareas en estatus '" + estatus.get(0).getNombre() + 
                    "': " + tareasPorEstatus.size());
            }

            // Obtener miembros por equipo
            if (!equipos.isEmpty()) {
                List<MiembroEquipo> miembrosEquipo = miembroEquipoService.obtenerMiembrosPorEquipo(equipos.get(0).getIdEquipo());
                System.out.println("  Miembros del equipo '" + equipos.get(0).getNombre() + 
                    "': " + miembrosEquipo.size() + "\n");
            }

            System.out.println("========== PRUEBAS COMPLETADAS EXITOSAMENTE ==========\n");
        };
    }
}