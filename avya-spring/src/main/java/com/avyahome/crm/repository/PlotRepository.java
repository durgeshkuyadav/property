package com.avyahome.crm.repository;

import com.avyahome.crm.entity.Plot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PlotRepository extends JpaRepository<Plot, Integer> {

    boolean existsByProjectIdAndPlotNumber(Integer projectId, String plotNumber);

    @Query("""
        SELECT p FROM Plot p JOIN p.project pr
        WHERE (:projectId IS NULL OR pr.id = :projectId)
          AND (:status IS NULL OR p.status = :status)
          AND (:blockCode IS NULL OR p.blockCode = :blockCode)
        """)
    Page<Plot> findAllFiltered(
        @Param("projectId") Integer projectId,
        @Param("status") Plot.PlotStatus status,
        @Param("blockCode") String blockCode,
        Pageable pageable
    );

    @Query("SELECT p.status, COUNT(p) FROM Plot p GROUP BY p.status")
    List<Object[]> countByStatus();

    @Query("SELECT DISTINCT p.blockCode FROM Plot p WHERE p.project.id = :projectId AND p.blockCode IS NOT NULL")
    List<String> findDistinctBlockCodes(@Param("projectId") Integer projectId);
}
