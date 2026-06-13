package com.springboot.MyTodoList.config;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.persistence.EntityNotFoundException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Intercepts exceptions thrown by any controller and maps them to structured
 * JSON error responses; prevents internal stack traces from reaching the client.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Maps Bean Validation failures (triggered by {@code @Valid}) to a 400 response
     * containing a per-field breakdown of constraint violation messages.
     *
     * @param ex the validation exception carrying one or more field errors
     * @return HTTP 400 with a {@code fields} map from field name to error message
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 400);
        body.put("error", "Validation failed");
        body.put("fields", ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        org.springframework.validation.FieldError::getField,
                        org.springframework.validation.FieldError::getDefaultMessage,
                        (a, b) -> b
                )));
        return ResponseEntity.badRequest().body(body);
    }

    /**
     * Inspects the root-cause message for Oracle-specific error codes and returns
     * a 409 with a human-readable description; covers FK violations (ORA-02292)
     * and unique-constraint violations (ORA-00001).
     *
     * @param ex the data integrity exception thrown by the JPA layer
     * @return HTTP 409 with an {@code error} field describing the constraint that was violated
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(
            DataIntegrityViolationException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 409);
        String msg = ex.getMostSpecificCause().getMessage();
        if (msg != null && msg.contains("ORA-02292")) {
            body.put("error", "Cannot delete: record has dependent relationships");
        } else if (msg != null && msg.contains("ORA-00001")) {
            body.put("error", "Duplicate value violates unique constraint");
        } else {
            body.put("error", "Data integrity violation");
        }
        return ResponseEntity.status(409).body(body);
    }

    /**
     * Returns a 404 using the exception message as the error description,
     * falling back to a generic phrase when the message is absent.
     *
     * @param ex the not-found exception thrown by the service or persistence layer
     * @return HTTP 404 with an {@code error} field containing the descriptive message
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            EntityNotFoundException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 404);
        body.put("error", ex.getMessage() != null ? ex.getMessage() : "Resource not found");
        return ResponseEntity.status(404).body(body);
    }

    /**
     * Catches any exception not handled by a more specific handler and returns a 500
     * without leaking internal details to the client.
     *
     * @param ex the unhandled exception
     * @return HTTP 500 with a generic {@code error} field
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 500);
        body.put("error", "Internal server error");
        return ResponseEntity.status(500).body(body);
    }
}
