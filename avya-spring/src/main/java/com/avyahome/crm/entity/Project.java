package com.avyahome.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "projects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "project_name", nullable = false, unique = true, length = 150)
    private String projectName;

    @Column(length = 200)
    private String location;

    @Column(name = "total_area", precision = 12, scale = 2)
    private BigDecimal totalArea;

    @Column(name = "total_plots")
    private Integer totalPlots = 0;

    @Column(name = "base_price_sqft", precision = 10, scale = 2)
    private BigDecimal basePriceSqft;

    @Column(name = "launch_date")
    private LocalDate launchDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status = ProjectStatus.active;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private Associate createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ProjectStatus { active, completed, archived }
}
