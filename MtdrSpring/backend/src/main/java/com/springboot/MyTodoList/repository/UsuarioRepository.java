package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Usuario findByNombreUsuario(String nombreUsuario);
    Optional<Usuario> findByIdIntegrationUsuario(String idIntegrationUsuario);
}
