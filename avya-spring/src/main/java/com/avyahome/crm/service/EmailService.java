package com.avyahome.crm.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.company.name}")
    private String companyName;

    @Value("${spring.mail.username}")
    private String from;

    @Async
    public void sendWelcomeEmail(String to, String name, String associateCode) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject("Welcome to " + companyName + " — Associate ID: " + associateCode);
            msg.setText("""
                Dear %s,

                Welcome to %s! Your associate account has been created.

                Associate ID : %s
                
                Please log in and change your password at your earliest convenience.

                Thank you for joining us!

                — %s Team
                """.formatted(name, companyName, associateCode, companyName));
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send welcome email to {}: {}", to, e.getMessage());
        }
    }

    @Async
    public void sendOtpEmail(String to, String name, String otp) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject(companyName + " — Password Reset OTP");
            msg.setText("""
                Dear %s,

                Your OTP for password reset is: %s

                This OTP is valid for 10 minutes. Do not share it with anyone.

                If you did not request this, please ignore this email.

                — %s Team
                """.formatted(name, otp, companyName));
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", to, e.getMessage());
        }
    }
}
