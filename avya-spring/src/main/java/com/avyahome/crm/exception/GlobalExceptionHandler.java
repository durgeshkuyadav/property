package com.avyahome.crm.exception;

import com.avyahome.crm.util.ResponseUtil;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> Map.of("field", f.getField(), "message", defaultMsg(f)))
                .toList();
        return ResponseUtil.error("Validation failed", 422, errors);
    }

    // FIX 3: Handle "undefined" string sent from frontend for Integer params
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String param = ex.getName();
        String value = ex.getValue() != null ? ex.getValue().toString() : "null";
        log.warn("Type mismatch for param '{}' with value '{}' — treating as null", param, value);
        // Return 400 with clear message instead of 500
        return ResponseUtil.error("Invalid parameter '" + param + "': received '" + value + "'", 400);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(AccessDeniedException ex) {
        return ResponseUtil.error("You do not have permission to perform this action", 403);
    }

    @ExceptionHandler(ExpiredJwtException.class)
    public ResponseEntity<Map<String, Object>> handleExpiredJwt(ExpiredJwtException ex) {
        return ResponseUtil.error("Token expired, please login again", 401);
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<Map<String, Object>> handleJwt(JwtException ex) {
        return ResponseUtil.error("Invalid token", 401);
    }

    @ExceptionHandler(org.hibernate.LazyInitializationException.class)
    public ResponseEntity<Map<String, Object>> handleLazy(org.hibernate.LazyInitializationException ex) {
        log.error("Lazy loading error: {}", ex.getMessage());
        return ResponseUtil.error("Data loading error — please retry", 500);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        // FIX: Guard against null message to prevent NPE in switch
        String msg = ex.getMessage();
        if (msg == null) {
            log.error("RuntimeException with null message", ex);
            return ResponseUtil.error("Internal server error", 500);
        }
        return switch (msg) {
            case "INVALID_CREDENTIALS"     -> ResponseUtil.error("Invalid mobile number or password", 401);
            case "SUSPENDED"               -> ResponseUtil.error("Your account has been suspended. Contact admin.", 403);
            case "INACTIVE"                -> ResponseUtil.error("Your account is inactive. Contact admin.", 403);
            case "REFRESH_TOKEN_REQUIRED"  -> ResponseUtil.error("Refresh token required", 400);
            case "INVALID_REFRESH_TOKEN"   -> ResponseUtil.error("Invalid or expired refresh token", 401);
            case "ACCOUNT_NOT_ACTIVE"      -> ResponseUtil.error("Account is not active", 403);
            case "MOBILE_NOT_FOUND"        -> ResponseUtil.error("Mobile number not registered", 404);
            case "INVALID_OTP"             -> ResponseUtil.error("Invalid or expired OTP", 400);
            case "PASSWORDS_DO_NOT_MATCH"  -> ResponseUtil.error("Passwords do not match", 400);
            case "WRONG_OLD_PASSWORD"      -> ResponseUtil.error("Current password is incorrect", 400);
            case "MOBILE_ALREADY_EXISTS"   -> ResponseUtil.error("Mobile number already registered", 409);
            case "SPONSOR_NOT_FOUND"       -> ResponseUtil.error("Sponsor associate not found", 404);
            case "NOT_FOUND"               -> ResponseUtil.error("Resource not found", 404);
            case "FORBIDDEN"               -> ResponseUtil.error("Access denied", 403);
            case "PLOT_ALREADY_EXISTS"     -> ResponseUtil.error("Plot number already exists in this project", 409);
            case "PLOT_NOT_AVAILABLE"      -> ResponseUtil.error("Plot is not available for booking", 400);
            case "VALIDATION"              -> ResponseUtil.error("Invalid request data", 400);
            case "OVERLAP_PAYOUT"          -> ResponseUtil.error("A payout already exists for this period", 409);
            default -> {
                log.error("Unhandled exception: {}", msg, ex);
                yield ResponseUtil.error("Internal server error", 500);
            }
        };
    }

    private String defaultMsg(FieldError f) {
        return f.getDefaultMessage() != null ? f.getDefaultMessage() : "Invalid value";
    }
}