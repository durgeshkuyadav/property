package com.avyahome.crm.security;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.repository.AssociateRepository;
import com.avyahome.crm.util.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final AssociateRepository associateRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        try {
            Claims claims = jwtUtil.parseAccessToken(token);
            Integer id = claims.get("id", Integer.class);

            Optional<Associate> opt = associateRepository.findById(id);
            if (opt.isEmpty() || opt.get().getStatus() != Associate.AssociateStatus.active) {
                chain.doFilter(request, response);
                return;
            }

            Associate associate = opt.get();
            String roleStr = "ROLE_" + associate.getRole().name().toUpperCase();
            var auth = new UsernamePasswordAuthenticationToken(
                associate, null, List.of(new SimpleGrantedAuthority(roleStr))
            );
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);

        } catch (JwtException e) {
            // Token invalid or expired — leave SecurityContext empty; endpoint security will reject
        }

        chain.doFilter(request, response);
    }
}
