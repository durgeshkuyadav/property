package com.avyahome.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payout_payments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PayoutPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_id", nullable = false)
    private Payout payout;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "associate_id", nullable = false)
    private Associate associate;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_of_pay", nullable = false)
    private ModeOfPay modeOfPay = ModeOfPay.neft;

    @Column(name = "ref_number", length = 100)
    private String refNumber;

    @Column(name = "ref_info", length = 100)
    private String refInfo;

    @Column(name = "ref_date")
    private LocalDate refDate;

    @Column(name = "tds_status")
    private Boolean tdsStatus = true;

    @Column(name = "gross_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "tds_deducted", precision = 12, scale = 2)
    private BigDecimal tdsDeducted = BigDecimal.ZERO;

    @Column(name = "net_paid", nullable = false, precision = 12, scale = 2)
    private BigDecimal netPaid;

    @Column(length = 200)
    private String remark;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private Associate createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum ModeOfPay { rtgs, neft, imps, cheque }
}
