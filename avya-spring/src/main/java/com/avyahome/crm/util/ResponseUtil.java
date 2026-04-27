package com.avyahome.crm.util;

import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

public final class ResponseUtil {

    private ResponseUtil() {}

    public static ResponseEntity<Map<String, Object>> success(Object data, String message, int status) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("message", message);
        body.put("data", data);
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(status).body(body);
    }

    public static ResponseEntity<Map<String, Object>> success(Object data) {
        return success(data, "Success", 200);
    }

    public static ResponseEntity<Map<String, Object>> success(Object data, String message) {
        return success(data, message, 200);
    }

    public static ResponseEntity<Map<String, Object>> created(Object data, String message) {
        return success(data, message, 201);
    }

    public static ResponseEntity<Map<String, Object>> error(String message, int status, Object errors) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("message", message);
        if (errors != null) body.put("errors", errors);
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(status).body(body);
    }

    public static ResponseEntity<Map<String, Object>> error(String message, int status) {
        return error(message, status, null);
    }

    public static ResponseEntity<Map<String, Object>> paginated(
            Object data, long total, int page, int limit, String message
    ) {
        Map<String, Object> pagination = Map.of(
                "total", total,
                "page", page,
                "limit", limit,
                "totalPages", (int) Math.ceil((double) total / limit)
        );
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("message", message);
        body.put("data", data);
        body.put("pagination", pagination);
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(body);
    }
}