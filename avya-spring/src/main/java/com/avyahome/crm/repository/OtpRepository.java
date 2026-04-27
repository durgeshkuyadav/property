package com.avyahome.crm.repository;

import com.avyahome.crm.entity.Otp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OtpRepository extends JpaRepository<Otp, Integer> {

    Optional<Otp> findTopByMobileAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
        String mobile, Otp.OtpPurpose purpose, LocalDateTime now
    );

    @Modifying
    @Query("UPDATE Otp o SET o.isUsed = true WHERE o.mobile = :mobile AND o.purpose = :purpose")
    void invalidateAll(@Param("mobile") String mobile, @Param("purpose") Otp.OtpPurpose purpose);
}
