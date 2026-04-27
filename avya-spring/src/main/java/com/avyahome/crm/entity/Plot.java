package com.avyahome.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "plots",
    uniqueConstraints = @UniqueConstraint(name = "unique_plot", columnNames = {"project_id", "plot_number"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Plot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "plot_number", nullable = false, length = 20)
    private String plotNumber;

    @Column(name = "block_code", length = 30)
    private String blockCode;

    @Column(name = "dimension_sqft", nullable = false, precision = 10, scale = 4)
    private BigDecimal dimensionSqft;

    @Column(name = "plot_category", length = 100)
    private String plotCategory;

    @Column(name = "plot_facing", length = 50)
    private String plotFacing;

    @Column(name = "bsp_per_sqft", nullable = false, precision = 10, scale = 2)
    private BigDecimal bspPerSqft;

    /** Computed: dimensionSqft * bspPerSqft — DB has GENERATED ALWAYS column; read-only in Java */
    @Column(name = "total_price", insertable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "plc_charges", precision = 10, scale = 2)
    private BigDecimal plcCharges = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlotStatus status = PlotStatus.available;

    @Column(name = "status_updated_at")
    private LocalDateTime statusUpdatedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum PlotStatus { available, hold, booked, sold_out }
}
