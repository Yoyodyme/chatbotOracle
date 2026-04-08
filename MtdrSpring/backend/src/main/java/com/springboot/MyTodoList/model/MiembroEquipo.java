package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.io.Serializable;

@Entity
@Table(name = "MIEMBROS_EQUIPO")
@Data
@NoArgsConstructor
@AllArgsConstructor
@IdClass(MiembroEquipoId.class)
public class MiembroEquipo {
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_EQUIPO", foreignKey = @ForeignKey(name = "FK_ME_EQUIPO"))
    private Equipo equipo;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_USUARIO", foreignKey = @ForeignKey(name = "FK_ME_USUARIO"))
    private Usuario usuario;

    @Column(name = "SE_UNIO_EN")
    private LocalDateTime seUnioEn;

    @PrePersist
    protected void onCreate() {
        seUnioEn = LocalDateTime.now();
    }
}
