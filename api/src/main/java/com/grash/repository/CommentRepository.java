package com.grash.repository;

import com.grash.model.Comment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface CommentRepository extends JpaRepository<Comment, Long>,
        JpaSpecificationExecutor<Comment> {

    long countByWorkOrderId(Long workOrderId);

    List<Comment> findByWorkOrder_IdAndCompany_IdOrderByCreatedAtAscIdAsc(Long workOrderId, Long companyId);

    @Query("SELECT COUNT(c) FROM Comment c WHERE c.workOrder.id = :workOrderId AND c.files IS NOT EMPTY")
    long countByWorkOrderIdWithFiles(Long workOrderId);
}
