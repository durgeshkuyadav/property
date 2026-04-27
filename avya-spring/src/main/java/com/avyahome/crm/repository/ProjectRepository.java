package com.avyahome.crm.repository;

import com.avyahome.crm.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Integer> {
    boolean existsByProjectName(String projectName);
    List<Project> findAllByOrderByCreatedAtDesc();
}
