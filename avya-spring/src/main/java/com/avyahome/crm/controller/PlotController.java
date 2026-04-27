package com.avyahome.crm.controller;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.service.PlotService;
import com.avyahome.crm.util.ResponseUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Mirrors plot.routes.js:
 *   GET    /api/plots/summary
 *   GET    /api/plots/filter-options
 *   GET    /api/plots
 *   GET    /api/plots/:id
 *   POST   /api/plots             (admin)
 *   POST   /api/plots/bulk        (admin)
 *   PUT    /api/plots/:id         (admin)
 *   PATCH  /api/plots/:id/status  (admin)
 *   DELETE /api/plots/:id         (superAdmin)
 */
@RestController
@RequestMapping("/api/plots")
@RequiredArgsConstructor
public class PlotController {

    private final PlotService plotService;

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        return ResponseUtil.success(plotService.getStatusSummary());
    }

    @GetMapping("/filter-options")
    public ResponseEntity<Map<String, Object>> filterOptions(@RequestParam(required = false) Integer projectId) {
        return ResponseUtil.success(plotService.getFilterOptions(projectId));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
        @RequestParam(required = false) Integer projectId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String blockCode,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "50") int limit
    ) {
        return plotService.getAll(projectId, status, blockCode, page, limit);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable Integer id) {
        return ResponseUtil.success(plotService.getOne(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        return ResponseUtil.created(plotService.create(body, me, httpReq), "Plot created successfully");
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkCreate(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        return ResponseUtil.created(plotService.bulkCreate(body, me, httpReq), "Plots created successfully");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> update(
        @PathVariable Integer id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        plotService.update(id, body, me, httpReq);
        return ResponseUtil.success(null, "Plot updated successfully", 200);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> changeStatus(
        @PathVariable Integer id,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        plotService.changeStatus(id, body.get("status"), me, httpReq);
        return ResponseUtil.success(null, "Plot status updated", 200);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> delete(
        @PathVariable Integer id,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        plotService.delete(id, me, httpReq);
        return ResponseUtil.success(null, "Plot deleted successfully", 200);
    }
}
