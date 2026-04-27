package com.avyahome.crm.config;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.repository.AssociateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final AssociateRepository associateRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.mobile:9999999999}")
    private String adminMobile;

    @Value("${app.admin.password:Admin@123}")
    private String adminPassword;

    @Value("${app.admin.name:Avya Home Admin}")
    private String adminName;

    @Value("${app.admin.email:admin@avyahome.com}")
    private String adminEmail;

    @Override
    public void run(ApplicationArguments args) {
        // Only create admin if no super_admin exists
        boolean adminExists = associateRepository.findByMobile(adminMobile).isPresent();
        if (adminExists) {
            log.info("Admin already exists — skipping seed");
            return;
        }

        Associate admin = Associate.builder()
                .associateCode("AH00001")
                .name(adminName)
                .mobile(adminMobile)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role(Associate.Role.super_admin)
                .commissionPct(BigDecimal.ZERO)
                .status(Associate.AssociateStatus.active)
                .joiningDate(LocalDate.now())
                .build();

        associateRepository.save(admin);
        log.info("✅ Super admin created — mobile: {} password: {}", adminMobile, adminPassword);
    }
}