package com.avyahome.crm.service;

import com.avyahome.crm.entity.*;
import com.avyahome.crm.repository.*;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PdfService {

    private final PayoutRepository payoutRepo;
    private final PayoutPaymentRepository payoutPaymentRepo;
    private final CustomerRepository customerRepo;
    private final CustomerPaymentRepository customerPaymentRepo;
    private final AssociateRepository associateRepo;

    @PersistenceContext
    private EntityManager em;

    @Value("${app.company.name}")
    private String companyName;

    @Value("${app.company.email}")
    private String companyEmail;

    // ── PAYOUT STATEMENT ───────────────────────────────────────────────────

    public void streamPayoutStatement(Integer id, Associate me, HttpServletResponse response) throws IOException {
        Payout payout = payoutRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        boolean isAdmin = isAdmin(me);
        if (!isAdmin && !me.getId().equals(payout.getAssociate().getId()))
            throw new RuntimeException("FORBIDDEN");

        List<PayoutPayment> bankTransfers = payoutPaymentRepo.findByPayoutIdOrderByCreatedAtDesc(id);
        Associate a = payout.getAssociate();

        String filename = "Payout_" + payout.getPayoutCode() + "_" + a.getAssociateCode() + ".pdf";
        setupPdfResponse(response, filename);

        PdfDocument pdf = new PdfDocument(new PdfWriter(response.getOutputStream()));
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(36, 36, 36, 36);

        // Header
        doc.add(centeredPara(companyName, 18, true));
        doc.add(centeredPara("Payout Statement", 14, false));
        doc.add(new Paragraph("\n"));

        // Associate info
        doc.add(kvRow("Associate", a.getName() + " (" + a.getAssociateCode() + ")"));
        doc.add(kvRow("Period", payout.getFromDate() + " to " + payout.getToDate()));
        doc.add(kvRow("Payout Code", payout.getPayoutCode()));
        doc.add(kvRow("Status", payout.getStatus().name().toUpperCase()));
        doc.add(new Paragraph("\n"));

        // Income breakdown table
        Table incomeTable = new Table(UnitValue.createPercentArray(new float[]{70, 30})).useAllAvailableWidth();
        addTableHeader(incomeTable, new String[]{"Income Component", "Amount (₹)"});
        addTableRow(incomeTable, "Self Income",       fmt(payout.getSelfIncome()));
        addTableRow(incomeTable, "Level Income",      fmt(payout.getLevelIncome()));
        addTableRow(incomeTable, "Leadership Income", fmt(payout.getLeadershipIncome()));
        addTableRow(incomeTable, "Royalty Income",    fmt(payout.getRoyaltyIncome()));
        addTableRow(incomeTable, "Advance Bonus",     fmt(payout.getAdvanceBonus()));
        addTableRow(incomeTable, "Monthly Bonus",     fmt(payout.getMonthlyBonus()));
        addTableRow(incomeTable, "Total Income",      fmt(payout.getTotalIncome()));
        addTableRow(incomeTable, "Admin Charge (-)",  fmt(payout.getAdminCharge()));
        addTableRow(incomeTable, "TDS @ " + payout.getTdsPercentage() + "% (-)", fmt(payout.getTdsAmount()));
        addTableRow(incomeTable, "Net Payable",       fmt(payout.getNetPayable()));
        doc.add(incomeTable);

        doc.add(new Paragraph("\n"));

        // Bank transfer records
        if (!bankTransfers.isEmpty()) {
            doc.add(boldPara("Bank Transfer Details"));
            Table btTable = new Table(UnitValue.createPercentArray(new float[]{20, 30, 20, 30})).useAllAvailableWidth();
            addTableHeader(btTable, new String[]{"Mode", "Ref Number", "Date", "Net Paid (₹)"});
            for (PayoutPayment bt : bankTransfers) {
                addTableRow(btTable,
                    bt.getModeOfPay().name().toUpperCase(),
                    bt.getRefNumber(),
                    String.valueOf(bt.getRefDate()),
                    fmt(bt.getNetPaid())
                );
            }
            doc.add(btTable);
        }

        // Footer
        doc.add(new Paragraph("\n"));
        doc.add(centeredPara("This is a computer-generated document. — " + companyName, 8, false));
        doc.close();
    }

    // ── BOOKING RECEIPT ────────────────────────────────────────────────────

    public void streamBookingReceipt(Integer id, Associate me, HttpServletResponse response) throws IOException {
        Customer customer = customerRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        boolean isAdmin = isAdmin(me);
        if (!isAdmin && (customer.getPromoter() == null || !me.getId().equals(customer.getPromoter().getId())))
            throw new RuntimeException("FORBIDDEN");

        List<CustomerPayment> payments = em.createQuery("""
            SELECT cp FROM CustomerPayment cp
            WHERE cp.customer.id = :cid AND cp.status = 'received'
            ORDER BY cp.depositDate ASC
            """, CustomerPayment.class).setParameter("cid", id).getResultList();

        Plot plot = customer.getPlot();
        String filename = "BookingReceipt_" +
            customer.getName().replace(" ", "_") +
            (plot != null ? "_Plot" + plot.getPlotNumber() : "") + ".pdf";

        setupPdfResponse(response, filename);
        PdfDocument pdf = new PdfDocument(new PdfWriter(response.getOutputStream()));
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(36, 36, 36, 36);

        doc.add(centeredPara(companyName, 18, true));
        doc.add(centeredPara("Booking Receipt", 14, false));
        doc.add(new Paragraph("\n"));

        doc.add(kvRow("Customer Name", customer.getName()));
        doc.add(kvRow("Mobile", customer.getMobile()));
        doc.add(kvRow("Booking Date", String.valueOf(customer.getBookingDate())));
        if (plot != null) {
            doc.add(kvRow("Plot Number", plot.getPlotNumber()));
            doc.add(kvRow("Project", plot.getProject() != null ? plot.getProject().getProjectName() : "-"));
            doc.add(kvRow("Area", plot.getDimensionSqft() + " sqft"));
        }
        doc.add(kvRow("Total Amount", "₹ " + fmt(customer.getTotalAmount())));
        doc.add(kvRow("Amount Paid", "₹ " + fmt(customer.getAmountPaid())));
        doc.add(kvRow("Balance Due", "₹ " + fmt(customer.getBalanceDue())));
        doc.add(new Paragraph("\n"));

        if (!payments.isEmpty()) {
            doc.add(boldPara("Payment History"));
            Table pt = new Table(UnitValue.createPercentArray(new float[]{15, 20, 20, 25, 20})).useAllAvailableWidth();
            addTableHeader(pt, new String[]{"#", "Date", "Mode", "Ref No.", "Amount (₹)"});
            int i = 1;
            for (CustomerPayment p : payments) {
                addTableRow(pt,
                    String.valueOf(i++),
                    String.valueOf(p.getDepositDate()),
                    p.getPaymentMode().name(),
                    p.getRefChqNumber() != null ? p.getRefChqNumber() : "-",
                    fmt(p.getAmount())
                );
            }
            doc.add(pt);
        }

        doc.add(new Paragraph("\n"));
        doc.add(centeredPara("This is a computer-generated receipt. — " + companyName, 8, false));
        doc.close();
    }

    // ── WELCOME LETTER ─────────────────────────────────────────────────────

    public void streamWelcomeLetter(Integer targetId, Associate me, HttpServletResponse response) throws IOException {
        Associate associate = associateRepo.findById(targetId)
            .orElseThrow(() -> new RuntimeException("NOT_FOUND"));

        String filename = "WelcomeLetter_" + associate.getAssociateCode() + "_" +
            associate.getName().replace(" ", "_") + ".pdf";
        setupPdfResponse(response, filename);

        PdfDocument pdf = new PdfDocument(new PdfWriter(response.getOutputStream()));
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(72, 72, 72, 72);

        doc.add(centeredPara(companyName, 20, true));
        doc.add(centeredPara("Associate Welcome Letter", 14, false));
        doc.add(new Paragraph("\n\n"));

        doc.add(new Paragraph("Dear " + associate.getName() + ",").setBold());
        doc.add(new Paragraph("\n"));
        doc.add(new Paragraph(
            "We are delighted to welcome you to the " + companyName + " family! " +
            "Your registration as a valued associate marks the beginning of a rewarding journey with us."
        ));
        doc.add(new Paragraph("\n"));

        doc.add(boldPara("Your Associate Details:"));
        doc.add(kvRow("Associate ID", associate.getAssociateCode()));
        doc.add(kvRow("Name", associate.getName()));
        doc.add(kvRow("Mobile", associate.getMobile()));
        doc.add(kvRow("Email", associate.getEmail() != null ? associate.getEmail() : "-"));
        doc.add(kvRow("Joining Date", String.valueOf(associate.getJoiningDate())));
        doc.add(kvRow("Commission", associate.getCommissionPct() + "%"));

        if (associate.getSponsor() != null) {
            doc.add(kvRow("Sponsored By", associate.getSponsor().getName() +
                " (" + associate.getSponsor().getAssociateCode() + ")"));
        }

        doc.add(new Paragraph("\n"));
        doc.add(new Paragraph(
            "We wish you great success in your endeavours. If you have any questions, " +
            "please reach out to us at " + companyEmail + "."
        ));
        doc.add(new Paragraph("\n\n"));
        doc.add(new Paragraph("Warm regards,").setItalic());
        doc.add(new Paragraph(companyName).setBold());
        doc.close();
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private void setupPdfResponse(HttpServletResponse response, String filename) {
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "inline; filename=\"" + filename + "\"");
    }

    private String fmt(BigDecimal amount) {
        if (amount == null) return "0.00";
        return NumberFormat.getNumberInstance(new Locale("en", "IN"))
            .format(amount.doubleValue());
    }

    private Paragraph centeredPara(String text, int fontSize, boolean bold) {
        Paragraph p = new Paragraph(text)
            .setFontSize(fontSize)
            .setTextAlignment(TextAlignment.CENTER);
        if (bold) p.setBold();
        return p;
    }

    private Paragraph boldPara(String text) {
        return new Paragraph(text).setBold();
    }

    private Paragraph kvRow(String key, String value) {
        return new Paragraph(key + ": " + value);
    }

    private void addTableHeader(Table table, String[] headers) {
        for (String h : headers) {
            table.addHeaderCell(new Cell().add(new Paragraph(h).setBold())
                .setBackgroundColor(ColorConstants.LIGHT_GRAY));
        }
    }

    private void addTableRow(Table table, String... cells) {
        for (String c : cells) {
            table.addCell(new Cell().add(new Paragraph(c != null ? c : "-")));
        }
    }

    private boolean isAdmin(Associate me) {
        return me.getRole() == Associate.Role.super_admin || me.getRole() == Associate.Role.manager;
    }
}
