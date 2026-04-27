package com.avyahome.crm.controller;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.service.PdfService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

/**
 * Mirrors pdf.routes.js:
 *   GET /api/pdf/payout/:id/statement
 *   GET /api/pdf/booking/:id/receipt
 *   GET /api/pdf/welcome-letter
 *   GET /api/pdf/welcome-letter/:id    (admin)
 */
@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
public class PdfController {

    private final PdfService pdfService;

    @GetMapping("/payout/{id}/statement")
    public void payoutStatement(
        @PathVariable Integer id,
        @AuthenticationPrincipal Associate me,
        HttpServletResponse response
    ) throws IOException {
        pdfService.streamPayoutStatement(id, me, response);
    }

    @GetMapping("/booking/{id}/receipt")
    public void bookingReceipt(
        @PathVariable Integer id,
        @AuthenticationPrincipal Associate me,
        HttpServletResponse response
    ) throws IOException {
        pdfService.streamBookingReceipt(id, me, response);
    }

    @GetMapping("/welcome-letter")
    public void welcomeLetterOwn(
        @AuthenticationPrincipal Associate me,
        HttpServletResponse response
    ) throws IOException {
        pdfService.streamWelcomeLetter(me.getId(), me, response);
    }

    @GetMapping("/welcome-letter/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    public void welcomeLetterAdmin(
        @PathVariable Integer id,
        @AuthenticationPrincipal Associate me,
        HttpServletResponse response
    ) throws IOException {
        pdfService.streamWelcomeLetter(id, me, response);
    }
}
