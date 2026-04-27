package com.avyahome.crm.service;

import com.avyahome.crm.entity.Associate;
import com.avyahome.crm.entity.Project;
import com.avyahome.crm.repository.ProjectRepository;
import com.avyahome.crm.util.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepo;
    private final AuditService auditService;

    public List<Project> getAll() {
        return projectRepo.findAllByOrderByCreatedAtDesc();
    }

    public Project getOne(Integer id) {
        return projectRepo.findById(id).orElseThrow(() -> new RuntimeException("NOT_FOUND"));
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body, Associate me, HttpServletRequest httpReq) {
        String name = (String) body.get("project_name");
        if (name == null || name.trim().length() < 2) throw new RuntimeException("VALIDATION");
        if (projectRepo.existsByProjectName(name.trim())) throw new RuntimeException("MOBILE_ALREADY_EXISTS");

        Project p = Project.builder()
            .projectName(name.trim())
            .location((String) body.get("location"))
            .totalPlots(body.get("total_plots") != null ? ((Number) body.get("total_plots")).intValue() : 0)
            .basePriceSqft(body.get("base_price_sqft") != null
                ? BigDecimal.valueOf(((Number) body.get("base_price_sqft")).doubleValue()) : null)
            .description((String) body.get("description"))
            .createdBy(me)
            .build();
        projectRepo.save(p);
        auditService.log(me, "CREATE_PROJECT", "project", p.getId(), null, body, httpReq);
        return Map.of("id", p.getId());
    }

    @Transactional
    public void update(Integer id, Map<String, Object> body, Associate me, HttpServletRequest httpReq) {
        Project p = getOne(id);
        if (body.containsKey("project_name")) p.setProjectName((String) body.get("project_name"));
        if (body.containsKey("location"))     p.setLocation((String) body.get("location"));
        if (body.containsKey("description"))  p.setDescription((String) body.get("description"));
        if (body.containsKey("status"))       p.setStatus(Project.ProjectStatus.valueOf((String) body.get("status")));
        projectRepo.save(p);
        auditService.log(me, "UPDATE_PROJECT", "project", id, null, body, httpReq);
    }

    @Transactional
    public void delete(Integer id, Associate me, HttpServletRequest httpReq) {
        Project p = getOne(id);
        projectRepo.delete(p);
        auditService.log(me, "DELETE_PROJECT", "project", id, null, null, httpReq);
    }
}
