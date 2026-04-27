package com.avyahome.crm.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateAssociateRequest {

    @NotBlank
    @Size(min = 2, max = 100)
    private String name;

    @NotBlank
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter valid 10-digit mobile number")
    private String mobile;

    private String email;

    @NotBlank
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
        message = "Must contain uppercase, lowercase and number")
    private String password;

    @DecimalMin("0") @DecimalMax("100")
    private Double commissionPct;

    @Pattern(regexp = "manager|associate|sub_associate", message = "Invalid role")
    private String role;

    private Integer sponsorId;
}
