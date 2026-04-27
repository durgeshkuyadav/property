package com.avyahome.crm.controller;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.service.ProjectService;
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
 * Mirrors project.routes.js:
 *   GET    /api/projects
 *   GET    /api/projects/:id
 *   POST   /api/projects            (admin)
 *   PUT    /api/projects/:id        (admin)
 *   DELETE /api/projects/:id        (superAdmin)
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        return ResponseUtil.success(projectService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable Integer id) {
        return ResponseUtil.success(projectService.getOne(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        return ResponseUtil.created(projectService.create(body, me, httpReq), "Project created successfully");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> update(
        @PathVariable Integer id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        projectService.update(id, body, me, httpReq);
        return ResponseUtil.success(null, "Project updated successfully", 200);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> delete(
        @PathVariable Integer id,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        projectService.delete(id, me, httpReq);
        return ResponseUtil.success(null, "Project deleted successfully", 200);
    }
}
