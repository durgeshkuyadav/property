package com.avyahome.crm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootApplication
public class AvyaHomeCrmApplication {
    public static void main(String[] args) {

        // ── TEMPORARY: print correct hash ──────────────────────
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        String hash = encoder.encode("Admin@123");
        System.out.println("\n\n");
        System.out.println("╔══════════════════════════════════════════════════════════════╗");
        System.out.println("  HASH FOR Admin@123 (copy this into MySQL):");
        System.out.println("  " + hash);
        System.out.println("  Length: " + hash.length());
        System.out.println("╚══════════════════════════════════════════════════════════════╝");
        System.out.println("\n");
        // ── END TEMPORARY ──────────────────────────────────────

        SpringApplication.run(AvyaHomeCrmApplication.class, args);
    }
}