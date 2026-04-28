package com.avyahome.crm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootApplication
public class AvyaHomeCrmApplication {
    public static void main(String[] args) {
        SpringApplication.run(AvyaHomeCrmApplication.class, args);
    }
}