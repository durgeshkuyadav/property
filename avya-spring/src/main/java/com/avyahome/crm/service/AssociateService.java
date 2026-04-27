package com.avyahome.crm.service;

import com.avyahome.crm.dto.request.CreateAssociateRequest;
import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.repository.AssociateRepository;
import com.avyahome.crm.util.AuditService;
import com.avyahome.crm.util.ResponseUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AssociateService {

    private final AssociateRepository associateRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final EmailService emailService;

    @Transactional
    public Map<String, Object> create(CreateAssociateRequest req, Associate me, HttpServletRequest httpReq) {
        if (associateRepo.existsByMobile(req.getMobile()))
            throw new RuntimeException("MOBILE_ALREADY_EXISTS");

        if (req.getSponsorId() != null && !associateRepo.existsById(req.getSponsorId()))
            throw new RuntimeException("SPONSOR_NOT_FOUND");

        String code = generateCode();
        Associate.Role role = Associate.Role.valueOf(req.getRole() != null ? req.getRole() : "associate");
        Associate sponsor = req.getSponsorId() != null
            ? associateRepo.getReferenceById(req.getSponsorId()) : null;

        Associate a = Associate.builder()
            .associateCode(code)
            .name(req.getName().trim())
            .mobile(req.getMobile().trim())
            .email(req.getEmail())
            .passwordHash(passwordEncoder.encode(req.getPassword()))
            .commissionPct(req.getCommissionPct() != null
                ? BigDecimal.valueOf(req.getCommissionPct()) : BigDecimal.valueOf(5.00))
            .role(role)
            .sponsor(sponsor)
            .joiningDate(LocalDate.now())
            .build();
        associateRepo.save(a);

        if (req.getEmail() != null)
            emailService.sendWelcomeEmail(req.getEmail(), req.getName(), code);

        auditService.log(me, "CREATE_ASSOCIATE", "associate", a.getId(),
            null, Map.of("name", req.getName(), "mobile", req.getMobile(), "code", code), httpReq);

        return Map.of("id", a.getId(), "associate_code", code);
    }

    public ResponseEntity<Map<String, Object>> getAll(
        String search, String statusStr, String roleStr, int page, int limit
    ) {
        Associate.AssociateStatus status = statusStr != null
            ? Associate.AssociateStatus.valueOf(statusStr) : null;
        Associate.Role role = roleStr != null
            ? Associate.Role.valueOf(roleStr) : null;

        PageRequest pageable = PageRequest.of(page - 1, limit, Sort.by("createdAt").descending());
        Page<Associate> pageResult = associateRepo.findAllFiltered(search, status, role, pageable);

        List<Map<String, Object>> items = pageResult.getContent().stream()
            .map(this::toSummaryMap).toList();

        return ResponseUtil.paginated(items, pageResult.getTotalElements(), page, limit, "Success");
    }

    public Object getOne(Integer id, Associate me) {
        Associate a = associateRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        // Associates can only view themselves unless admin
        boolean isAdmin = me.getRole() == Associate.Role.super_admin || me.getRole() == Associate.Role.manager;
        if (!isAdmin && !me.getId().equals(id)) throw new RuntimeException("FORBIDDEN");
        return toDetailMap(a);
    }

    @Transactional
    public void update(Integer id, Map<String, Object> body, Associate me, HttpServletRequest httpReq) {
        Associate a = associateRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        Map<String, Object> old = toDetailMap(a);

        if (body.containsKey("name"))           a.setName((String) body.get("name"));
        if (body.containsKey("email"))          a.setEmail((String) body.get("email"));
        if (body.containsKey("commission_pct")) a.setCommissionPct(BigDecimal.valueOf(
            ((Number) body.get("commission_pct")).doubleValue()));
        if (body.containsKey("status"))         a.setStatus(Associate.AssociateStatus.valueOf((String) body.get("status")));
        if (body.containsKey("role"))           a.setRole(Associate.Role.valueOf((String) body.get("role")));

        associateRepo.save(a);
        auditService.log(me, "UPDATE_ASSOCIATE", "associate", id, old, body, httpReq);
    }

    @Transactional
    public void resetPassword(Integer id, String newPassword, Associate me, HttpServletRequest httpReq) {
        Associate a = associateRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        a.setPasswordHash(passwordEncoder.encode(newPassword));
        associateRepo.save(a);
        auditService.log(me, "RESET_PASSWORD", "associate", id, null, null, httpReq);
    }

    public List<Map<String, Object>> getDownlineFlat(Integer rootId) {
        List<Map<String, Object>> result = new ArrayList<>();
        Queue<Integer> queue = new LinkedList<>();
        queue.add(rootId);
        while (!queue.isEmpty()) {
            Integer cur = queue.poll();
            List<Associate> children = associateRepo.findBySponsorId(cur);
            for (Associate c : children) {
                result.add(toSummaryMap(c));
                queue.add(c.getId());
            }
        }
        return result;
    }

    public Map<String, Object> getDownlineTree(Integer rootId) {
        Associate root = associateRepo.findById(rootId).orElseThrow();
        return buildTree(root);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Map<String, Object> buildTree(Associate a) {
        Map<String, Object> node = toSummaryMap(a);
        List<Map<String, Object>> children = associateRepo.findBySponsorId(a.getId())
            .stream().map(this::buildTree).toList();
        node.put("children", children);
        return node;
    }

    private Map<String, Object> toSummaryMap(Associate a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("associate_code", a.getAssociateCode());
        m.put("name", a.getName());
        m.put("mobile", a.getMobile());
        m.put("email", a.getEmail());
        m.put("role", a.getRole());
        m.put("status", a.getStatus());
        m.put("commission_pct", a.getCommissionPct());
        m.put("joining_date", a.getJoiningDate());
        m.put("sponsor_id", a.getSponsor() != null ? a.getSponsor().getId() : null);
        return m;
    }

    private Map<String, Object> toDetailMap(Associate a) {
        Map<String, Object> m = toSummaryMap(a);
        m.put("father_name", a.getFatherName());
        m.put("date_of_birth", a.getDateOfBirth());
        m.put("pan_number", a.getPanNumber());
        m.put("aadhar_number", a.getAadharNumber());
        m.put("address", a.getAddress());
        m.put("bank_account_no", a.getBankAccountNo());
        m.put("bank_ifsc", a.getBankIfsc());
        m.put("bank_name", a.getBankName());
        m.put("bank_branch", a.getBankBranch());
        m.put("nominee_name", a.getNomineeName());
        m.put("nominee_relation", a.getNomineeRelation());
        return m;
    }

    private String generateCode() {
        // mirrors generateAssociateCode from utils/helpers.js
        String prefix = "AH";
        Optional<String> max = associateRepo.findMaxCodeByPrefix(prefix);
        int next = max.map(s -> {
            try { return Integer.parseInt(s.substring(prefix.length())) + 1; }
            catch (Exception e) { return 10001; }
        }).orElse(10001);
        return prefix + next;
    }
}
