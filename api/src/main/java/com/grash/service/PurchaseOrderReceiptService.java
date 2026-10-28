package com.grash.service;

import com.grash.dto.PurchaseOrderReceiptRequest;
import com.grash.dto.PurchaseOrderReceiptShowDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.PartMapper;
import com.grash.model.*;
import com.grash.model.enums.ApprovalStatus;
import com.grash.model.enums.webhook.PartField;
import com.grash.model.enums.webhook.WebhookEvent;
import com.grash.repository.PartRepository;
import com.grash.repository.PurchaseOrderReceiptRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderReceiptService {
    private final PurchaseOrderService purchaseOrderService;
    private final PurchaseOrderReceiptRepository receiptRepository;
    private final PartQuantityService partQuantityService;
    private final PartRepository partRepository;
    private final PartMapper partMapper;
    private final PartTransactionService partTransactionService;
    private final WebhookDispatchService webhookDispatchService;

    @Transactional
    public PurchaseOrderReceiptShowDTO receive(Long purchaseOrderId, Long companyId, User user,
                                               PurchaseOrderReceiptRequest request) {
        PurchaseOrder order = purchaseOrderService.findByIdForUpdateAndCompany(purchaseOrderId, companyId)
                .orElseThrow(() -> new CustomException("Purchase order not found", HttpStatus.NOT_FOUND));
        if (!order.isReceivingWorkflowEnabled()) {
            throw new CustomException("This purchase order uses the legacy inventory workflow",
                    HttpStatus.CONFLICT);
        }
        if (order.getStatus() != ApprovalStatus.APPROVED) {
            throw new CustomException("Only an approved purchase order can be received", HttpStatus.CONFLICT);
        }
        String key = request.getIdempotencyKey().trim();
        String requestHash = hash(request);
        Optional<PurchaseOrderReceipt> existing = receiptRepository
                .findByPurchaseOrder_IdAndIdempotencyKey(purchaseOrderId, key);
        if (existing.isPresent()) {
            if (!existing.get().getRequestHash().equals(requestHash)) {
                throw new CustomException("Idempotency key was already used with different receipt data",
                        HttpStatus.CONFLICT);
            }
            return show(existing.get());
        }
        if (request.getLines().stream().map(PurchaseOrderReceiptRequest.Line::getPurchaseOrderLineId)
                .distinct().count() != request.getLines().size()) {
            throw new CustomException("A purchase order line can only appear once per receipt", HttpStatus.BAD_REQUEST);
        }

        Map<Long, PartQuantity> orderLines = partQuantityService.findByPurchaseOrder(purchaseOrderId).stream()
                .collect(Collectors.toMap(PartQuantity::getId, line -> line));
        request.getLines().forEach(line -> {
            if (!orderLines.containsKey(line.getPurchaseOrderLineId())) {
                throw new CustomException("Purchase order line not found", HttpStatus.NOT_FOUND);
            }
        });
        Map<Long, Double> received = new HashMap<>();
        receiptRepository.sumReceivedByPurchaseOrderLine(purchaseOrderId)
                .forEach(row -> received.put((Long) row[0], ((Number) row[1]).doubleValue()));
        List<PurchaseOrderReceiptRequest.Line> sortedLines = request.getLines().stream()
                .sorted(Comparator
                        .comparing((PurchaseOrderReceiptRequest.Line line) ->
                                orderLines.get(line.getPurchaseOrderLineId()).getPart().getId())
                        .thenComparing(PurchaseOrderReceiptRequest.Line::getPurchaseOrderLineId))
                .toList();

        List<Part> lockedParts = new ArrayList<>();
        for (PurchaseOrderReceiptRequest.Line requested : sortedLines) {
            PartQuantity orderLine = orderLines.get(requested.getPurchaseOrderLineId());
            if (orderLine == null) {
                throw new CustomException("Purchase order line not found", HttpStatus.NOT_FOUND);
            }
            double quantity = requested.getQuantity();
            if (!Double.isFinite(quantity) || quantity <= 0) {
                throw new CustomException("Received quantity must be greater than zero", HttpStatus.BAD_REQUEST);
            }
            if (orderLine.getPart().getUnit() == null && quantity != Math.rint(quantity)) {
                throw new CustomException("A whole quantity is required when the part has no unit",
                        HttpStatus.BAD_REQUEST);
            }
            double alreadyReceived = received.getOrDefault(orderLine.getId(), 0d);
            double remaining = orderLine.getQuantity() - alreadyReceived;
            if (quantity > remaining + 1e-9) {
                throw new CustomException("Received quantity exceeds the remaining order quantity",
                        HttpStatus.CONFLICT);
            }
            Part locked = partRepository.findByIdAndCompany_IdForUpdate(orderLine.getPart().getId(), companyId)
                    .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
            lockedParts.add(locked);
        }

        PurchaseOrderReceipt receipt = new PurchaseOrderReceipt();
        receipt.setPurchaseOrder(order);
        receipt.setReceivedBy(user);
        receipt.setReceivedAt(new Date());
        receipt.setReference(request.getReference() == null ? null : request.getReference().trim());
        receipt.setNotes(request.getNotes() == null ? null : request.getNotes().trim());
        receipt.setIdempotencyKey(key);
        receipt.setRequestHash(requestHash);
        List<StockChange> stockChanges = new ArrayList<>();
        for (int index = 0; index < sortedLines.size(); index++) {
            PurchaseOrderReceiptRequest.Line requested = sortedLines.get(index);
            PartQuantity orderLine = orderLines.get(requested.getPurchaseOrderLineId());
            Part part = lockedParts.get(index);
            PurchaseOrderReceiptLine receiptLine = new PurchaseOrderReceiptLine();
            receiptLine.setReceipt(receipt);
            receiptLine.setPartQuantity(orderLine);
            receiptLine.setQuantity(requested.getQuantity());
            receiptLine.setUnit(part.getUnit());
            receipt.getLines().add(receiptLine);
            if (!part.isNonStock()) {
                double before = part.getQuantity();
                part.setQuantity(before + requested.getQuantity());
                partRepository.save(part);
                stockChanges.add(new StockChange(part, before, part.getQuantity(), requested.getQuantity(), receiptLine));
            }
        }
        PurchaseOrderReceipt saved = receiptRepository.saveAndFlush(receipt);
        for (StockChange change : stockChanges) {
            PartTransaction transaction = new PartTransaction(change.part(), -change.received(),
                    "Purchase receipt #" + saved.getId() + " for PO #" + order.getId());
            transaction.setPurchaseOrderReceiptLine(change.line());
            partTransactionService.create(transaction);
        }
        stockChanges.forEach(change -> dispatchAfterCommit(change, saved, order));
        return show(saved);
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderReceiptShowDTO> list(Long purchaseOrderId) {
        return receiptRepository.findByPurchaseOrder_IdOrderByReceivedAtDesc(purchaseOrderId)
                .stream().map(this::show).toList();
    }

    @Transactional(readOnly = true)
    public boolean hasReceipts(Long purchaseOrderId) {
        return receiptRepository.existsByPurchaseOrder_Id(purchaseOrderId);
    }

    @Transactional(readOnly = true)
    public Map<Long, Double> receivedByLine(Long purchaseOrderId) {
        return receiptRepository.sumReceivedByPurchaseOrderLine(purchaseOrderId).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> ((Number) row[1]).doubleValue()));
    }

    private PurchaseOrderReceiptShowDTO show(PurchaseOrderReceipt receipt) {
        Hibernate.initialize(receipt.getLines());
        return PurchaseOrderReceiptShowDTO.builder().id(receipt.getId())
                .purchaseOrderId(receipt.getPurchaseOrder().getId()).reference(receipt.getReference())
                .notes(receipt.getNotes()).receivedAt(receipt.getReceivedAt())
                .receivedById(receipt.getReceivedBy().getId())
                .receivedByName(receipt.getReceivedBy().getFirstName() + " " + receipt.getReceivedBy().getLastName())
                .lines(receipt.getLines().stream().map(line -> PurchaseOrderReceiptShowDTO.Line.builder()
                        .id(line.getId()).purchaseOrderLineId(line.getPartQuantity().getId())
                        .partName(line.getPartQuantity().getPart().getName()).quantity(line.getQuantity())
                        .unit(line.getUnit()).build()).toList()).build();
    }

    private String hash(PurchaseOrderReceiptRequest request) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            updateHash(digest, request.getReference());
            updateHash(digest, request.getNotes());
            request.getLines().stream().sorted(Comparator.comparing(PurchaseOrderReceiptRequest.Line::getPurchaseOrderLineId))
                    .forEach(line -> {
                        updateHash(digest, String.valueOf(line.getPurchaseOrderLineId()));
                        updateHash(digest, String.valueOf(line.getQuantity()));
                    });
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private void updateHash(MessageDigest digest, String value) {
        byte[] bytes = (value == null ? "" : value.trim()).getBytes(StandardCharsets.UTF_8);
        digest.update((byte) (bytes.length >>> 24));
        digest.update((byte) (bytes.length >>> 16));
        digest.update((byte) (bytes.length >>> 8));
        digest.update((byte) bytes.length);
        digest.update(bytes);
    }

    private void dispatchAfterCommit(StockChange change, PurchaseOrderReceipt receipt, PurchaseOrder order) {
        Runnable dispatch = () -> {
            Map<String, Object> payload = new HashMap<>();
            payload.put("partId", change.part().getId());
            payload.put("partName", change.part().getName());
            payload.put("previousQuantity", change.before());
            payload.put("newQuantity", change.after());
            payload.put("changedAmount", change.received());
            payload.put("purchaseOrderId", order.getId());
            payload.put("purchaseOrderName", order.getName());
            payload.put("receiptId", receipt.getId());
            payload.put("receiptLineId", change.line().getId());
            webhookDispatchService.dispatchWebhook(order.getCompany(), WebhookEvent.PART_QUANTITY_CHANGED,
                    payload, "changedPart", partMapper.toShowDto(change.part()), null, null, null, null,
                    Collections.singletonList(PartField.QUANTITY));
        };
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            dispatch.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() { dispatch.run(); }
        });
    }

    private record StockChange(Part part, double before, double after, double received,
                               PurchaseOrderReceiptLine line) {}
}
