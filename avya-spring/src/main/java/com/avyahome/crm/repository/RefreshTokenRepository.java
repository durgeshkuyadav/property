package com.avyahome.crm.repository;

import com.avyahome.crm.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Integer> {

    Optional<RefreshToken> findByTokenHashAndIsRevokedFalseAndExpiresAtAfter(
        String tokenHash, LocalDateTime now
    );

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.isRevoked = true WHERE rt.associate.id = :associateId")
    void revokeAllByAssociateId(@Param("associateId") Integer associateId);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.isRevoked = true WHERE rt.tokenHash = :hash")
    void revokeByHash(@Param("hash") String hash);
}
