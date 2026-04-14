package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "LOGS_TAREA")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LogTarea {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_LOG")
    private Long idLog;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_TAREA", foreignKey = @ForeignKey(name = "FK_LOG_TAREA"))
    private Tarea tarea;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_USUARIO", foreignKey = @ForeignKey(name = "FK_LOG_USUARIO"))
    private Usuario usuario;

    @Column(name = "ID_ESTATUS_ORIGEN")
    private Long idEstatusOrigen;

    @Column(name = "ID_ESTATUS_DESTINO")
    private Long idEstatuDestino;

    @Column(name = "MENSAJE", length = 500)
    private String mensaje;

    @Column(name = "CREADO_EN", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        creadoEn = LocalDateTime.now();
    }
}
