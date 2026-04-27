package com.avyahome.crm.repository;

import com.avyahome.crm.entity.CustomerPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CustomerPaymentRepository extends JpaRepository<CustomerPayment, Integer> {

    List<CustomerPayment> findByCustomerIdOrderByCreatedAtDesc(Integer customerId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM CustomerPayment p WHERE p.customer.id = :customerId AND p.status = 'received'")
    java.math.BigDecimal sumReceivedByCustomerId(@Param("customerId") Integer customerId);
}
