package com.avyahome.crm.service;

import com.avyahome.crm.entity.*;
import com.avyahome.crm.repository.*;
import com.avyahome.crm.util.AuditService;
import com.avyahome.crm.util.ResponseUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PayoutService {

    private final PayoutRepository payoutRepo;
    private final PayoutPaymentRepository payoutPaymentRepo;
    private final AssociateRepository associateRepo;
    private final AuditService auditService;

    @PersistenceContext
    private EntityManager em;

    @Transactional
    public Map<String, Object> create(Map<String, Object> body, Associate me, HttpServletRequest httpReq) {
        Integer associateId = (Integer) body.get("associate_id");
        String fromDateStr  = (String) body.get("from_date");
        String toDateStr    = (String) body.get("to_date");

        if (associateId == null || fromDateStr == null || toDateStr == null)
            throw new RuntimeException("VALIDATION");

        Associate associate = associateRepo.findById(associateId)
                .filter(a -> a.getStatus() == Associate.AssociateStatus.active)
                .orElseThrow(() -> new RuntimeException("NOT_FOUND"));

        LocalDate fromDate = LocalDate.parse(fromDateStr);
        LocalDate toDate   = LocalDate.parse(toDateStr);

        Long overlapCount = em.createQuery("""
            SELECT COUNT(p) FROM Payout p
            WHERE p.associate.id = :aid AND p.status != 'cancelled'
              AND (p.fromDate <= :toDate AND p.toDate >= :fromDate)
            """, Long.class)
                .setParameter("aid", associateId)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
        if (overlapCount > 0) throw new RuntimeException("OVERLAP_PAYOUT");

        BigDecimal selfSalesTotal = getSalesForPromoter(associateId, fromDate, toDate);
        BigDecimal commissionRate = associate.getCommissionPct()
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal selfIncome = selfSalesTotal.multiply(commissionRate)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal levelIncome    = calcLevelIncome(associateId, fromDate, toDate);
        BigDecimal advBonus       = toBD(body.get("advance_bonus"));
        BigDecimal monthlyBonus   = toBD(body.get("monthly_bonus"));
        BigDecimal leaderIncome   = toBD(body.get("leadership_income"));
        BigDecimal royaltyIncome  = toBD(body.get("royalty_income"));
        BigDecimal adminCharge    = toBD(body.get("admin_charge"));

        BigDecimal tdsPct = associate.getPanNumber() != null
                ? BigDecimal.valueOf(5.00) : BigDecimal.valueOf(20.00);

        BigDecimal totalIncome = selfIncome.add(levelIncome).add(leaderIncome)
                .add(royaltyIncome).add(advBonus).add(monthlyBonus);
        BigDecimal tdsAmount  = totalIncome.multiply(tdsPct)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal netPayable = totalIncome.subtract(tdsAmount).subtract(adminCharge)
                .setScale(2, RoundingMode.HALF_UP);

        String payoutCode = generatePayoutCode();

        Payout payout = Payout.builder()
                .payoutCode(payoutCode)
                .associate(associate)
                .fromDate(fromDate).toDate(toDate)
                .selfIncome(selfIncome).levelIncome(levelIncome)
                .leadershipIncome(leaderIncome).royaltyIncome(royaltyIncome)
                .advanceBonus(advBonus).monthlyBonus(monthlyBonus)
                .totalIncome(totalIncome).adminCharge(adminCharge)
                .tdsPercentage(tdsPct).tdsAmount(tdsAmount)
                .netPayable(netPayable).status(Payout.PayoutStatus.pending)
                .createdBy(me).build();
        payoutRepo.save(payout);

        auditService.log(me, "CREATE_PAYOUT", "payout", payout.getId(), null,
                Map.of("payout_code", payoutCode, "associate_id", associateId,
                        "total_income", totalIncome, "net_payable", netPayable), httpReq);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", payout.getId());
        result.put("payout_code", payoutCode);
        result.put("self_income", selfIncome);
        result.put("level_income", levelIncome);
        result.put("total_income", totalIncome);
        result.put("tds_percentage", tdsPct);
        result.put("tds_amount", tdsAmount);
        result.put("net_payable", netPayable);
        result.put("self_sales_total", selfSalesTotal);
        return result;
    }

    public ResponseEntity<Map<String, Object>> getAll(
            String statusStr, Integer associateId, String fromDate, String toDate,
            int page, int limit, Associate me
    ) {
        boolean admin = isAdmin(me);
        Integer effectiveAssociate = admin ? associateId : me.getId();
        Payout.PayoutStatus status = statusStr != null ? Payout.PayoutStatus.valueOf(statusStr) : null;
        PageRequest pageable = PageRequest.of(page - 1, limit, Sort.by("createdAt").descending());
        Page<Payout> result = payoutRepo.findAllFiltered(effectiveAssociate, status, pageable);
        return ResponseUtil.paginated(result.getContent(), result.getTotalElements(), page, limit, "Success");
    }

    public Map<String, Object> getOne(Integer id, Associate me) {
        Payout payout = payoutRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        if (!isAdmin(me) && !me.getId().equals(payout.getAssociate().getId()))
            throw new RuntimeException("FORBIDDEN");

        List<?> payments = em.createQuery("""
            SELECT cp.id, cp.amount, cp.depositDate, cp.paymentMode,
                   c.name, pl.plotNumber, pl.project.projectName
            FROM CustomerPayment cp JOIN cp.customer c JOIN c.plot pl
            WHERE c.promoter.id = :aid AND cp.status = 'received'
              AND cp.depositDate BETWEEN :from AND :to
            ORDER BY cp.depositDate DESC
            """)
                .setParameter("aid", payout.getAssociate().getId())
                .setParameter("from", payout.getFromDate())
                .setParameter("to", payout.getToDate())
                .getResultList();

        List<PayoutPayment> bankTransfers = payoutPaymentRepo.findByPayoutIdOrderByCreatedAtDesc(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("payout", payout);
        result.put("contributing_payments", payments);
        result.put("bank_transfers", bankTransfers);
        return result;
    }

    @Transactional
    public void approve(Integer id, Associate me, HttpServletRequest httpReq) {
        Payout p = payoutRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        if (p.getStatus() != Payout.PayoutStatus.pending) throw new RuntimeException("VALIDATION");
        p.setStatus(Payout.PayoutStatus.approved);
        p.setApprovedBy(me);
        p.setApprovedAt(LocalDateTime.now());
        payoutRepo.save(p);
        auditService.log(me, "APPROVE_PAYOUT", "payout", id,
                Map.of("status", "pending"), Map.of("status", "approved"), httpReq);
    }

    @Transactional
    public void cancel(Integer id, String reason, Associate me, HttpServletRequest httpReq) {
        Payout p = payoutRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        if (p.getStatus() == Payout.PayoutStatus.paid) throw new RuntimeException("VALIDATION");
        Map<String, Object> old = Map.of("status", p.getStatus().name());
        p.setStatus(Payout.PayoutStatus.cancelled);
        payoutRepo.save(p);
        auditService.log(me, "CANCEL_PAYOUT", "payout", id, old,
                Map.of("status", "cancelled", "reason", reason != null ? reason : ""), httpReq);
    }

    @Transactional
    public Map<String, Object> recordBankTransfer(Integer id, Map<String, Object> body,
                                                  Associate me, HttpServletRequest httpReq) {
        Payout payout = payoutRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        if (payout.getStatus() != Payout.PayoutStatus.approved) throw new RuntimeException("VALIDATION");

        PayoutPayment transfer = PayoutPayment.builder()
                .payout(payout)
                .associate(payout.getAssociate())
                .modeOfPay(PayoutPayment.ModeOfPay.valueOf((String) body.get("mode_of_pay")))
                .refNumber((String) body.get("ref_number"))
                .refInfo((String) body.get("ref_info"))
                .refDate(LocalDate.parse((String) body.get("ref_date")))
                .tdsStatus(true)
                .grossAmount(payout.getTotalIncome())
                .tdsDeducted(payout.getTdsAmount())
                .netPaid(payout.getNetPayable())
                .remark((String) body.get("remark"))
                .createdBy(me)
                .build();
        payoutPaymentRepo.save(transfer);
        payout.setStatus(Payout.PayoutStatus.paid);
        payoutRepo.save(payout);

        auditService.log(me, "RECORD_BANK_TRANSFER", "payout", id,
                Map.of("status", "approved"),
                Map.of("status", "paid", "ref_number", body.getOrDefault("ref_number", "")), httpReq);

        return Map.of("transfer_id", transfer.getId());
    }

    // FIX: Use LinkedHashMap instead of Map.of() to avoid NPE when values are null
    public Map<String, Object> getEarningsDashboard(Integer associateId) {
        List<?> totalsRows = em.createQuery("""
            SELECT
              COALESCE(SUM(CASE WHEN p.status IN ('approved','paid') THEN p.totalIncome ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.netPayable ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.tdsAmount ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.netPayable ELSE 0 END), 0),
              COUNT(p),
              SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END),
              SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END)
            FROM Payout p WHERE p.associate.id = :aid
            """).setParameter("aid", associateId).getResultList();

        Object[] totals = (Object[]) totalsRows.get(0);

        List<?> salesRows = em.createQuery("""
            SELECT COALESCE(SUM(cp.amount), 0), COUNT(cp)
            FROM CustomerPayment cp JOIN cp.customer c
            WHERE c.promoter.id = :aid AND cp.status = 'received'
            """).setParameter("aid", associateId).getResultList();
        Object[] sales = (Object[]) salesRows.get(0);

        List<Payout> recent = payoutRepo.findAllFiltered(associateId, null,
                PageRequest.of(0, 5, Sort.by("createdAt").descending())).getContent();

        // Use LinkedHashMap — safe with null values (Map.of() throws NPE for null values)
        Map<String, Object> totalsMap = new LinkedHashMap<>();
        totalsMap.put("total_gross",    toBD(totals[0]));
        totalsMap.put("total_received", toBD(totals[1]));
        totalsMap.put("total_tds",      toBD(totals[2]));
        totalsMap.put("pending_amount", toBD(totals[3]));
        totalsMap.put("total_payouts",  totals[4]);
        totalsMap.put("paid_count",     totals[5] != null ? totals[5] : 0L);
        totalsMap.put("pending_count",  totals[6] != null ? totals[6] : 0L);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totals", totalsMap);
        result.put("sales_total", toBD(sales[0]));
        result.put("sales_payment_count", sales[1]);
        result.put("recent_payouts", recent);
        return result;
    }

    public Map<String, Object> previewPayout(Integer associateId, String fromDateStr, String toDateStr) {
        Associate associate = associateRepo.findById(associateId)
                .orElseThrow(() -> new RuntimeException("NOT_FOUND"));

        LocalDate from = LocalDate.parse(fromDateStr);
        LocalDate to   = LocalDate.parse(toDateStr);

        List<?> ownPayments = em.createQuery("""
            SELECT cp.id, cp.amount, cp.depositDate, cp.paymentMode,
                   c.name, pl.plotNumber, pl.project.projectName
            FROM CustomerPayment cp JOIN cp.customer c JOIN c.plot pl
            WHERE c.promoter.id = :aid AND cp.status = 'received'
              AND cp.depositDate BETWEEN :from AND :to
            ORDER BY cp.depositDate DESC
            """).setParameter("aid", associateId)
                .setParameter("from", from).setParameter("to", to).getResultList();

        BigDecimal selfSalesTotal = ownPayments.stream()
                .map(r -> (BigDecimal) ((Object[]) r)[1])
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal selfIncome = selfSalesTotal
                .multiply(associate.getCommissionPct().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal levelIncome = calcLevelIncome(associateId, from, to);
        BigDecimal tdsPct = associate.getPanNumber() != null
                ? BigDecimal.valueOf(5.00) : BigDecimal.valueOf(20.00);
        BigDecimal totalIncome = selfIncome.add(levelIncome);
        BigDecimal tdsAmount   = totalIncome.multiply(tdsPct)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal netPayable  = totalIncome.subtract(tdsAmount);

        Map<String, Object> assocMap = new LinkedHashMap<>();
        assocMap.put("id", associate.getId());
        assocMap.put("name", associate.getName());
        assocMap.put("associate_code", associate.getAssociateCode());
        assocMap.put("commission_pct", associate.getCommissionPct());
        assocMap.put("pan_provided", associate.getPanNumber() != null);

        Map<String, Object> calcMap = new LinkedHashMap<>();
        calcMap.put("self_sales_total", selfSalesTotal);
        calcMap.put("self_income", selfIncome);
        calcMap.put("level_income", levelIncome);
        calcMap.put("total_income", totalIncome);
        calcMap.put("tds_percentage", tdsPct);
        calcMap.put("tds_amount", tdsAmount);
        calcMap.put("net_payable", netPayable);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("associate", assocMap);
        result.put("period", Map.of("from_date", fromDateStr, "to_date", toDateStr));
        result.put("own_payments", ownPayments);
        result.put("calculation", calcMap);
        return result;
    }

    public ResponseEntity<Map<String, Object>> getBankTransfers(
            Integer associateId, String fromDate, String toDate, int page, int limit, Associate me
    ) {
        boolean admin = isAdmin(me);
        Integer effectiveAssociate = admin ? associateId : me.getId();
        List<PayoutPayment> transfers;
        if (effectiveAssociate != null) {
            transfers = payoutPaymentRepo.findByAssociateIdOrderByCreatedAtDesc(effectiveAssociate);
        } else {
            transfers = payoutPaymentRepo.findAll(PageRequest.of(page - 1, limit,
                    Sort.by("refDate").descending())).getContent();
        }
        return ResponseUtil.paginated(transfers, transfers.size(), page, limit, "Success");
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private BigDecimal getSalesForPromoter(Integer promoterId, LocalDate from, LocalDate to) {
        List<?> rows = em.createQuery("""
            SELECT COALESCE(SUM(cp.amount), 0)
            FROM CustomerPayment cp JOIN cp.customer c
            WHERE c.promoter.id = :pid AND cp.status = 'received'
              AND cp.depositDate BETWEEN :from AND :to
            """).setParameter("pid", promoterId)
                .setParameter("from", from).setParameter("to", to).getResultList();
        return toBD(rows.get(0));
    }

    private BigDecimal calcLevelIncome(Integer sponsorId, LocalDate from, LocalDate to) {
        List<Associate> downline = associateRepo.findBySponsorId(sponsorId)
                .stream().filter(a -> a.getStatus() == Associate.AssociateStatus.active).toList();
        if (downline.isEmpty()) return BigDecimal.ZERO;
        List<Integer> ids = downline.stream().map(Associate::getId).toList();
        List<?> rows = em.createQuery("""
            SELECT COALESCE(SUM(cp.amount), 0)
            FROM CustomerPayment cp JOIN cp.customer c
            WHERE c.promoter.id IN :ids AND cp.status = 'received'
              AND cp.depositDate BETWEEN :from AND :to
            """).setParameter("ids", ids)
                .setParameter("from", from).setParameter("to", to).getResultList();
        return toBD(rows.get(0)).multiply(BigDecimal.valueOf(0.02)).setScale(2, RoundingMode.HALF_UP);
    }

    private String generatePayoutCode() {
        Optional<String> max = payoutRepo.findMaxPayoutCode();
        if (max.isEmpty()) return "PY001";
        int num = Integer.parseInt(max.get().replace("PY", ""));
        return String.format("PY%03d", num + 1);
    }

    private boolean isAdmin(Associate me) {
        return me.getRole() == Associate.Role.super_admin || me.getRole() == Associate.Role.manager;
    }

    private BigDecimal toBD(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal bd) return bd;
        return BigDecimal.valueOf(((Number) val).doubleValue()).setScale(2, RoundingMode.HALF_UP);
    }
}