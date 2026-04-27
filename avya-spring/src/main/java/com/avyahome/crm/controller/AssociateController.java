package com.avyahome.crm.controller;

import com.avyahome.crm.dto.request.CreateAssociateRequest;
import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.service.AssociateService;
import com.avyahome.crm.util.ResponseUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Mirrors associate.routes.js:
 *   POST   /api/associates          (admin)
 *   GET    /api/associates          (admin)
 *   GET    /api/associates/downline
 *   GET    /api/associates/downline/tree
 *   GET    /api/associates/:id
 *   PUT    /api/associates/:id      (admin)
 *   PUT    /api/associates/:id/reset-password (superAdmin)
 *   GET    /api/associates/:id/downline
 *   GET    /api/associates/:id/downline/tree
 */
@RestController
@RequestMapping("/api/associates")
@RequiredArgsConstructor
public class AssociateController {

    private final AssociateService associateService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> create(
        @Valid @RequestBody CreateAssociateRequest req,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        return ResponseUtil.created(associateService.create(req, me, httpReq), "Associate created successfully");
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> getAll(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String role,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return associateService.getAll(search, status, role, page, limit);
    }

    @GetMapping("/downline")
    public ResponseEntity<Map<String, Object>> myDownlineFlat(@AuthenticationPrincipal Associate me) {
        return ResponseUtil.success(associateService.getDownlineFlat(me.getId()));
    }

    @GetMapping("/downline/tree")
    public ResponseEntity<Map<String, Object>> myDownlineTree(@AuthenticationPrincipal Associate me) {
        return ResponseUtil.success(associateService.getDownlineTree(me.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable Integer id,
                                                       @AuthenticationPrincipal Associate me) {
        return ResponseUtil.success(associateService.getOne(id, me));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> update(
        @PathVariable Integer id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        associateService.update(id, body, me, httpReq);
        return ResponseUtil.success(null, "Associate updated successfully", 200);
    }

    @PutMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> resetPassword(
        @PathVariable Integer id,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        associateService.resetPassword(id, body.get("newPassword"), me, httpReq);
        return ResponseUtil.success(null, "Password reset successfully", 200);
    }

    @GetMapping("/{id}/downline")
    public ResponseEntity<Map<String, Object>> downlineFlat(@PathVariable Integer id) {
        return ResponseUtil.success(associateService.getDownlineFlat(id));
    }

    @GetMapping("/{id}/downline/tree")
    public ResponseEntity<Map<String, Object>> downlineTree(@PathVariable Integer id) {
        return ResponseUtil.success(associateService.getDownlineTree(id));
    }
}
