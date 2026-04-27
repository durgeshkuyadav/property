package com.avyahome.crm.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateProfileRequest {
    @Size(min = 2, message = "Name too short")
    private String name;

    @Email(message = "Invalid email")
    private String email;

    private String fatherName;
    private LocalDate dateOfBirth;
    private LocalDate anniversaryDate;
    private String gender;
    private String maritalStatus;
    private String currentOccupation;
    private String workCompany;
    private String address;

    @Pattern(regexp = "^[A-Z]{5}[0-9]{4}[A-Z]{1}$", message = "Invalid PAN format")
    private String panNumber;

    private String aadharNumber;
    private String nomineeName;
    private String nomineeRelation;
    private Integer nomineeAge;
    private String nomineeMobile;
    private String nomineeGender;

    @Size(min = 9, max = 18, message = "Invalid account number")
    private String bankAccountNo;

    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "Invalid IFSC code")
    private String bankIfsc;

    private String bankName;
    private String bankBranch;
}
