package com.grash.service;

import com.grash.dto.PartQuantityPatchDTO;
import com.grash.mapper.PartQuantityMapper;
import com.grash.model.PartQuantity;
import com.grash.repository.PartQuantityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PartQuantityService {
    private final PartQuantityRepository partQuantityRepository;
    private final PartQuantityMapper partQuantityMapper;

    public PartQuantity update(PartQuantity savedPartQuantity, PartQuantityPatchDTO patch) {
        return partQuantityRepository.save(partQuantityMapper.updatePartQuantity(savedPartQuantity, patch));
    }

    public PartQuantity create(PartQuantity PartQuantity) {
        return partQuantityRepository.save(PartQuantity);
    }

    public Collection<PartQuantity> getAll() {
        return partQuantityRepository.findAll();
    }

    public void delete(PartQuantity partQuantity) {
        partQuantityRepository.delete(partQuantity);
    }

    public Optional<PartQuantity> findById(Long id) {
        return partQuantityRepository.findById(id);
    }

    public Collection<PartQuantity> findByCompany(Long id) {
        return partQuantityRepository.findByCompany_Id(id);
    }

    public Collection<PartQuantity> findByWorkOrder(Long id) {
        return partQuantityRepository.findByWorkOrder_Id(id);
    }

    public Collection<PartQuantity> findByPart(Long id) {
        return partQuantityRepository.findByPart_Id(id);
    }

    public Collection<PartQuantity> findByPurchaseOrder(Long id) {
        return partQuantityRepository.findByPurchaseOrder_Id(id);
    }


    public void save(PartQuantity partQuantity) {
        partQuantityRepository.save(partQuantity);
    }
}
