package com.grash.service;

import com.grash.dto.GeneratedDocumentAccessEventDTO;
import com.grash.dto.GeneratedDocumentAccessPageDTO;
import com.grash.exception.CustomException;
import com.grash.model.GeneratedDocumentAccessEvent;
import com.grash.model.User;
import com.grash.repository.GeneratedDocumentAccessEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class GeneratedDocumentAccessEventService {
    private static final List<String> SOURCE_TYPES = List.of("WORK_ORDER", "REQUEST", "PURCHASE_ORDER", "PURCHASE_REQUISITION");
    private static final List<String> OUTCOMES = List.of("SUCCESS", "FAILED");
    private final GeneratedDocumentAccessEventRepository repository;

    @Transactional(readOnly = true)
    public GeneratedDocumentAccessPageDTO search(User actor, String query, String sourceType,
                                                 String outcome, Long sourceId, int page) {
        if (actor == null || actor.getCompany() == null) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        if (sourceType != null && !sourceType.isBlank() && !SOURCE_TYPES.contains(sourceType))
            throw new CustomException("document_access_filter_invalid", HttpStatus.BAD_REQUEST);
        if (outcome != null && !outcome.isBlank() && !OUTCOMES.contains(outcome))
            throw new CustomException("document_access_filter_invalid", HttpStatus.BAD_REQUEST);
        if (page < 0) throw new CustomException("document_access_page_invalid", HttpStatus.BAD_REQUEST);

        Specification<GeneratedDocumentAccessEvent> spec = (root, criteria, cb) ->
                cb.equal(root.get("company").get("id"), actor.getCompany().getId());
        if (sourceType != null && !sourceType.isBlank())
            spec = spec.and((root, criteria, cb) -> cb.equal(root.get("sourceType"), sourceType));
        if (outcome != null && !outcome.isBlank())
            spec = spec.and((root, criteria, cb) -> cb.equal(root.get("outcome"), outcome));
        if (sourceId != null)
            spec = spec.and((root, criteria, cb) -> cb.equal(root.get("sourceId"), sourceId));
        if (query != null && !query.isBlank()) {
            String normalized = query.trim().toLowerCase(Locale.ROOT);
            if (normalized.length() > 120) throw new CustomException("document_access_query_invalid", HttpStatus.BAD_REQUEST);
            String pattern = "%" + normalized.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            spec = spec.and((root, criteria, cb) -> cb.like(cb.lower(root.get("actorName")), pattern, '\\'));
        }
        Page<GeneratedDocumentAccessEventDTO> results = repository.findAll(spec, PageRequest.of(page, 25,
                        Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))))
                .map(event -> new GeneratedDocumentAccessEventDTO(event.getId(), event.getGeneratedDocumentId(),
                        event.getSourceType(), event.getSourceId(), event.getActorId(), event.getActorName(),
                        event.getOutcome(), event.getCreatedAt()));
        return new GeneratedDocumentAccessPageDTO(results.getContent(), results.getTotalElements(),
                results.getTotalPages(), page, results.getSize());
    }
}
