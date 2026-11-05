package com.grash.repository;

import com.grash.model.TaskListOperation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskListOperationRepository extends JpaRepository<TaskListOperation, Long> {
    List<TaskListOperation> findByTaskList_IdOrderByOperationOrderAsc(Long taskListId);
}
