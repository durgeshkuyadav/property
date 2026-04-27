package com.avyahome.crm.repository;

import com.avyahome.crm.entity.Payout;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PayoutRepository extends JpaRepository<Payout, Integer> {

    @Query("""
        SELECT p FROM Payout p
        WHERE (:associateId IS NULL OR p.associate.id = :associateId)
          AND (:status IS NULL OR p.status = :status)
        """)
    Page<Payout> findAllFiltered(
        @Param("associateId") Integer associateId,
        @Param("status") Payout.PayoutStatus status,
        Pageable pageable
    );

    @Query("SELECT MAX(p.payoutCode) FROM Payout p WHERE p.payoutCode LIKE 'PAY%'")
    Optional<String> findMaxPayoutCode();

    @Query("""
        SELECT COALESCE(SUM(p.netPayable), 0), COALESCE(SUM(p.tdsAmount), 0)
        FROM Payout p WHERE p.associate.id = :associateId AND p.status = 'paid'
        """)
    List<Object[]> getPaidTotals(@Param("associateId") Integer associateId);
}
