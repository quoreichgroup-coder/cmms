package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import com.grash.model.enums.PurchaseRequisitionStatus;
import com.grash.model.enums.PermissionEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotBlank;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
public class PurchaseRequisition extends CompanyAudit {
    @NotBlank
    private String title;

    private String justification;
    private Date requiredDate;
    @Enumerated(EnumType.STRING)
    private PurchaseRequisitionStatus status = PurchaseRequisitionStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    private User requester;

    @ManyToOne(fetch = FetchType.LAZY)
    private User decisionBy;

    private Date decisionAt;
    private String decisionNote;

    @OneToMany(mappedBy = "requisition", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseRequisitionLine> lines = new ArrayList<>();

    public boolean canView(User user) {
        boolean isRequester = requester != null && requester.getId().equals(user.getId());
        return isRequester || user.getRole().getViewPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS)
                && user.getRole().getViewOtherPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS);
    }

    public boolean canEdit(User user) {
        return user.getRole().getEditOtherPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS)
                || requester != null && requester.getId().equals(user.getId());
    }
}
