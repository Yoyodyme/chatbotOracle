package com.springboot.MyTodoList.service;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

import com.springboot.MyTodoList.model.User;
import com.springboot.MyTodoList.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Arrays;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService service;

    @Test
    void testFindAll_returnsUsers() {
        User user = new User();
        user.setID(1);
        user.setName("Nombre");
        user.setLastname("Apellido");

        when(userRepository.findAll()).thenReturn(Arrays.asList(user));

        assertEquals(1, service.findAll().size());
        verify(userRepository, times(1)).findAll();
    }

    @Test
    void testGetUserById_found_returnsOk() {
        User user = new User();
        user.setID(2);
        user.setName("John");
        user.setLastname("Doe");

        when(userRepository.findById(2)).thenReturn(Optional.of(user));

        assertEquals(HttpStatus.OK, service.getUserById(2).getStatusCode());
        assertEquals(2, service.getUserById(2).getBody().getID());
    }

    @Test
    void testGetUserById_notFound_returnsNotFound() {
        when(userRepository.findById(3)).thenReturn(Optional.empty());

        assertEquals(HttpStatus.NOT_FOUND, service.getUserById(3).getStatusCode());
    }

    @Test
    void testAddUser_savesUser() {
        User user = new User();
        user.setID(4);
        user.setName("Ana");
        user.setLastname("Lopez");
        user.setPhonenumber(1234567890L);
        user.setUserpassword("pwd");

        when(userRepository.save(user)).thenReturn(user);

        User resultado = service.addUser(user);

        assertNotNull(resultado);
        assertEquals("Ana", resultado.getName());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void testUpdateUser_updatesExisting() {
        User existing = new User();
        existing.setID(5);
        existing.setName("Old");
        existing.setLastname("Name");
        existing.setPhonenumber(987654321L);
        existing.setUserpassword("oldpwd");

        User updated = new User();
        updated.setName("New");
        updated.setLastname("Name");
        updated.setPhoneNumber(111222333L);
        updated.setUserPassword("newpwd");

        when(userRepository.findById(5)).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);

        User resultado = service.updateUser(5, updated);

        assertNotNull(resultado);
        assertEquals("New", resultado.getName());
        assertEquals(111222333L, resultado.getPhoneNumber());
        assertEquals("newpwd", resultado.getUserPassword());
        verify(userRepository, times(1)).findById(5);
        verify(userRepository, times(1)).save(existing);
    }

    @Test
    void testDeleteUser_existing_returnsTrue() {
        doNothing().when(userRepository).deleteById(6);

        assertTrue(service.deleteUser(6));
        verify(userRepository, times(1)).deleteById(6);
    }
}
