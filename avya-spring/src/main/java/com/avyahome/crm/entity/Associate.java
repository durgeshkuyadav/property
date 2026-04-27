package com.avyahome.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "associates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Associate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "associate_code", nullable = false, unique = true, length = 20)
    private String associateCode;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 15)
    private String mobile;

    @Column(unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sponsor_id")
    private Associate sponsor;

    @Column(name = "commission_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionPct = BigDecimal.valueOf(5.00);

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.associate;

    @Column(name = "father_name", length = 100)
    private String fatherName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "anniversary_date")
    private LocalDate anniversaryDate;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Column(name = "marital_status", length = 30)
    private String maritalStatus;

    @Column(name = "current_occupation", length = 100)
    private String currentOccupation;

    @Column(name = "work_company", length = 150)
    private String workCompany;

    @Column(name = "pan_number", length = 20)
    private String panNumber;

    @Column(name = "aadhar_number", length = 20)
    private String aadharNumber;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "profile_photo")
    private String profilePhoto;

    // Nominee
    @Column(name = "nominee_name", length = 100)
    private String nomineeName;

    @Column(name = "nominee_relation", length = 50)
    private String nomineeRelation;

    @Column(name = "nominee_age")
    private Integer nomineeAge;

    @Column(name = "nominee_mobile", length = 15)
    private String nomineeMobile;

    @Enumerated(EnumType.STRING)
    @Column(name = "nominee_gender")
    private Gender nomineeGender;

    // Bank
    @Column(name = "bank_account_no", length = 30)
    private String bankAccountNo;

    @Column(name = "bank_ifsc", length = 20)
    private String bankIfsc;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_branch", length = 100)
    private String bankBranch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssociateStatus status = AssociateStatus.active;

    @Column(name = "email_verified")
    private Boolean emailVerified = false;

    @Column(name = "mobile_verified")
    private Boolean mobileVerified = false;

    @Column(name = "joining_date", nullable = false)
    private LocalDate joiningDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Role { super_admin, manager, associate, sub_associate }
    public enum AssociateStatus { active, inactive, suspended }
    public enum Gender { Male, Female, Other }
}
