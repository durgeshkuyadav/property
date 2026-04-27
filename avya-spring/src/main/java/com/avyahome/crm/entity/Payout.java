package com.avyahome.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payouts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "payout_code", nullable = false, unique = true, length = 20)
    private String payoutCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "associate_id", nullable = false)
    private Associate associate;

    @Column(name = "from_date", nullable = false)
    private LocalDate fromDate;

    @Column(name = "to_date", nullable = false)
    private LocalDate toDate;

    @Column(name = "self_income", precision = 12, scale = 2)
    private BigDecimal selfIncome = BigDecimal.ZERO;

    @Column(name = "level_income", precision = 12, scale = 2)
    private BigDecimal levelIncome = BigDecimal.ZERO;

    @Column(name = "leadership_income", precision = 12, scale = 2)
    private BigDecimal leadershipIncome = BigDecimal.ZERO;

    @Column(name = "royalty_income", precision = 12, scale = 2)
    private BigDecimal royaltyIncome = BigDecimal.ZERO;

    @Column(name = "advance_bonus", precision = 12, scale = 2)
    private BigDecimal advanceBonus = BigDecimal.ZERO;

    @Column(name = "monthly_bonus", precision = 12, scale = 2)
    private BigDecimal monthlyBonus = BigDecimal.ZERO;

    @Column(name = "total_income", precision = 12, scale = 2)
    private BigDecimal totalIncome = BigDecimal.ZERO;

    @Column(name = "admin_charge", precision = 12, scale = 2)
    private BigDecimal adminCharge = BigDecimal.ZERO;

    @Column(name = "tds_percentage", precision = 5, scale = 2)
    private BigDecimal tdsPercentage = BigDecimal.valueOf(5.00);

    @Column(name = "tds_amount", precision = 12, scale = 2)
    private BigDecimal tdsAmount = BigDecimal.ZERO;

    @Column(name = "net_payable", precision = 12, scale = 2)
    private BigDecimal netPayable = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PayoutStatus status = PayoutStatus.pending;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private Associate approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private Associate createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum PayoutStatus { pending, approved, paid, cancelled }
}
