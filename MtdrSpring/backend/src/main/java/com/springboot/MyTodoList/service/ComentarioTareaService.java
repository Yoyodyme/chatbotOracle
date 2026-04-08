package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.ComentarioTarea;
import com.springboot.MyTodoList.repository.ComentarioTareaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ComentarioTareaService {
    @Autowired
    private ComentarioTareaRepository comentarioTareaRepository;

    public ComentarioTarea crearComentario(ComentarioTarea comentario) {
        return comentarioTareaRepository.save(comentario);
    }

    public ComentarioTarea obtenerComentarioPorId(Long id) {
        Optional<ComentarioTarea> comentario = comentarioTareaRepository.findById(id);
        return comentario.orElse(null);
    }

    public List<ComentarioTarea> obtenerComentariosPorTarea(Long idTarea) {
        return comentarioTareaRepository.findByTareaIdTarea(idTarea);
    }

    public List<ComentarioTarea> obtenerComentariosPorUsuarioAutor(Long idUsuario) {
        return comentarioTareaRepository.findByUsuarioAutorIdUsuario(idUsuario);
    }

    public List<ComentarioTarea> obtenerTodosLosComentarios() {
        return comentarioTareaRepository.findAll();
    }

    public ComentarioTarea actualizarComentario(Long id, ComentarioTarea comentarioActualizado) {
        Optional<ComentarioTarea> comentarioExistente = comentarioTareaRepository.findById(id);
        if (comentarioExistente.isPresent()) {
            ComentarioTarea comentario = comentarioExistente.get();
            if (comentarioActualizado.getCuerpo() != null) {
                comentario.setCuerpo(comentarioActualizado.getCuerpo());
            }
            return comentarioTareaRepository.save(comentario);
        }
        return null;
    }

    public boolean eliminarComentario(Long id) {
        if (comentarioTareaRepository.existsById(id)) {
            comentarioTareaRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
