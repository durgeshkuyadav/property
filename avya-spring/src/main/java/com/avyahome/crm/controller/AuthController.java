package com.avyahome.crm.controller;

import com.avyahome.crm.dto.request.*;
import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.service.AuthService;
import com.avyahome.crm.util.ResponseUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Mirrors auth.routes.js:
 *   POST   /api/auth/login
 *   POST   /api/auth/refresh-token
 *   POST   /api/auth/logout
 *   POST   /api/auth/forgot-password
 *   POST   /api/auth/reset-password
 *   PUT    /api/auth/change-password
 *   GET    /api/auth/me
 *   PUT    /api/auth/me
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
        @Valid @RequestBody LoginRequest req, HttpServletRequest httpReq
    ) {
        return ResponseUtil.success(authService.login(req, httpReq), "Login successful", 200);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<Map<String, Object>> refreshToken(@RequestBody Map<String, String> body) {
        String token = body.get("refreshToken");
        return ResponseUtil.success(authService.refreshToken(token), "Token refreshed", 200);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(
        @AuthenticationPrincipal Associate associate,
        @RequestBody(required = false) Map<String, String> body
    ) {
        String refreshToken = body != null ? body.get("refreshToken") : null;
        authService.logout(associate.getId(), refreshToken);
        return ResponseUtil.success(null, "Logged out successfully", 200);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req.getMobile());
        return ResponseUtil.success(null, "OTP sent to your registered email", 200);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseUtil.success(null, "Password reset successfully", 200);
    }

    @PutMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
        @AuthenticationPrincipal Associate associate,
        @Valid @RequestBody ChangePasswordRequest req
    ) {
        authService.changePassword(associate, req);
        return ResponseUtil.success(null, "Password changed successfully", 200);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyProfile(@AuthenticationPrincipal Associate associate) {
        return ResponseUtil.success(authService.getProfile(associate.getId()));
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateMyProfile(
        @AuthenticationPrincipal Associate associate,
        @Valid @RequestBody UpdateProfileRequest req,
        HttpServletRequest httpReq
    ) {
        authService.updateProfile(associate, req, httpReq);
        return ResponseUtil.success(null, "Profile updated successfully", 200);
    }
}
