package com.avyahome.crm.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter valid 10-digit mobile number")
    private String mobile;

    @NotBlank(message = "Password is required")
    private String password;
}
