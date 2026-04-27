package com.avyahome.crm.controller;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.service.CustomerService;
import com.avyahome.crm.util.ResponseUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Mirrors customer.routes.js:
 *   GET    /api/customers/monthly-business
 *   GET    /api/customers
 *   GET    /api/customers/:id
 *   POST   /api/customers                             (admin)
 *   PUT    /api/customers/:id                         (admin)
 *   POST   /api/customers/:id/cancel                  (admin)
 *   GET    /api/customers/:customer_id/payments
 *   POST   /api/customers/:customer_id/payments       (admin)
 *   PATCH  /api/customers/:customer_id/payments/:payment_id (admin)
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping("/monthly-business")
    public ResponseEntity<Map<String, Object>> monthlyBusiness(
        @RequestParam(required = false) String fromDate,
        @RequestParam(required = false) String toDate,
        @RequestParam(required = false) Integer projectId,
        @RequestParam(required = false) String customerName,
        @AuthenticationPrincipal Associate me
    ) {
        return ResponseUtil.success(customerService.getMonthlyBusiness(fromDate, toDate, projectId, customerName, me));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Integer promoterId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @AuthenticationPrincipal Associate me
    ) {
        return customerService.getAll(search, status, promoterId, page, limit, me);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(
        @PathVariable Integer id,
        @AuthenticationPrincipal Associate me
    ) {
        return ResponseUtil.success(customerService.getOne(id, me));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        return ResponseUtil.created(customerService.create(body, me, httpReq), "Customer booked successfully");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> update(
        @PathVariable Integer id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        customerService.update(id, body, me, httpReq);
        return ResponseUtil.success(null, "Customer updated successfully", 200);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> cancel(
        @PathVariable Integer id,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        customerService.cancelBooking(id, me, httpReq);
        return ResponseUtil.success(null, "Booking cancelled. Plot is now available again.", 200);
    }

    @GetMapping("/{customerId}/payments")
    public ResponseEntity<Map<String, Object>> getPayments(@PathVariable Integer customerId) {
        return ResponseUtil.success(customerService.getPayments(customerId));
    }

    @PostMapping("/{customerId}/payments")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> addPayment(
        @PathVariable Integer customerId,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        return ResponseUtil.created(customerService.addPayment(customerId, body, me, httpReq), "Payment recorded successfully");
    }

    @PatchMapping("/{customerId}/payments/{paymentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> updatePayment(
        @PathVariable Integer customerId,
        @PathVariable Integer paymentId,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal Associate me,
        HttpServletRequest httpReq
    ) {
        return ResponseUtil.success(customerService.updatePayment(customerId, paymentId, body.get("status"), me, httpReq), "Payment status updated");
    }
}
