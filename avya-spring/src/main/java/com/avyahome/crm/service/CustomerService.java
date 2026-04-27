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
public class CustomerService {

    private final CustomerRepository customerRepo;
    private final CustomerPaymentRepository paymentRepo;
    private final PlotRepository plotRepo;
    private final AssociateRepository associateRepo;
    private final AuditService auditService;

    @PersistenceContext
    private EntityManager em;

    // ── CREATE BOOKING ─────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> create(Map<String, Object> body, Associate me, HttpServletRequest httpReq) {
        Integer plotId    = (Integer) body.get("plot_id");
        String name       = (String) body.get("name");
        String mobile     = (String) body.get("mobile");
        String bookingDate= (String) body.get("booking_date");

        if (name == null || mobile == null || plotId == null || bookingDate == null)
            throw new RuntimeException("VALIDATION");

        // Lock plot row and validate
        Plot plot = plotRepo.findById(plotId).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        if (plot.getStatus() != Plot.PlotStatus.available && plot.getStatus() != Plot.PlotStatus.hold)
            throw new RuntimeException("PLOT_NOT_AVAILABLE");

        Integer promoterId = (Integer) body.get("promoter_id");
        Associate promoter = null;
        if (promoterId != null) {
            promoter = associateRepo.findById(promoterId)
                .filter(a -> a.getStatus() == Associate.AssociateStatus.active)
                .orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        }

        BigDecimal base        = plot.getDimensionSqft().multiply(plot.getBspPerSqft());
        BigDecimal plcCharges  = plot.getPlcCharges() != null ? plot.getPlcCharges() : BigDecimal.ZERO;
        BigDecimal discount    = body.get("plc_discount") != null
            ? toBD(body.get("plc_discount")) : BigDecimal.ZERO;
        BigDecimal totalAmount = base.add(plcCharges).subtract(discount);

        Customer customer = Customer.builder()
            .name(name.trim())
            .mobile(mobile.trim())
            .email((String) body.get("email"))
            .aadharNumber((String) body.get("aadhar_number"))
            .panNumber((String) body.get("pan_number"))
            .address((String) body.get("address"))
            .plot(plot)
            .promoter(promoter)
            .bookingDate(LocalDate.parse(bookingDate))
            .totalAmount(totalAmount)
            .amountPaid(BigDecimal.ZERO)
            .status(Customer.CustomerStatus.active)
            .createdBy(me)
            .build();
        customerRepo.save(customer);

        // Mark plot as booked
        plot.setStatus(Plot.PlotStatus.booked);
        plot.setStatusUpdatedAt(LocalDateTime.now());
        plotRepo.save(plot);

        auditService.log(me, "CREATE_CUSTOMER", "customer", customer.getId(),
            null, Map.of("name", name, "mobile", mobile, "plot_id", plotId, "total_amount", totalAmount), httpReq);

        return Map.of("id", customer.getId(), "total_amount", totalAmount, "plot_status", "booked");
    }

    // ── LIST CUSTOMERS ─────────────────────────────────────────────────────

    public ResponseEntity<Map<String, Object>> getAll(
        String search, String statusStr, Integer promoterId,
        int page, int limit, Associate me
    ) {
        boolean isAdmin = isAdmin(me);
        Integer effectivePromoter = isAdmin ? promoterId : me.getId();

        Customer.CustomerStatus status = statusStr != null
            ? Customer.CustomerStatus.valueOf(statusStr) : null;

        PageRequest pageable = PageRequest.of(page - 1, limit,
            Sort.by("bookingDate").descending().and(Sort.by("id").descending()));
        Page<Customer> result = customerRepo.findAllFiltered(search, effectivePromoter, status, pageable);
        return ResponseUtil.paginated(result.getContent(), result.getTotalElements(), page, limit, "Success");
    }

    // ── GET SINGLE ─────────────────────────────────────────────────────────

    public Map<String, Object> getOne(Integer id, Associate me) {
        Customer c = customerRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        if (!isAdmin(me) && !me.getId().equals(c.getPromoter() != null ? c.getPromoter().getId() : null))
            throw new RuntimeException("FORBIDDEN");

        List<CustomerPayment> payments = paymentRepo.findByCustomerIdOrderByCreatedAtDesc(id);
        return Map.of("customer", c, "payments", payments);
    }

    // ── UPDATE ─────────────────────────────────────────────────────────────

    @Transactional
    public void update(Integer id, Map<String, Object> body, Associate me, HttpServletRequest httpReq) {
        Customer c = customerRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        Map<String, Object> old = Map.of("name", c.getName(), "mobile", c.getMobile());

        if (body.containsKey("name"))          c.setName((String) body.get("name"));
        if (body.containsKey("mobile"))        c.setMobile((String) body.get("mobile"));
        if (body.containsKey("email"))         c.setEmail((String) body.get("email"));
        if (body.containsKey("aadhar_number")) c.setAadharNumber((String) body.get("aadhar_number"));
        if (body.containsKey("pan_number"))    c.setPanNumber((String) body.get("pan_number"));
        if (body.containsKey("address"))       c.setAddress((String) body.get("address"));

        customerRepo.save(c);
        auditService.log(me, "UPDATE_CUSTOMER", "customer", id, old, body, httpReq);
    }

    // ── ADD PAYMENT ────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> addPayment(Integer customerId, Map<String, Object> body,
                                          Associate me, HttpServletRequest httpReq) {
        Customer c = customerRepo.findById(customerId).orElseThrow(() -> new RuntimeException("NOT_FOUND"));

        BigDecimal amount = toBD(body.get("amount"));
        if (amount.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("VALIDATION");

        String paymentModeStr = (String) body.get("payment_mode");
        if (paymentModeStr == null) throw new RuntimeException("VALIDATION");

        CustomerPayment payment = CustomerPayment.builder()
            .customer(c)
            .paymentType(body.get("payment_type") != null
                ? CustomerPayment.PaymentType.valueOf((String) body.get("payment_type"))
                : CustomerPayment.PaymentType.custom_installment)
            .paymentMode(CustomerPayment.PaymentMode.valueOf(paymentModeStr))
            .refChqNumber((String) body.get("ref_chq_number"))
            .refChqDate(body.get("ref_chq_date") != null ? LocalDate.parse((String) body.get("ref_chq_date")) : null)
            .refChqBank((String) body.get("ref_chq_bank"))
            .amount(amount)
            .depositDate(body.get("deposit_date") != null ? LocalDate.parse((String) body.get("deposit_date")) : null)
            .dueDate(body.get("due_date") != null ? LocalDate.parse((String) body.get("due_date")) : null)
            .remarks((String) body.get("remarks"))
            .status(CustomerPayment.PaymentStatus.received)
            .createdBy(me)
            .build();
        paymentRepo.save(payment);

        // Update amount_paid
        BigDecimal newPaid = c.getAmountPaid().add(amount);
        c.setAmountPaid(newPaid);

        // Auto mark sold_out if fully paid
        if (newPaid.compareTo(c.getTotalAmount()) >= 0) {
            c.setStatus(Customer.CustomerStatus.sold_out);
            Plot plot = c.getPlot();
            if (plot != null) {
                plot.setStatus(Plot.PlotStatus.sold_out);
                plot.setStatusUpdatedAt(LocalDateTime.now());
                plotRepo.save(plot);
            }
        }
        customerRepo.save(c);

        BigDecimal balance = c.getTotalAmount().subtract(newPaid).max(BigDecimal.ZERO);
        auditService.log(me, "ADD_PAYMENT", "customer_payment", payment.getId(),
            null, Map.of("customer_id", customerId, "amount", amount, "payment_mode", paymentModeStr), httpReq);

        return Map.of(
            "payment_id", payment.getId(),
            "amount_paid", newPaid,
            "balance_due", balance,
            "is_fully_paid", balance.compareTo(BigDecimal.ZERO) <= 0
        );
    }

    // ── GET PAYMENTS ───────────────────────────────────────────────────────

    public List<CustomerPayment> getPayments(Integer customerId) {
        return paymentRepo.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    // ── UPDATE PAYMENT STATUS ──────────────────────────────────────────────

    @Transactional
    public Map<String, Object> updatePayment(Integer customerId, Integer paymentId,
                                             String newStatus, Associate me, HttpServletRequest httpReq) {
        List<String> valid = List.of("received", "bounced", "cancelled");
        if (!valid.contains(newStatus)) throw new RuntimeException("VALIDATION");

        CustomerPayment cp = paymentRepo.findById(paymentId)
            .filter(p -> p.getCustomer().getId().equals(customerId))
            .orElseThrow(() -> new RuntimeException("NOT_FOUND"));

        if (cp.getStatus().name().equals(newStatus)) throw new RuntimeException("VALIDATION");

        cp.setStatus(CustomerPayment.PaymentStatus.valueOf(newStatus));
        paymentRepo.save(cp);

        // Recalculate amount_paid from all received payments
        BigDecimal totalReceived = paymentRepo.sumReceivedByCustomerId(customerId);
        Customer c = customerRepo.findById(customerId).orElseThrow();
        c.setAmountPaid(totalReceived);

        Plot plot = c.getPlot();
        if (totalReceived.compareTo(c.getTotalAmount()) >= 0) {
            c.setStatus(Customer.CustomerStatus.sold_out);
            if (plot != null) plot.setStatus(Plot.PlotStatus.sold_out);
        } else {
            c.setStatus(Customer.CustomerStatus.active);
            if (plot != null) plot.setStatus(Plot.PlotStatus.booked);
        }
        customerRepo.save(c);
        if (plot != null) plotRepo.save(plot);

        return Map.of("new_amount_paid", totalReceived);
    }

    // ── CANCEL BOOKING ─────────────────────────────────────────────────────

    @Transactional
    public void cancelBooking(Integer id, Associate me, HttpServletRequest httpReq) {
        Customer c = customerRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        if (c.getStatus() == Customer.CustomerStatus.cancelled)
            throw new RuntimeException("VALIDATION");

        Map<String, Object> old = Map.of("status", c.getStatus());
        c.setStatus(Customer.CustomerStatus.cancelled);
        customerRepo.save(c);

        if (c.getPlot() != null) {
            Plot plot = c.getPlot();
            plot.setStatus(Plot.PlotStatus.available);
            plot.setStatusUpdatedAt(LocalDateTime.now());
            plotRepo.save(plot);
        }
        auditService.log(me, "CANCEL_BOOKING", "customer", id, old, Map.of("status", "cancelled"), httpReq);
    }

    // ── MONTHLY BUSINESS ───────────────────────────────────────────────────

    public Map<String, Object> getMonthlyBusiness(
        String fromDate, String toDate, Integer projectId, String customerName, Associate me
    ) {
        boolean admin = isAdmin(me);

        StringBuilder jpql = new StringBuilder("""
            SELECT cp.id, cp.amount, cp.depositDate, cp.paymentMode,
                   c.name, c.bookingDate, c.mobile,
                   pl.project.projectName, pl.plotNumber, pl.dimensionSqft, pl.blockCode,
                   a.name, a.associateCode, cp.createdAt
            FROM CustomerPayment cp
            JOIN cp.customer c
            JOIN c.plot pl
            LEFT JOIN c.promoter a
            WHERE cp.status = 'received'
            """);

        Map<String, Object> params = new LinkedHashMap<>();
        if (!admin) { jpql.append(" AND c.promoter.id = :promoterId"); params.put("promoterId", me.getId()); }
        if (fromDate != null) { jpql.append(" AND cp.depositDate >= :from"); params.put("from", LocalDate.parse(fromDate)); }
        if (toDate != null)   { jpql.append(" AND cp.depositDate <= :to");   params.put("to", LocalDate.parse(toDate)); }
        if (projectId != null){ jpql.append(" AND pl.project.id = :pid");    params.put("pid", projectId); }
        if (customerName != null) { jpql.append(" AND c.name LIKE :cn");     params.put("cn", "%" + customerName + "%"); }
        jpql.append(" ORDER BY cp.depositDate DESC, cp.id DESC");

        var query = em.createQuery(jpql.toString());
        params.forEach(query::setParameter);
        List<?> rows = query.getResultList();

        BigDecimal totalAmount = rows.stream()
            .map(r -> (BigDecimal) ((Object[]) r)[1])
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
            "payments", rows,
            "summary", Map.of("total_records", rows.size(), "total_amount", totalAmount)
        );
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private boolean isAdmin(Associate me) {
        return me.getRole() == Associate.Role.super_admin || me.getRole() == Associate.Role.manager;
    }

    private BigDecimal toBD(Object val) {
        if (val == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(((Number) val).doubleValue()).setScale(2, RoundingMode.HALF_UP);
    }
}
