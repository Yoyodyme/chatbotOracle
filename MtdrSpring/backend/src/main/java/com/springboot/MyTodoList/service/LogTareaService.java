package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.LogTarea;
import com.springboot.MyTodoList.repository.LogTareaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class LogTareaService {
    @Autowired
    private LogTareaRepository logTareaRepository;

    public LogTarea crearLog(LogTarea log) {
        return logTareaRepository.save(log);
    }

    public LogTarea obtenerLogPorId(Long id) {
        Optional<LogTarea> log = logTareaRepository.findById(id);
        return log.orElse(null);
    }

    public List<LogTarea> obtenerLogsPorTarea(Long idTarea) {
        return logTareaRepository.findByTareaIdTarea(idTarea);
    }

    public List<LogTarea> obtenerLogsPorUsuario(Long idUsuario) {
        return logTareaRepository.findByUsuarioIdUsuario(idUsuario);
    }

    public List<LogTarea> obtenerTodosLosLogs() {
        return logTareaRepository.findAll();
    }

    public boolean eliminarLog(Long id) {
        if (logTareaRepository.existsById(id)) {
            logTareaRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
