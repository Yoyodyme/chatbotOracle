package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.ToDoItem;
import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.service.ToDoItemService;
import com.springboot.MyTodoList.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
public class ToDoItemController {

    @Autowired
    private ToDoItemService toDoItemService;

    @Autowired
    private UsuarioService usuarioService;

    @GetMapping("/todolist")
    public List<ToDoItem> getAllToDoItems(@AuthenticationPrincipal Jwt jwt) {
        Usuario user = resolveUser(jwt);
        if (user == null) return toDoItemService.findAll();
        return toDoItemService.findByUsuarioAsignado(user.getIdUsuario());
    }

    @GetMapping("/todolist/{id}")
    public ResponseEntity<ToDoItem> getToDoItemById(
            @PathVariable int id,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            ResponseEntity<ToDoItem> response = toDoItemService.getItemById(id);
            ToDoItem item = response.getBody();
            if (item == null) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

            Usuario user = resolveUser(jwt);
            if (user != null && !isOwnedBy(item, user)) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
            return new ResponseEntity<>(item, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/todolist")
    public ResponseEntity<ToDoItem> addToDoItem(
            @RequestBody ToDoItem todoItem,
            @AuthenticationPrincipal Jwt jwt) throws Exception {
        Usuario user = resolveUser(jwt);
        if (user != null && todoItem.getTarea() != null) {
            todoItem.getTarea().setUsuarioCreador(user);
            todoItem.getTarea().setUsuarioAsignado(user);
        }
        ToDoItem td = toDoItemService.addToDoItem(todoItem);
        HttpHeaders headers = new HttpHeaders();
        headers.set("location", "" + td.getID());
        headers.set("Access-Control-Expose-Headers", "location");
        return ResponseEntity.ok().headers(headers).build();
    }

    @PutMapping("/todolist/{id}")
    public ResponseEntity<ToDoItem> updateToDoItem(
            @RequestBody ToDoItem toDoItem,
            @PathVariable int id,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            ToDoItem existing = toDoItemService.getItemById(id).getBody();
            if (existing == null) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

            Usuario user = resolveUser(jwt);
            if (user != null && !isOwnedBy(existing, user)) {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }

            ToDoItem updated = toDoItemService.updateToDoItem(id, toDoItem);
            return new ResponseEntity<>(updated, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/todolist/{id}")
    public ResponseEntity<Boolean> deleteToDoItem(
            @PathVariable int id,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            ToDoItem existing = toDoItemService.getItemById(id).getBody();
            if (existing == null) return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);

            Usuario user = resolveUser(jwt);
            if (user != null && !isOwnedBy(existing, user)) {
                return new ResponseEntity<>(false, HttpStatus.FORBIDDEN);
            }

            boolean deleted = toDoItemService.deleteToDoItem(id);
            return new ResponseEntity<>(deleted, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Resolves the authenticated user from the OCI IAM JWT sub claim.
     * Auto-registers the user in USUARIOS on their first web request.
     * Returns null when no JWT is present (local dev — no auth required).
     */
    private Usuario resolveUser(Jwt jwt) {
        if (jwt == null) return null;

        String sub = jwt.getSubject();
        if (sub == null) return null;

        Optional<Usuario> existing = usuarioService.buscarPorOciSubject(sub);
        if (existing.isPresent()) return existing.get();

        String username = jwt.getClaimAsString("preferred_username");
        if (username == null) username = sub;
        String name = jwt.getClaimAsString("name");
        if (name == null) name = username;

        return usuarioService.autoRegistrarDesdeOci(sub, username, name);
    }

    /**
     * Returns true if the item was assigned to or created by the given user.
     */
    private boolean isOwnedBy(ToDoItem item, Usuario user) {
        if (item.getTarea() == null) return false;
        Long uid = user.getIdUsuario();
        Usuario assignee = item.getTarea().getUsuarioAsignado();
        Usuario creator  = item.getTarea().getUsuarioCreador();
        return (assignee != null && uid.equals(assignee.getIdUsuario()))
            || (creator  != null && uid.equals(creator.getIdUsuario()));
    }
}
