package com.avyahome.crm.repository;

import com.avyahome.crm.entity.PayoutPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PayoutPaymentRepository extends JpaRepository<PayoutPayment, Integer> {
    List<PayoutPayment> findByAssociateIdOrderByCreatedAtDesc(Integer associateId);
    List<PayoutPayment> findByPayoutIdOrderByCreatedAtDesc(Integer payoutId);
}
