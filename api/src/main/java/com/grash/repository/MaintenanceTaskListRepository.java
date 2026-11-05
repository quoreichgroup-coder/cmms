package com.grash.repository;

import com.grash.dto.MaintenanceTaskListGroupOptionDTO;
import com.grash.dto.MaintenanceTaskListOptionDTO;
import com.grash.model.MaintenanceTaskList;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MaintenanceTaskListRepository extends JpaRepository<MaintenanceTaskList, Long> {
    @Query("select t from MaintenanceTaskList t where t.company.id = :companyId and " +
            "(:query = '' or lower(t.groupCode) like lower(concat('%', :query, '%')) or " +
            "lower(t.groupCounter) like lower(concat('%', :query, '%')) or " +
            "lower(t.description) like lower(concat('%', :query, '%')) or " +
            "lower(t.taskListType) like lower(concat('%', :query, '%')) or " +
            "lower(coalesce(t.workCenter, '')) like lower(concat('%', :query, '%'))) and " +
            "(:ownerId is null or t.createdBy = :ownerId)")
    Page<MaintenanceTaskList> search(@Param("companyId") Long companyId,
                                    @Param("query") String query,
                                    @Param("ownerId") Long ownerId,
                                    Pageable pageable);

    @Query("select new com.grash.dto.MaintenanceTaskListOptionDTO(t.id, t.groupCode, t.groupCounter, " +
            "t.description, t.taskListType, a.id, l.id, t.status, t.validFrom, t.validTo) " +
            "from MaintenanceTaskList t left join t.asset a left join t.location l " +
            "where t.company.id = :companyId and t.status = 'ACTIVE' and " +
            "(:query = '' or lower(t.groupCode) like lower(concat('%', :query, '%')) or " +
            "lower(t.groupCounter) like lower(concat('%', :query, '%')) or " +
            "lower(t.description) like lower(concat('%', :query, '%')) or " +
            "lower(t.taskListType) like lower(concat('%', :query, '%')) or " +
            "lower(coalesce(t.workCenter, '')) like lower(concat('%', :query, '%'))) and " +
            "(:ownerId is null or t.createdBy = :ownerId)")
    Page<MaintenanceTaskListOptionDTO> searchActiveOptions(@Param("companyId") Long companyId,
                                                            @Param("query") String query,
                                                            @Param("ownerId") Long ownerId,
                                                            Pageable pageable);

    Optional<MaintenanceTaskList> findByIdAndCompany_Id(Long id, Long companyId);
    java.util.List<MaintenanceTaskList> findByCompany_IdAndGroupCodeIgnoreCase(Long companyId, String groupCode);
    @Query("select t from MaintenanceTaskList t where t.company.id = :companyId " +
            "and lower(t.groupCode) = lower(:groupCode) " +
            "and (:ownerId is null or t.createdBy = :ownerId) order by t.groupCounter")
    java.util.List<MaintenanceTaskList> findGroupCounters(@Param("companyId") Long companyId,
                                                           @Param("groupCode") String groupCode,
                                                           @Param("ownerId") Long ownerId);
    @Query(value = "select id from company where id = :companyId for update", nativeQuery = true)
    Long lockCompanyForCounterGeneration(@Param("companyId") Long companyId);

    @Query("select t.groupCounter from MaintenanceTaskList t where t.company.id = :companyId " +
            "and lower(t.groupCode) = lower(:groupCode)")
    java.util.List<String> findCountersForGroup(@Param("companyId") Long companyId,
                                                 @Param("groupCode") String groupCode);

    @Query("select t.groupCode from MaintenanceTaskList t where t.company.id = :companyId")
    java.util.List<String> findGroupCodes(@Param("companyId") Long companyId);

    @Query("select distinct t.workCenter from MaintenanceTaskList t where t.company.id = :companyId " +
            "and (:ownerId is null or t.createdBy = :ownerId) " +
            "and t.workCenter is not null and trim(t.workCenter) <> ''")
    java.util.List<String> findConfiguredHeaderWorkCenters(@Param("companyId") Long companyId,
                                                            @Param("ownerId") Long ownerId);

    @Query("select new com.grash.dto.MaintenanceTaskListWorkCenterSuggestionDTO(o.workCenter, o.controlKey, " +
            "o.workers, o.workUnit, o.durationUnit, o.systemCondition) from TaskListOperation o " +
            "where o.company.id = :companyId and (:ownerId is null or o.taskList.createdBy = :ownerId) " +
            "and o.workCenter is not null and trim(o.workCenter) <> '' " +
            "group by o.workCenter, o.controlKey, o.workers, o.workUnit, o.durationUnit, o.systemCondition")
    java.util.List<com.grash.dto.MaintenanceTaskListWorkCenterSuggestionDTO> findWorkCenterDefaultCandidates(
            @Param("companyId") Long companyId, @Param("ownerId") Long ownerId);

    @Query("select new com.grash.dto.MaintenanceTaskListGroupOptionDTO(t.groupCode, min(t.description), " +
            "t.taskListType, count(t.id), t.asset.id, t.location.id) from MaintenanceTaskList t where t.company.id = :companyId " +
            "and (:ownerId is null or t.createdBy = :ownerId) group by t.groupCode, t.taskListType " +
            ", t.asset.id, t.location.id " +
            "order by t.groupCode")
    java.util.List<MaintenanceTaskListGroupOptionDTO> findGroups(@Param("companyId") Long companyId,
                                                                  @Param("ownerId") Long ownerId);

    boolean existsByCompany_IdAndGroupCodeIgnoreCaseAndGroupCounterIgnoreCaseAndIdNot(
            Long companyId, String groupCode, String groupCounter, Long id);

    boolean existsByAsset_IdAndCompany_Id(Long assetId, Long companyId);

    boolean existsByLocation_IdAndCompany_Id(Long locationId, Long companyId);
}
