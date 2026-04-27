package com.avyahome.crm.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @Pattern(regexp = "^[6-9]\\d{9}$")
    private String mobile;

    @Size(min = 6, max = 6)
    @Pattern(regexp = "\\d{6}", message = "Enter valid 6-digit OTP")
    private String otp;

    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
        message = "Must contain uppercase, lowercase and number")
    private String newPassword;
}
