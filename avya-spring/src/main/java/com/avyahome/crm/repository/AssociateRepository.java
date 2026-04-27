package com.avyahome.crm.repository;

import com.avyahome.crm.entity.Associate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssociateRepository extends JpaRepository<Associate, Integer> {

    Optional<Associate> findByMobile(String mobile);

    boolean existsByMobile(String mobile);
    boolean existsByEmail(String email);

    @Query("""
        SELECT a FROM Associate a
        WHERE (:search IS NULL OR a.name LIKE %:search% OR a.mobile LIKE %:search% OR a.associateCode LIKE %:search%)
          AND (:status IS NULL OR a.status = :status)
          AND (:role IS NULL OR a.role = :role)
        """)
    Page<Associate> findAllFiltered(
        @Param("search") String search,
        @Param("status") Associate.AssociateStatus status,
        @Param("role") Associate.Role role,
        Pageable pageable
    );

    List<Associate> findBySponsorId(Integer sponsorId);

    @Query("SELECT MAX(a.associateCode) FROM Associate a WHERE a.associateCode LIKE :prefix%")
    Optional<String> findMaxCodeByPrefix(@Param("prefix") String prefix);
}
