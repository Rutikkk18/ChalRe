package com.Startup.chalre.repository;

import com.Startup.chalre.entity.VerificationDoc;
import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VerificationDocRepository extends JpaRepository<VerificationDoc, Long> {

    List<VerificationDoc> findByUser(User user);
}
