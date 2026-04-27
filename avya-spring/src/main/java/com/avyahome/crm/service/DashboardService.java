package com.avyahome.crm.service;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.repository.AssociateRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final AssociateRepository associateRepo;

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard(Associate me) {
        Integer id = me.getId();

        // ── Direct member count ─────────────────────────────────────────
        Long directCount = em.createQuery(
                        "SELECT COUNT(a) FROM Associate a WHERE a.sponsor.id = :id", Long.class)
                .setParameter("id", id).getSingleResult();

        // ── All descendants (BFS) ───────────────────────────────────────
        List<Integer> teamIds = getAllDescendants(id);
        int teamCount = teamIds.size();

        // ── Self total business ─────────────────────────────────────────
        BigDecimal selfBusiness = querySumBD("""
            SELECT COALESCE(SUM(cp.amount), 0)
            FROM CustomerPayment cp JOIN cp.customer c
            WHERE c.promoter.id = :pid AND cp.status = 'received'
            """, Map.of("pid", id));

        // ── Self this month ─────────────────────────────────────────────
        BigDecimal monthSelf = querySumBD("""
            SELECT COALESCE(SUM(cp.amount), 0)
            FROM CustomerPayment cp JOIN cp.customer c
            WHERE c.promoter.id = :pid AND cp.status = 'received'
              AND MONTH(cp.depositDate) = MONTH(CURRENT_DATE)
              AND YEAR(cp.depositDate)  = YEAR(CURRENT_DATE)
            """, Map.of("pid", id));

        // ── Team this month ─────────────────────────────────────────────
        BigDecimal monthTeam = BigDecimal.ZERO;
        if (!teamIds.isEmpty()) {
            Object val = em.createQuery("""
                SELECT COALESCE(SUM(cp.amount), 0)
                FROM CustomerPayment cp JOIN cp.customer c
                WHERE c.promoter.id IN :ids AND cp.status = 'received'
                  AND MONTH(cp.depositDate) = MONTH(CURRENT_DATE)
                  AND YEAR(cp.depositDate)  = YEAR(CURRENT_DATE)
                """).setParameter("ids", teamIds).getSingleResult();
            monthTeam = toBD(val);
        }

        // ── Paid payout totals ──────────────────────────────────────────
        List<?> payoutTotals = em.createQuery("""
            SELECT COALESCE(SUM(p.netPayable), 0), COALESCE(SUM(p.tdsAmount), 0)
            FROM Payout p WHERE p.associate.id = :id AND p.status = 'paid'
            """).setParameter("id", id).getResultList();
        Object[] pt = (Object[]) payoutTotals.get(0);
        BigDecimal myPayout = toBD(pt[0]);

        // ── Booking stats ───────────────────────────────────────────────
        List<?> bookingStats = em.createQuery("""
            SELECT COUNT(c), COALESCE(SUM(pl.dimensionSqft), 0)
            FROM Customer c JOIN c.plot pl
            WHERE c.promoter.id = :id
            """).setParameter("id", id).getResultList();
        Object[] bs = (Object[]) bookingStats.get(0);
        long totalBookings = (Long) bs[0];
        BigDecimal totalSqft = toBD(bs[1]);

        // ── Monthly bookings ────────────────────────────────────────────
        Long monthBookings = em.createQuery("""
            SELECT COUNT(c) FROM Customer c
            WHERE c.promoter.id = :id
              AND MONTH(c.bookingDate) = MONTH(CURRENT_DATE)
              AND YEAR(c.bookingDate)  = YEAR(CURRENT_DATE)
            """, Long.class).setParameter("id", id).getSingleResult();

        // ── 12-month payment analytics ──────────────────────────────────
        // FIX: Use :startDate parameter instead of CURRENT_DATE - 365 (Hibernate 6 doesn't support integer subtraction from date)
        LocalDate startDate = LocalDate.now().minusMonths(11).withDayOfMonth(1);

        List<?> analyticsRows = em.createQuery("""
            SELECT YEAR(cp.depositDate), MONTH(cp.depositDate), COALESCE(SUM(cp.amount), 0)
            FROM CustomerPayment cp JOIN cp.customer c
            WHERE c.promoter.id = :id AND cp.status = 'received'
              AND cp.depositDate >= :startDate
            GROUP BY YEAR(cp.depositDate), MONTH(cp.depositDate)
            ORDER BY YEAR(cp.depositDate) ASC, MONTH(cp.depositDate) ASC
            """)
                .setParameter("id", id)
                .setParameter("startDate", startDate)
                .getResultList();

        // Format month same as Node.js: "Oct 2025"
        String[] monthNames = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};
        List<Map<String, Object>> analytics = analyticsRows.stream().map(r -> {
            Object[] row = (Object[]) r;
            int yr = ((Number) row[0]).intValue();
            int mn = ((Number) row[1]).intValue();
            String month = monthNames[mn - 1] + " " + yr;
            Map<String, Object> a = new LinkedHashMap<>();
            a.put("month", month);
            a.put("yr", yr);
            a.put("mn", mn);
            a.put("total", toBD(row[2]));
            return a;
        }).toList();

        // ── Compose response (matches Node.js dashboard exactly) ────────
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("directMembers", directCount);
        data.put("teamMembers", teamCount);
        data.put("totalSelfBusiness", selfBusiness);
        data.put("monthlyBusinessSelf", monthSelf);
        data.put("monthlyBusinessTeam", monthTeam);
        data.put("myPayout", myPayout);
        data.put("myPayment", myPayout);
        data.put("balance", BigDecimal.ZERO);
        data.put("totalBookings", totalBookings);
        data.put("totalSqft", totalSqft);
        data.put("monthlyBookings", monthBookings);
        data.put("analytics", analytics);
        return data;
    }

    private List<Integer> getAllDescendants(Integer rootId) {
        List<Integer> all = new ArrayList<>();
        Queue<Integer> queue = new LinkedList<>();
        queue.add(rootId);
        while (!queue.isEmpty()) {
            Integer cur = queue.poll();
            List<Integer> children = em.createQuery(
                            "SELECT a.id FROM Associate a WHERE a.sponsor.id = :pid", Integer.class)
                    .setParameter("pid", cur).getResultList();
            all.addAll(children);
            queue.addAll(children);
        }
        return all;
    }

    private BigDecimal querySumBD(String jpql, Map<String, Object> params) {
        var q = em.createQuery(jpql);
        params.forEach(q::setParameter);
        return toBD(q.getSingleResult());
    }

    private BigDecimal toBD(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal bd) return bd;
        return BigDecimal.valueOf(((Number) val).doubleValue());
    }
}