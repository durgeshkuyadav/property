package com.avyahome.crm.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HexFormat;
import java.util.Map;
import java.util.Random;

@Component
public class JwtUtil {

    private final SecretKey accessKey;
    private final SecretKey refreshKey;
    private final long accessExpirationMs;
    private final long refreshExpirationMs;
    private final String issuer;

    public JwtUtil(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.refresh-secret}") String refreshSecret,
        @Value("${app.jwt.expiration-ms}") long accessExpirationMs,
        @Value("${app.jwt.refresh-expiration-ms}") long refreshExpirationMs,
        @Value("${app.jwt.issuer}") String issuer
    ) {
        this.accessKey       = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.refreshKey      = Keys.hmacShaKeyFor(refreshSecret.getBytes(StandardCharsets.UTF_8));
        this.accessExpirationMs  = accessExpirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
        this.issuer = issuer;
    }

    public String generateAccessToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
            .claims(claims)
            .subject(subject)
            .issuer(issuer)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + accessExpirationMs))
            .signWith(accessKey)
            .compact();
    }

    public String generateRefreshToken(String subject) {
        return Jwts.builder()
            .subject(subject)
            .issuer(issuer)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + refreshExpirationMs))
            .signWith(refreshKey)
            .compact();
    }

    public Claims parseAccessToken(String token) {
        return Jwts.parser().verifyWith(accessKey).requireIssuer(issuer).build()
            .parseSignedClaims(token).getPayload();
    }

    public Claims parseRefreshToken(String token) {
        return Jwts.parser().verifyWith(refreshKey).requireIssuer(issuer).build()
            .parseSignedClaims(token).getPayload();
    }

    /** SHA-256 hash of token — stored in DB (mirrors hashToken in jwt.js) */
    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public String generateOTP() {
        return String.format("%06d", 100000 + new Random().nextInt(900000));
    }
}
