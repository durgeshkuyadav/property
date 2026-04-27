package com.avyahome.crm.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        // JWT Bearer Auth scheme
        SecurityScheme bearerScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .name("Authorization")
                .description("Enter your JWT access token (without 'Bearer ' prefix)");

        SecurityRequirement securityRequirement = new SecurityRequirement()
                .addList("Bearer Authentication");

        return new OpenAPI()
                .info(new Info()
                        .title("Avya Home CRM API")
                        .description("""
                    REST API for Avya Home CRM — Associate management, Plot booking,
                    Customer management, Payouts, Dashboard and PDF generation.
                    
                    **How to authenticate:**
                    1. Call `POST /api/auth/login` with mobile + password
                    2. Copy the `accessToken` from the response
                    3. Click **Authorize** button above → paste the token
                    """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Avya Home Private Limited")
                                .email("info@avyahome.com"))
                        .license(new License()
                                .name("Private")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local Development"),
                        new Server().url("http://localhost:5000").description("Local Alt Port")
                ))
                .components(new Components()
                        .addSecuritySchemes("Bearer Authentication", bearerScheme))
                .addSecurityItem(securityRequirement);
    }
}