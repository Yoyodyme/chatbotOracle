package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * JPA entity that maps to the USUARIOS table; represents a platform account
 * that may authenticate via local credentials, Telegram, or OCI Identity.
 */
@Entity
@Table(name = "USUARIOS")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    /** Auto-generated surrogate key. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_USUARIO")
    private Long idUsuario;

    /** External identifier supplied by a messaging integration (e.g. Telegram chat ID); unique. */
    @Column(name = "ID_INTEGRATION_USUARIO", unique = true, length = 100)
    private String idIntegrationUsuario;

    /** Login handle used for local authentication; unique within the system. */
    @Column(name = "NOMBRE_USUARIO", length = 100)
    private String nombreUsuario;

    /** Full display name shown in reports and dashboard labels. */
    @Column(name = "NOMBRE_COMPLETO", length = 200)
    private String nombreCompleto;

    /** Permission profile assigned to this account; determines access level. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_ROL", foreignKey = @ForeignKey(name = "FK_USUARIO_ROL"))
    private Rol rol;

    /** BCrypt-encoded credential; null for accounts that rely solely on SSO. */
    @Column(name = "PASSWORD_HASH")
    private String passwordHash;

    /** OCI Identity subject claim; unique across all OCI-linked accounts. */
    @Column(name = "OCI_SUBJECT", unique = true, length = 100)
    private String ociSubject;

    /** Wall-clock timestamp set automatically on first insert; never overwritten. */
    @Column(name = "CREADO_EN", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        creadoEn = LocalDateTime.now();
    }
}
