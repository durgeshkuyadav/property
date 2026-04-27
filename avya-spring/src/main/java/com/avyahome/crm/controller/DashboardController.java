package com.avyahome.crm.controller;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.service.DashboardService;
import com.avyahome.crm.util.ResponseUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Mirrors dashboard.routes.js:
 *   GET /api/dashboard
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> dashboard(@AuthenticationPrincipal Associate me) {
        return ResponseUtil.success(dashboardService.getDashboard(me));
    }
}
