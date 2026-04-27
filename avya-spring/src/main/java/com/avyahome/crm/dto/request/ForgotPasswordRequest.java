package com.avyahome.crm.dto.request;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter valid 10-digit mobile number")
    private String mobile;
}
