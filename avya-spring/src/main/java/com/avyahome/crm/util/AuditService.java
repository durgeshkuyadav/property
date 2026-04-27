package com.avyahome.crm.util;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.entity.AuditLog;
import com.avyahome.crm.repository.AuditLogRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Async
    public void log(Associate associate, String action, String entityType,
                    Integer entityId, Object oldValues, Object newValues,
                    HttpServletRequest request) {
        try {
            AuditLog entry = AuditLog.builder()
                .associate(associate)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .oldValues(toJson(oldValues))
                .newValues(toJson(newValues))
                .ipAddress(request != null ? request.getRemoteAddr() : null)
                .userAgent(request != null ? request.getHeader("User-Agent") : null)
                .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Audit log error: {}", e.getMessage());
        }
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try { return objectMapper.writeValueAsString(obj); }
        catch (JsonProcessingException e) { return obj.toString(); }
    }
}
