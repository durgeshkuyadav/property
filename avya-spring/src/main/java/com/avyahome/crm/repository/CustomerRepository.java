package com.avyahome.crm.repository;

import com.avyahome.crm.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Integer> {

    @Query("""
        SELECT c FROM Customer c
        WHERE (:search IS NULL OR c.name LIKE %:search% OR c.mobile LIKE %:search%)
          AND (:promoterId IS NULL OR c.promoter.id = :promoterId)
          AND (:status IS NULL OR c.status = :status)
        """)
    Page<Customer> findAllFiltered(
        @Param("search") String search,
        @Param("promoterId") Integer promoterId,
        @Param("status") Customer.CustomerStatus status,
        Pageable pageable
    );

    @Query("""
        SELECT MONTH(c.bookingDate) as month, YEAR(c.bookingDate) as year, COUNT(c) as count,
               COALESCE(SUM(cp.amount), 0) as totalBusiness
        FROM Customer c
        LEFT JOIN CustomerPayment cp ON cp.customer = c AND cp.status = 'received'
        WHERE (:promoterId IS NULL OR c.promoter.id = :promoterId)
        GROUP BY YEAR(c.bookingDate), MONTH(c.bookingDate)
        ORDER BY year DESC, month DESC
        """)
    List<Object[]> getMonthlyBusiness(@Param("promoterId") Integer promoterId);
}
