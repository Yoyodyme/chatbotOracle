package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Usuario findByNombreUsuario(String nombreUsuario);
    Usuario findByIdIntegrationUsuario(String idIntegrationUsuario);
}
