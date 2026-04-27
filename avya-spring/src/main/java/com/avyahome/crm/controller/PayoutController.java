package com.avyahome.crm.controller;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.service.PayoutService;
import com.avyahome.crm.util.ResponseUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Mirrors payout.routes.js:
 *   GET    /api/payouts/earnings
 *   GET    /api/payouts/transfers
 *   GET    /api/payouts
 *   GET    /api/payouts/preview   (admin)
 *   GET    /api/payouts/:id
 *   POST   /api/payouts           (admin)
 *   PUT    /api/payouts/:id/approve  (admin)
 *   PUT    /api/payouts/:id/cancel   (admin)
 *   POST   /api/payouts/:id/bank-transfer (admin)
 */
@RestController
@RequestMapping("/api/payouts")
@RequiredArgsConstructor
public class PayoutController {

    private final PayoutService payoutService;

    @GetMapping("/earnings")
    public ResponseEntity<Map<String, Object>> earnings(@AuthenticationPrincipal Associate me) {
        return ResponseUtil.success(payoutService.getEarningsDashboard(me.getId()));
    }

    @GetMapping("/transfers")
    public ResponseEntity<Map<String, Object>> transfers(
        @RequestParam(required = false) Integer associateId,
        @RequestParam(required = false) String fromDate,
        @RequestParam(required = false) String toDate,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @AuthenticationPrincipal Associate me
    ) {
        return payoutService.getBankTransfers(associateId, fromDate, toDate, page, limit, me);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Integer associateId,
        @RequestParam(required = false) String fromDate,
        @RequestParam(required = false) String toDate,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @AuthenticationPrincipal Associate me
    ) {
        return payoutService.getAll(status, associateId, fromDate, toDate, page, limit, me);
    }

    @GetMapping("/preview")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> preview(
        @RequestParam Integer associateId,
        @RequestParam String fromDate,
        @RequestParam String toDate
    ) {
        return ResponseUtil.success(payoutService.previewPayout(associateId, fromDate, toDate));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(
        @PathVariable Integer id,
        @AuthenticationPrincipal Associate me
    ) {
        return ResponseUtil.success(payoutService.getOne(id, me));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        return ResponseUtil.created(payoutService.create(body, me, httpReq), "Payout created successfully");
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> approve(
        @PathVariable Integer id,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        payoutService.approve(id, me, httpReq);
        return ResponseUtil.success(null, "Payout approved successfully", 200);
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> cancel(
        @PathVariable Integer id,
        @RequestBody(required = false) Map<String, String> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        String reason = body != null ? body.get("reason") : null;
        payoutService.cancel(id, reason, me, httpReq);
        return ResponseUtil.success(null, "Payout cancelled", 200);
    }

    @PostMapping("/{id}/bank-transfer")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> bankTransfer(
        @PathVariable Integer id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        return ResponseUtil.created(payoutService.recordBankTransfer(id, body, me, httpReq),
            "Bank transfer recorded. Payout marked as paid.");
    }
}
