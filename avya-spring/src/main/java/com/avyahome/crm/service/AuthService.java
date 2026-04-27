package com.avyahome.crm.service;

import com.avyahome.crm.dto.request.*;
import com.avyahome.crm.entity.*;
import com.avyahome.crm.repository.*;
import com.avyahome.crm.util.AuditService;
import com.avyahome.crm.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AssociateRepository associateRepo;
    private final RefreshTokenRepository refreshTokenRepo;
    private final OtpRepository otpRepo;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final EmailService emailService;

    @Transactional
    public Map<String, Object> login(LoginRequest req, HttpServletRequest httpReq) {
        String mobile = req.getMobile().trim();
        log.info("LOGIN ATTEMPT — mobile: {}", mobile);

        Optional<Associate> optAssociate = associateRepo.findByMobile(mobile);
        if (optAssociate.isEmpty()) {
            log.warn("LOGIN FAILED — mobile not found: {}", mobile);
            throw new RuntimeException("INVALID_CREDENTIALS");
        }

        Associate associate = optAssociate.get();
        log.info("LOGIN — found: id={}, status={}, hashLen={}",
                associate.getId(), associate.getStatus(),
                associate.getPasswordHash() != null ? associate.getPasswordHash().length() : 0);

        if (associate.getStatus() == Associate.AssociateStatus.suspended)
            throw new RuntimeException("SUSPENDED");
        if (associate.getStatus() == Associate.AssociateStatus.inactive)
            throw new RuntimeException("INACTIVE");

        boolean passwordMatches = passwordEncoder.matches(req.getPassword(), associate.getPasswordHash());
        log.info("LOGIN — passwordMatch={} inputLen={} hashLen={}",
                passwordMatches, req.getPassword().length(),
                associate.getPasswordHash() != null ? associate.getPasswordHash().length() : 0);

        if (!passwordMatches) {
            log.warn("LOGIN FAILED — wrong password for: {}", mobile);
            throw new RuntimeException("INVALID_CREDENTIALS");
        }

        Map<String, Object> claims = Map.of(
                "id", associate.getId(),
                "associate_code", associate.getAssociateCode(),
                "role", associate.getRole().name()
        );
        String accessToken  = jwtUtil.generateAccessToken(claims, String.valueOf(associate.getId()));
        String refreshToken = jwtUtil.generateRefreshToken(String.valueOf(associate.getId()));

        RefreshToken rtEntity = RefreshToken.builder()
                .associate(associate)
                .tokenHash(jwtUtil.hashToken(refreshToken))
                .expiresAt(LocalDateTime.now().plusDays(7))
                .ipAddress(httpReq.getRemoteAddr())
                .userAgent(httpReq.getHeader("User-Agent"))
                .build();
        refreshTokenRepo.save(rtEntity);

        auditService.log(associate, "LOGIN", "associate", associate.getId(),
                null, Map.of("mobile", associate.getMobile()), httpReq);

        log.info("LOGIN SUCCESS — mobile: {}", mobile);

        Map<String, Object> data = new HashMap<>();
        data.put("associate", safeAssociate(associate));
        data.put("accessToken", accessToken);
        data.put("refreshToken", refreshToken);
        return data;
    }

    public Map<String, Object> refreshToken(String token) {
        if (token == null) throw new RuntimeException("REFRESH_TOKEN_REQUIRED");
        String hash = jwtUtil.hashToken(token);
        RefreshToken rt = refreshTokenRepo
                .findByTokenHashAndIsRevokedFalseAndExpiresAtAfter(hash, LocalDateTime.now())
                .orElseThrow(() -> new RuntimeException("INVALID_REFRESH_TOKEN"));
        Associate associate = rt.getAssociate();
        if (associate.getStatus() != Associate.AssociateStatus.active)
            throw new RuntimeException("ACCOUNT_NOT_ACTIVE");
        Map<String, Object> newClaims = Map.of(
                "id", associate.getId(),
                "associate_code", associate.getAssociateCode(),
                "role", associate.getRole().name()
        );
        String newAccessToken = jwtUtil.generateAccessToken(newClaims, String.valueOf(associate.getId()));
        return Map.of("accessToken", newAccessToken);
    }

    @Transactional
    public void logout(Integer associateId, String refreshToken) {
        if (refreshToken != null) {
            refreshTokenRepo.revokeByHash(jwtUtil.hashToken(refreshToken));
        } else {
            refreshTokenRepo.revokeAllByAssociateId(associateId);
        }
    }

    @Transactional
    public void forgotPassword(String mobile) {
        Associate associate = associateRepo.findByMobile(mobile.trim())
                .orElseThrow(() -> new RuntimeException("MOBILE_NOT_FOUND"));
        otpRepo.invalidateAll(mobile, Otp.OtpPurpose.forgot_password);
        String otpCode = jwtUtil.generateOTP();
        Otp otp = Otp.builder()
                .mobile(mobile)
                .email(associate.getEmail())
                .otpCode(otpCode)
                .purpose(Otp.OtpPurpose.forgot_password)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();
        otpRepo.save(otp);
        if (associate.getEmail() != null) {
            emailService.sendOtpEmail(associate.getEmail(), associate.getName(), otpCode);
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        Otp otp = otpRepo.findTopByMobileAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        req.getMobile(), Otp.OtpPurpose.forgot_password, LocalDateTime.now())
                .orElseThrow(() -> new RuntimeException("INVALID_OTP"));
        if (!otp.getOtpCode().equals(req.getOtp()))
            throw new RuntimeException("INVALID_OTP");
        otp.setIsUsed(true);
        otpRepo.save(otp);
        Associate associate = associateRepo.findByMobile(req.getMobile())
                .orElseThrow(() -> new RuntimeException("MOBILE_NOT_FOUND"));
        associate.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        associateRepo.save(associate);
        refreshTokenRepo.revokeAllByAssociateId(associate.getId());
    }

    @Transactional
    public void changePassword(Associate associate, ChangePasswordRequest req) {
        if (!req.getNewPassword().equals(req.getConfirmPassword()))
            throw new RuntimeException("PASSWORDS_DO_NOT_MATCH");
        if (!passwordEncoder.matches(req.getOldPassword(), associate.getPasswordHash()))
            throw new RuntimeException("WRONG_OLD_PASSWORD");
        associate.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        associateRepo.save(associate);
        refreshTokenRepo.revokeAllByAssociateId(associate.getId());
    }

    // ── FIX: Node returns { profile, sponsor } — Spring must match ──
    public Map<String, Object> getProfile(Integer id) {
        Associate a = associateRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("NOT_FOUND"));
        Optional<Associate> sponsor = a.getSponsor() != null
                ? associateRepo.findById(a.getSponsor().getId()) : Optional.empty();

        Map<String, Object> sponsorMap = sponsor.<Map<String, Object>>map(s -> {
            Map<String, Object> sm = new HashMap<>();
            sm.put("id", s.getId());
            sm.put("associate_code", s.getAssociateCode());
            sm.put("name", s.getName());
            sm.put("mobile", s.getMobile());
            return sm;
        }).orElse(null);

        // Node returns data.data.profile — frontend reads data.data.profile
        return Map.of(
                "profile", fullAssociate(a),
                "sponsor", sponsorMap != null ? sponsorMap : new HashMap<>()
        );
    }

    @Transactional
    public void updateProfile(Associate associate, UpdateProfileRequest req, HttpServletRequest httpReq) {
        Associate old = associateRepo.findById(associate.getId()).orElseThrow();
        if (req.getName() != null)              old.setName(req.getName().trim());
        if (req.getEmail() != null)             old.setEmail(req.getEmail());
        if (req.getFatherName() != null)        old.setFatherName(req.getFatherName());
        if (req.getDateOfBirth() != null)       old.setDateOfBirth(req.getDateOfBirth());
        if (req.getAnniversaryDate() != null)   old.setAnniversaryDate(req.getAnniversaryDate());
        if (req.getAddress() != null)           old.setAddress(req.getAddress());
        if (req.getPanNumber() != null)         old.setPanNumber(req.getPanNumber());
        if (req.getAadharNumber() != null)      old.setAadharNumber(req.getAadharNumber());
        if (req.getNomineeName() != null)       old.setNomineeName(req.getNomineeName());
        if (req.getNomineeRelation() != null)   old.setNomineeRelation(req.getNomineeRelation());
        if (req.getNomineeAge() != null)        old.setNomineeAge(req.getNomineeAge());
        if (req.getNomineeMobile() != null)     old.setNomineeMobile(req.getNomineeMobile());
        if (req.getBankAccountNo() != null)     old.setBankAccountNo(req.getBankAccountNo());
        if (req.getBankIfsc() != null)          old.setBankIfsc(req.getBankIfsc());
        if (req.getBankName() != null)          old.setBankName(req.getBankName());
        if (req.getBankBranch() != null)        old.setBankBranch(req.getBankBranch());
        associateRepo.save(old);
        auditService.log(associate, "UPDATE_PROFILE", "associate", associate.getId(), null, req, httpReq);
    }

    // ── Login response: minimal safe associate ────────────────
    private Map<String, Object> safeAssociate(Associate a) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.getId());
        map.put("associate_code", a.getAssociateCode());
        map.put("name", a.getName());
        map.put("mobile", a.getMobile());
        map.put("email", a.getEmail());
        map.put("role", a.getRole());
        map.put("status", a.getStatus());
        map.put("commission_pct", a.getCommissionPct());
        map.put("joining_date", a.getJoiningDate());
        return map;
    }

    // ── Profile response: full associate (matches Node SELECT *) ─
    private Map<String, Object> fullAssociate(Associate a) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.getId());
        map.put("associate_code", a.getAssociateCode());
        map.put("name", a.getName());
        map.put("mobile", a.getMobile());
        map.put("email", a.getEmail());
        map.put("role", a.getRole());
        map.put("status", a.getStatus());
        map.put("commission_pct", a.getCommissionPct());
        map.put("joining_date", a.getJoiningDate());
        map.put("father_name", a.getFatherName());
        map.put("date_of_birth", a.getDateOfBirth());
        map.put("anniversary_date", a.getAnniversaryDate());
        map.put("gender", a.getGender());
        map.put("marital_status", a.getMaritalStatus());
        map.put("current_occupation", a.getCurrentOccupation());
        map.put("work_company", a.getWorkCompany());
        map.put("pan_number", a.getPanNumber());
        map.put("aadhar_number", a.getAadharNumber());
        map.put("address", a.getAddress());
        map.put("nominee_name", a.getNomineeName());
        map.put("nominee_relation", a.getNomineeRelation());
        map.put("nominee_age", a.getNomineeAge());
        map.put("nominee_mobile", a.getNomineeMobile());
        map.put("nominee_gender", a.getNomineeGender());
        map.put("bank_account_no", a.getBankAccountNo());
        map.put("bank_ifsc", a.getBankIfsc());
        map.put("bank_name", a.getBankName());
        map.put("bank_branch", a.getBankBranch());
        map.put("created_at", a.getCreatedAt());
        return map;
    }
}