package com.avyahome.crm.service;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.entity.Plot;
import com.avyahome.crm.entity.Project;
import com.avyahome.crm.repository.PlotRepository;
import com.avyahome.crm.repository.ProjectRepository;
import com.avyahome.crm.util.AuditService;
import com.avyahome.crm.util.ResponseUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PlotService {

    private final PlotRepository plotRepo;
    private final ProjectRepository projectRepo;
    private final AuditService auditService;

    @PersistenceContext
    private EntityManager em;

    // ── Summary ─────────────────────────────────────────────────────────────

    public Map<String, Object> getStatusSummary() {
        List<Object[]> rows = plotRepo.countByStatus();
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("available", 0L);
        counts.put("hold", 0L);
        counts.put("booked", 0L);
        counts.put("sold_out", 0L);
        long total = 0;
        for (Object[] r : rows) {
            String s = ((Plot.PlotStatus) r[0]).name();
            long c = (Long) r[1];
            counts.put(s, c);
            total += c;
        }
        Map<String, Object> result = new LinkedHashMap<>(counts);
        result.put("total", total);
        return result;
    }

    public Map<String, Object> getFilterOptions(Integer projectId) {
        List<String> categories = em.createQuery(
            "SELECT DISTINCT p.plotCategory FROM Plot p WHERE (:pid IS NULL OR p.project.id = :pid) AND p.plotCategory IS NOT NULL ORDER BY p.plotCategory",
            String.class).setParameter("pid", projectId).getResultList();

        List<BigDecimal> dimensions = em.createQuery(
            "SELECT DISTINCT p.dimensionSqft FROM Plot p WHERE (:pid IS NULL OR p.project.id = :pid) AND p.dimensionSqft IS NOT NULL ORDER BY p.dimensionSqft",
            BigDecimal.class).setParameter("pid", projectId).getResultList();

        List<String> blocks = em.createQuery(
            "SELECT DISTINCT p.blockCode FROM Plot p WHERE (:pid IS NULL OR p.project.id = :pid) AND p.blockCode IS NOT NULL ORDER BY p.blockCode",
            String.class).setParameter("pid", projectId).getResultList();

        List<String> facings = em.createQuery(
            "SELECT DISTINCT p.plotFacing FROM Plot p WHERE (:pid IS NULL OR p.project.id = :pid) AND p.plotFacing IS NOT NULL ORDER BY p.plotFacing",
            String.class).setParameter("pid", projectId).getResultList();

        return Map.of(
            "categories", categories,
            "dimensions", dimensions,
            "blocks", blocks,
            "facings", facings
        );
    }

    // ── CRUD ────────────────────────────────────────────────────────────────

    public ResponseEntity<Map<String, Object>> getAll(
        Integer projectId, String statusStr, String blockCode, int page, int limit
    ) {
        Plot.PlotStatus status = statusStr != null ? Plot.PlotStatus.valueOf(statusStr) : null;
        PageRequest pageable = PageRequest.of(page - 1, limit, Sort.by("plotNumber").ascending());
        Page<Plot> result = plotRepo.findAllFiltered(projectId, status, blockCode, pageable);
        return ResponseUtil.paginated(result.getContent(), result.getTotalElements(), page, limit, "Success");
    }

    public Plot getOne(Integer id) {
        return plotRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body, Associate me, HttpServletRequest httpReq) {
        Integer projectId = (Integer) body.get("project_id");
        String plotNumber = (String) body.get("plot_number");

        if (projectId == null || plotNumber == null ||
            body.get("dimension_sqft") == null || body.get("bsp_per_sqft") == null) {
            throw new RuntimeException("VALIDATION");
        }

        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new RuntimeException("NOT_FOUND"));

        if (plotRepo.existsByProjectIdAndPlotNumber(projectId, plotNumber.trim()))
            throw new RuntimeException("PLOT_ALREADY_EXISTS");

        Plot p = buildPlot(body, project);
        plotRepo.save(p);
        updateProjectPlotCount(projectId);
        auditService.log(me, "CREATE_PLOT", "plot", p.getId(), null, body, httpReq);
        return Map.of("id", p.getId(), "plot_number", p.getPlotNumber());
    }

    @Transactional
    public Map<String, Object> bulkCreate(Map<String, Object> body, Associate me, HttpServletRequest httpReq) {
        Integer projectId = (Integer) body.get("project_id");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> plots = (List<Map<String, Object>>) body.get("plots");

        if (projectId == null || plots == null || plots.isEmpty())
            throw new RuntimeException("VALIDATION");
        if (plots.size() > 500) throw new RuntimeException("VALIDATION");

        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new RuntimeException("NOT_FOUND"));

        int created = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        for (Map<String, Object> plotData : plots) {
            try {
                String pn = String.valueOf(plotData.get("plot_number")).trim();
                if (plotData.get("dimension_sqft") == null || plotData.get("bsp_per_sqft") == null) {
                    errors.add("Row skipped: missing required fields for plot " + pn);
                    skipped++;
                    continue;
                }
                if (plotRepo.existsByProjectIdAndPlotNumber(projectId, pn)) { skipped++; continue; }
                Plot p = buildPlot(plotData, project);
                plotRepo.save(p);
                created++;
            } catch (Exception e) {
                errors.add("Plot " + plotData.get("plot_number") + ": " + e.getMessage());
                skipped++;
            }
        }

        updateProjectPlotCount(projectId);
        auditService.log(me, "BULK_CREATE_PLOTS", "plot", null, null,
            Map.of("project_id", projectId, "created", created, "skipped", skipped), httpReq);

        return Map.of("created", created, "skipped", skipped, "errors", errors);
    }

    @Transactional
    public void update(Integer id, Map<String, Object> body, Associate me, HttpServletRequest httpReq) {
        Plot p = getOne(id);
        Map<String, Object> old = Map.of("status", p.getStatus(), "bsp", p.getBspPerSqft());

        if (body.containsKey("block_code"))     p.setBlockCode((String) body.get("block_code"));
        if (body.containsKey("plot_category"))  p.setPlotCategory((String) body.get("plot_category"));
        if (body.containsKey("plot_facing"))    p.setPlotFacing((String) body.get("plot_facing"));
        if (body.containsKey("bsp_per_sqft"))   p.setBspPerSqft(toBD(body.get("bsp_per_sqft")));
        if (body.containsKey("plc_charges"))    p.setPlcCharges(toBD(body.get("plc_charges")));
        if (body.containsKey("dimension_sqft")) p.setDimensionSqft(toBD(body.get("dimension_sqft")));

        plotRepo.save(p);
        auditService.log(me, "UPDATE_PLOT", "plot", id, old, body, httpReq);
    }

    @Transactional
    public void changeStatus(Integer id, String statusStr, Associate me, HttpServletRequest httpReq) {
        List<String> valid = List.of("available", "hold", "sold_out");
        if (!valid.contains(statusStr)) throw new RuntimeException("VALIDATION");

        Plot p = getOne(id);

        if ((p.getStatus() == Plot.PlotStatus.booked || p.getStatus() == Plot.PlotStatus.sold_out)) {
            Long activeCustomers = em.createQuery(
                "SELECT COUNT(c) FROM Customer c WHERE c.plot.id = :plotId AND c.status != 'cancelled'",
                Long.class).setParameter("plotId", id).getSingleResult();
            if (activeCustomers > 0) throw new RuntimeException("PLOT_NOT_AVAILABLE");
        }

        Map<String, Object> old = Map.of("status", p.getStatus());
        p.setStatus(Plot.PlotStatus.valueOf(statusStr));
        p.setStatusUpdatedAt(LocalDateTime.now());
        plotRepo.save(p);
        auditService.log(me, "CHANGE_PLOT_STATUS", "plot", id, old, Map.of("status", statusStr), httpReq);
    }

    @Transactional
    public void delete(Integer id, Associate me, HttpServletRequest httpReq) {
        Plot p = getOne(id);
        if (p.getStatus() == Plot.PlotStatus.booked || p.getStatus() == Plot.PlotStatus.sold_out)
            throw new RuntimeException("VALIDATION");
        Integer projectId = p.getProject().getId();
        plotRepo.delete(p);
        updateProjectPlotCount(projectId);
        auditService.log(me, "DELETE_PLOT", "plot", id, null, null, httpReq);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Plot buildPlot(Map<String, Object> body, Project project) {
        return Plot.builder()
            .project(project)
            .plotNumber(String.valueOf(body.get("plot_number")).trim())
            .blockCode((String) body.get("block_code"))
            .dimensionSqft(toBD(body.get("dimension_sqft")))
            .plotCategory((String) body.get("plot_category"))
            .plotFacing((String) body.get("plot_facing"))
            .bspPerSqft(toBD(body.get("bsp_per_sqft")))
            .plcCharges(body.get("plc_charges") != null ? toBD(body.get("plc_charges")) : BigDecimal.ZERO)
            .status(Plot.PlotStatus.available)
            .build();
    }

    private void updateProjectPlotCount(Integer projectId) {
        Long count = em.createQuery("SELECT COUNT(p) FROM Plot p WHERE p.project.id = :pid", Long.class)
            .setParameter("pid", projectId).getSingleResult();
        em.createQuery("UPDATE Project pr SET pr.totalPlots = :count WHERE pr.id = :pid")
            .setParameter("count", count.intValue()).setParameter("pid", projectId).executeUpdate();
    }

    private BigDecimal toBD(Object val) {
        if (val == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(((Number) val).doubleValue());
    }
}
