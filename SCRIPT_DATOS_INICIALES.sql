-- ============================================================================
-- SCRIPT SQL - DATOS INICIALES PARA PRUEBAS EN PARALELO
-- MyTodoList API REST - Oracle Autonomous Database
--
-- USA PL/SQL con RETURNING INTO para capturar IDs generados por las
-- secuencias de Hibernate, sin conflictos con inserciones posteriores.
--
-- CÓMO EJECUTAR:
--   OCI Console → Autonomous Database → chatbotdb
--   → Database Actions → SQL
--   Pegar este script completo → Run Script (F5)
--   Activar antes: View → DBMS Output (para ver mensajes)
-- ============================================================================

SET SERVEROUTPUT ON;

DECLARE
  -- Roles
  v_rol_admin     NUMBER;
  v_rol_developer NUMBER;

  -- Estatus
  v_est_pendiente  NUMBER;
  v_est_progreso   NUMBER;
  v_est_completada NUMBER;

  -- Prioridades
  v_pri_baja  NUMBER;
  v_pri_media NUMBER;
  v_pri_alta  NUMBER;

  -- Equipos
  v_eq_alpha NUMBER;
  v_eq_beta  NUMBER;
  v_eq_gamma NUMBER;

  -- Usuarios
  v_usr_gabriel   NUMBER;
  v_usr_rutilo    NUMBER;
  v_usr_grecia    NUMBER;
  v_usr_eugenio   NUMBER;
  v_usr_elian     NUMBER;
  v_usr_alejandro NUMBER;

  -- Tareas
  v_tar_login    NUMBER;
  v_tar_bd       NUMBER;
  v_tar_cicd     NUMBER;
  v_tar_telegram NUMBER;
  v_tar_swagger  NUMBER;

BEGIN

  -- ============================================================================
  -- LIMPIEZA PREVIA
  -- ============================================================================
  DELETE FROM LOGS_TAREA;
  DELETE FROM EVIDENCIAS_TAREA;
  DELETE FROM COMENTARIOS_TAREA;
  DELETE FROM MIEMBROS_EQUIPO;
  DELETE FROM TAREAS;
  DELETE FROM USUARIOS;
  DELETE FROM PRIORIDAD_TAREA;
  DELETE FROM ESTATUS_TAREA;
  DELETE FROM EQUIPOS;
  DELETE FROM ROLES;
  DBMS_OUTPUT.PUT_LINE('Limpieza completada.');


  -- ============================================================================
  -- 1. ROLES
  -- ============================================================================
  INSERT INTO ROLES (NOMBRE, DESCRIPCION)
  VALUES ('Admin', 'Control total del sistema')
  RETURNING ID_ROL INTO v_rol_admin;

  INSERT INTO ROLES (NOMBRE, DESCRIPCION)
  VALUES ('Developer', 'Gestión de tareas propias y revisión de código')
  RETURNING ID_ROL INTO v_rol_developer;

  DBMS_OUTPUT.PUT_LINE('Roles: Admin=' || v_rol_admin || ', Developer=' || v_rol_developer);


  -- ============================================================================
  -- 2. ESTATUS DE TAREAS
  -- ============================================================================
  INSERT INTO ESTATUS_TAREA (NOMBRE, ORDEN) VALUES ('Pendiente',   1) RETURNING ID_ESTATUS INTO v_est_pendiente;
  INSERT INTO ESTATUS_TAREA (NOMBRE, ORDEN) VALUES ('En Progreso', 2) RETURNING ID_ESTATUS INTO v_est_progreso;
  INSERT INTO ESTATUS_TAREA (NOMBRE, ORDEN) VALUES ('Completada',  3) RETURNING ID_ESTATUS INTO v_est_completada;

  DBMS_OUTPUT.PUT_LINE('Estatus: Pendiente=' || v_est_pendiente || ', En Progreso=' || v_est_progreso || ', Completada=' || v_est_completada);


  -- ============================================================================
  -- 3. PRIORIDADES
  -- ============================================================================
  INSERT INTO PRIORIDAD_TAREA (NOMBRE, ORDEN) VALUES ('Baja',  1) RETURNING ID_PRIORIDAD INTO v_pri_baja;
  INSERT INTO PRIORIDAD_TAREA (NOMBRE, ORDEN) VALUES ('Media', 2) RETURNING ID_PRIORIDAD INTO v_pri_media;
  INSERT INTO PRIORIDAD_TAREA (NOMBRE, ORDEN) VALUES ('Alta',  3) RETURNING ID_PRIORIDAD INTO v_pri_alta;

  DBMS_OUTPUT.PUT_LINE('Prioridades: Baja=' || v_pri_baja || ', Media=' || v_pri_media || ', Alta=' || v_pri_alta);


  -- ============================================================================
  -- 4. EQUIPOS
  -- ============================================================================
  INSERT INTO EQUIPOS (NOMBRE) VALUES ('Equipo Alpha') RETURNING ID_EQUIPO INTO v_eq_alpha;
  INSERT INTO EQUIPOS (NOMBRE) VALUES ('Equipo Beta')  RETURNING ID_EQUIPO INTO v_eq_beta;
  INSERT INTO EQUIPOS (NOMBRE) VALUES ('Equipo Gamma') RETURNING ID_EQUIPO INTO v_eq_gamma;

  DBMS_OUTPUT.PUT_LINE('Equipos: Alpha=' || v_eq_alpha || ', Beta=' || v_eq_beta || ', Gamma=' || v_eq_gamma);


  -- ============================================================================
  -- 5. USUARIOS
  -- ============================================================================
  INSERT INTO USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_001', 'gabriel.admin', 'Gabriel Administrador', v_rol_admin, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_gabriel;

  INSERT INTO USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_002', 'rutilo.dev', 'Rutilo Developer', v_rol_developer, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_rutilo;

  INSERT INTO USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_003', 'grecia.dev', 'Grecia Developer', v_rol_developer, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_grecia;

  INSERT INTO USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_004', 'eugenio.dev', 'Eugenio Developer', v_rol_developer, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_eugenio;

  INSERT INTO USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_005', 'elian.dev', 'Elian Developer', v_rol_developer, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_elian;

  INSERT INTO USUARIOS (ID_INTEGRATION_USUARIO, NOMBRE_USUARIO, NOMBRE_COMPLETO, ID_ROL, CREADO_EN)
  VALUES ('TG_006', 'alejandro.dev', 'Alejandro Developer', v_rol_developer, SYSDATE)
  RETURNING ID_USUARIO INTO v_usr_alejandro;

  DBMS_OUTPUT.PUT_LINE('Usuarios: gabriel=' || v_usr_gabriel || ', rutilo=' || v_usr_rutilo ||
                       ', grecia=' || v_usr_grecia || ', eugenio=' || v_usr_eugenio ||
                       ', elian=' || v_usr_elian || ', alejandro=' || v_usr_alejandro);


  -- ============================================================================
  -- 6. TAREAS
  -- ============================================================================
  INSERT INTO TAREAS (TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
                      ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO, FECHA_VENCIMIENTO, CREADO_EN, ACTUALIZADO_EN)
  VALUES ('Implementar login con JWT', 'Crear pantalla de login y endpoint de autenticación con JWT',
          v_est_pendiente, v_pri_alta, v_usr_gabriel, v_usr_rutilo,
          TO_DATE('2026-04-30','YYYY-MM-DD'), SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_login;

  INSERT INTO TAREAS (TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
                      ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO, FECHA_VENCIMIENTO, CREADO_EN, ACTUALIZADO_EN)
  VALUES ('Diseñar base de datos', 'Modelar entidades y relaciones en Oracle ADB',
          v_est_progreso, v_pri_media, v_usr_gabriel, v_usr_grecia,
          TO_DATE('2026-04-25','YYYY-MM-DD'), SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_bd;

  INSERT INTO TAREAS (TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
                      ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO, FECHA_VENCIMIENTO, CREADO_EN, ACTUALIZADO_EN)
  VALUES ('Configurar CI/CD pipeline', 'Pipeline de despliegue automático en OCI',
          v_est_pendiente, v_pri_media, v_usr_rutilo, v_usr_eugenio,
          TO_DATE('2026-05-10','YYYY-MM-DD'), SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_cicd;

  INSERT INTO TAREAS (TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
                      ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO, FECHA_VENCIMIENTO, CREADO_EN, ACTUALIZADO_EN)
  VALUES ('Integrar bot de Telegram', 'Conectar el bot con los endpoints REST de la API',
          v_est_progreso, v_pri_alta, v_usr_gabriel, v_usr_elian,
          TO_DATE('2026-05-05','YYYY-MM-DD'), SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_telegram;

  INSERT INTO TAREAS (TITULO, DESCRIPCION, ID_ESTATUS, ID_PRIORIDAD,
                      ID_USUARIO_CREADOR, ID_USUARIO_ASIGNADO, FECHA_VENCIMIENTO, CREADO_EN, ACTUALIZADO_EN)
  VALUES ('Documentar API con Swagger', 'Crear documentación completa de todos los endpoints',
          v_est_completada, v_pri_baja, v_usr_rutilo, v_usr_alejandro,
          TO_DATE('2026-04-20','YYYY-MM-DD'), SYSDATE, SYSDATE)
  RETURNING ID_TAREA INTO v_tar_swagger;

  DBMS_OUTPUT.PUT_LINE('Tareas: login=' || v_tar_login || ', bd=' || v_tar_bd ||
                       ', cicd=' || v_tar_cicd || ', telegram=' || v_tar_telegram ||
                       ', swagger=' || v_tar_swagger);


  -- ============================================================================
  -- 7. MIEMBROS DE EQUIPOS
  -- ============================================================================
  INSERT INTO MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_alpha, v_usr_gabriel,   SYSDATE);
  INSERT INTO MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_alpha, v_usr_rutilo,    SYSDATE);
  INSERT INTO MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_alpha, v_usr_grecia,    SYSDATE);
  INSERT INTO MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_beta,  v_usr_eugenio,   SYSDATE);
  INSERT INTO MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_beta,  v_usr_elian,     SYSDATE);
  INSERT INTO MIEMBROS_EQUIPO (ID_EQUIPO, ID_USUARIO, SE_UNIO_EN) VALUES (v_eq_gamma, v_usr_alejandro, SYSDATE);
  DBMS_OUTPUT.PUT_LINE('Miembros de equipo insertados: 6');


  -- ============================================================================
  -- 8. COMENTARIOS EN TAREAS
  -- ============================================================================
  INSERT INTO COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN)
  VALUES (v_tar_login, v_usr_rutilo, 'Empece con la estructura base del JWT. Usamos RS256 o HS256?', SYSDATE);

  INSERT INTO COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN)
  VALUES (v_tar_login, v_usr_gabriel, 'Usamos HS256 con refresh token de 7 dias y access token de 1 hora.', SYSDATE);

  INSERT INTO COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN)
  VALUES (v_tar_bd, v_usr_grecia, 'El diagrama ER esta listo. Necesitamos revisar las constraints.', SYSDATE);

  INSERT INTO COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN)
  VALUES (v_tar_telegram, v_usr_elian, 'Bot conectado. Falta implementar los comandos /done y /list.', SYSDATE);

  INSERT INTO COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN)
  VALUES (v_tar_cicd, v_usr_eugenio, 'Pipeline configurado en GitHub Actions. Falta el deploy a OCI.', SYSDATE);

  INSERT INTO COMENTARIOS_TAREA (ID_TAREA, ID_USUARIO_AUTOR, CUERPO, CREADO_EN)
  VALUES (v_tar_swagger, v_usr_alejandro, 'Documentacion completada y desplegada en /swagger-ui.html.', SYSDATE);

  DBMS_OUTPUT.PUT_LINE('Comentarios insertados: 6');


  -- ============================================================================
  -- 9. EVIDENCIAS DE TAREAS
  -- ============================================================================
  INSERT INTO EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN)
  VALUES (v_tar_login, v_usr_rutilo,
          'https://storage.oracle.com/evidencias/login-jwt-screenshot.png',
          'Captura del login funcionando con token valido', SYSDATE);

  INSERT INTO EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN)
  VALUES (v_tar_bd, v_usr_grecia,
          'https://storage.oracle.com/evidencias/diagrama_er_v2.png',
          'Diagrama ER version 2.0 revisado', SYSDATE);

  INSERT INTO EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN)
  VALUES (v_tar_cicd, v_usr_eugenio,
          'https://storage.oracle.com/evidencias/pipeline-success.png',
          'Build verde en GitHub Actions', SYSDATE);

  INSERT INTO EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN)
  VALUES (v_tar_telegram, v_usr_elian,
          'https://storage.oracle.com/evidencias/bot-telegram-demo.mp4',
          'Video del bot respondiendo comandos', SYSDATE);

  INSERT INTO EVIDENCIAS_TAREA (ID_TAREA, ID_USUARIO_SUBIO, URL_ARCHIVO, NOTA, CREADO_EN)
  VALUES (v_tar_swagger, v_usr_alejandro,
          'https://storage.oracle.com/evidencias/swagger-docs.pdf',
          'PDF exportado de la documentacion Swagger completa', SYSDATE);

  DBMS_OUTPUT.PUT_LINE('Evidencias insertadas: 5');


  -- ============================================================================
  -- 10. LOGS DE CAMBIOS EN TAREAS
  -- ============================================================================
  INSERT INTO LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN)
  VALUES (v_tar_login, v_usr_gabriel, v_est_pendiente, v_est_progreso,
          'Tarea iniciada por el equipo', SYSDATE);

  INSERT INTO LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN)
  VALUES (v_tar_bd, v_usr_grecia, v_est_pendiente, v_est_progreso,
          'Inicio de diseno de esquema de base de datos', SYSDATE);

  INSERT INTO LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN)
  VALUES (v_tar_swagger, v_usr_alejandro, v_est_progreso, v_est_completada,
          'Documentacion finalizada y aprobada', SYSDATE);

  INSERT INTO LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN)
  VALUES (v_tar_cicd, v_usr_eugenio, v_est_pendiente, v_est_progreso,
          'Pipeline base configurado, falta integracion con OCI', SYSDATE);

  INSERT INTO LOGS_TAREA (ID_TAREA, ID_USUARIO, ID_ESTATUS_ORIGEN, ID_ESTATUS_DESTINO, MENSAJE, CREADO_EN)
  VALUES (v_tar_telegram, v_usr_elian, v_est_pendiente, v_est_progreso,
          'Bot registrado y conectado a los endpoints', SYSDATE);

  DBMS_OUTPUT.PUT_LINE('Logs insertados: 5');


  -- ============================================================================
  -- COMMIT FINAL
  -- ============================================================================
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('===== SCRIPT COMPLETADO EXITOSAMENTE =====');

EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('ERROR: ' || SQLERRM);
    RAISE;
END;
/


-- ============================================================================
-- VERIFICACION FINAL (ejecutar después del bloque PL/SQL)
-- ============================================================================
SELECT 'ROLES'             AS TABLA, COUNT(*) AS TOTAL FROM ROLES             UNION ALL
SELECT 'ESTATUS_TAREA',              COUNT(*)           FROM ESTATUS_TAREA    UNION ALL
SELECT 'PRIORIDAD_TAREA',            COUNT(*)           FROM PRIORIDAD_TAREA  UNION ALL
SELECT 'EQUIPOS',                    COUNT(*)           FROM EQUIPOS           UNION ALL
SELECT 'USUARIOS',                   COUNT(*)           FROM USUARIOS          UNION ALL
SELECT 'TAREAS',                     COUNT(*)           FROM TAREAS            UNION ALL
SELECT 'MIEMBROS_EQUIPO',            COUNT(*)           FROM MIEMBROS_EQUIPO   UNION ALL
SELECT 'COMENTARIOS_TAREA',          COUNT(*)           FROM COMENTARIOS_TAREA UNION ALL
SELECT 'EVIDENCIAS_TAREA',           COUNT(*)           FROM EVIDENCIAS_TAREA  UNION ALL
SELECT 'LOGS_TAREA',                 COUNT(*)           FROM LOGS_TAREA;

-- RESULTADO ESPERADO:
-- ROLES              2
-- ESTATUS_TAREA      3
-- PRIORIDAD_TAREA    3
-- EQUIPOS            3
-- USUARIOS           6
-- TAREAS             5
-- MIEMBROS_EQUIPO    6
-- COMENTARIOS_TAREA  6
-- EVIDENCIAS_TAREA   5
-- LOGS_TAREA         5


-- ============================================================================
-- IDs GENERADOS (ejecutar para saber qué IDs quedaron en la BD)
-- ============================================================================
SELECT 'gabriel.admin' AS USUARIO, ID_USUARIO FROM USUARIOS WHERE NOMBRE_USUARIO = 'gabriel.admin' UNION ALL
SELECT 'rutilo.dev',               ID_USUARIO FROM USUARIOS WHERE NOMBRE_USUARIO = 'rutilo.dev'    UNION ALL
SELECT 'grecia.dev',               ID_USUARIO FROM USUARIOS WHERE NOMBRE_USUARIO = 'grecia.dev'    UNION ALL
SELECT 'eugenio.dev',              ID_USUARIO FROM USUARIOS WHERE NOMBRE_USUARIO = 'eugenio.dev'   UNION ALL
SELECT 'elian.dev',                ID_USUARIO FROM USUARIOS WHERE NOMBRE_USUARIO = 'elian.dev'     UNION ALL
SELECT 'alejandro.dev',            ID_USUARIO FROM USUARIOS WHERE NOMBRE_USUARIO = 'alejandro.dev';
