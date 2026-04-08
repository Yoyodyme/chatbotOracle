package com.springboot.MyTodoList.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MiembroEquipoId implements Serializable {
    private Long equipo;
    private Long usuario;
}
