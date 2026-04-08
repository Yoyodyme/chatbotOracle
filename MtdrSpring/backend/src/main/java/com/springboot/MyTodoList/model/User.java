package com.springboot.MyTodoList.model;

import jakarta.persistence.*;

@Entity
@Table(name = "USERS")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int ID;

    private String name;
    private String lastname;

    @Column(name = "PHONENUMBER")
    private Long phonenumber;

    @Column(name = "USERPASSWORD")
    private String userpassword;

    public User(){}

    public User(int ID, String name, String lastname) {
        this.ID = ID;
        this.name = name;
        this.lastname = lastname;
    }

    public User(int ID, Long phonenumber, String userpassword) {
        this.ID = ID;
        this.phonenumber = phonenumber;
        this.userpassword = userpassword;
    }

    public int getID() { return ID; }
    public void setID(int ID) { this.ID = ID; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLastname() { return lastname; }
    public void setLastname(String lastname) { this.lastname = lastname; }

    public Long getPhonenumber() { return phonenumber; }
    public Long getPhoneNumber() { return phonenumber; }
    public void setPhonenumber(Long phonenumber) { this.phonenumber = phonenumber; }
    public void setPhoneNumber(Long phonenumber) { this.phonenumber = phonenumber; }

    public String getUserpassword() { return userpassword; }
    public String getUserPassword() { return userpassword; }
    public void setUserpassword(String userpassword) { this.userpassword = userpassword; }
    public void setUserPassword(String userpassword) { this.userpassword = userpassword; }

    @Override
    public String toString() {
        return "User{" +
                "ID=" + ID +
                ", name='" + name + '\'' +
                ", lastname='" + lastname + '\'' +
                ", phonenumber=" + phonenumber +
                '}';
    }
}