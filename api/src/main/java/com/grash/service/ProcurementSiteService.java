package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Site;
import com.grash.model.User;
import com.grash.model.PurchaseOrder;
import com.grash.model.PurchaseRequisition;
import com.grash.model.PartQuantity;
import com.grash.model.PurchaseRequisitionLine;
import com.grash.repository.SiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Subquery;
import java.util.Collection;

import java.util.List;

/** Resolves and validates site assignments on new procurement lines. */
@Service
@RequiredArgsConstructor
public class ProcurementSiteService {
    private final SiteRepository siteRepository;

    public Site resolveLineSite(Long requestedSiteId, Site inheritedSite, User user) {
        if (requestedSiteId != null) {
            Site requested = siteRepository.findByIdAndCompany_Id(requestedSiteId, user.getCompany().getId())
                    .orElseThrow(() -> new CustomException("Site not found", HttpStatus.BAD_REQUEST));
            if (!user.canAccessSite(requested))
                throw new CustomException("Access denied to site", HttpStatus.FORBIDDEN);
            return requested;
        }
        if (inheritedSite != null) {
            if (!user.getCompany().getId().equals(inheritedSite.getCompany().getId())
                    || !user.canAccessSite(inheritedSite))
                throw new CustomException("Access denied to site", HttpStatus.FORBIDDEN);
            return inheritedSite;
        }
        List<Site> companySites = siteRepository.findByCompany_IdOrderByNameAsc(user.getCompany().getId());
        List<Site> accessibleSites = companySites.stream().filter(user::canAccessSite).toList();
        if (accessibleSites.size() == 1) return accessibleSites.get(0);
        if (companySites.isEmpty()) return null;
        if (accessibleSites.isEmpty()) throw new CustomException("No accessible site is available", HttpStatus.FORBIDDEN);
        throw new CustomException("procurement_site_required", HttpStatus.BAD_REQUEST);
    }

    public boolean canAccessAllSites(User user) {
        return user.isAllSitesAccess();
    }

    public List<Long> siteIdsForQuery(User user) {
        List<Long> ids = user.getSites() == null ? List.of() : user.getSites().stream()
                .map(Site::getId).filter(java.util.Objects::nonNull).toList();
        return ids.isEmpty() ? List.of(-1L) : ids;
    }

    public boolean canAccessSite(User user, Site site) {
        return site == null || user.canAccessSite(site);
    }

    public boolean canAccessAll(User user, Collection<Site> sites) {
        return sites == null || sites.stream().allMatch(site -> canAccessSite(user, site));
    }

    public Specification<PurchaseRequisition> requisitionsVisibleTo(User user) {
        return (root, query, cb) -> {
            if (user.isAllSitesAccess()) return cb.conjunction();
            Collection<Long> allowedIds = user.getSites() == null ? List.of()
                    : user.getSites().stream().map(Site::getId).filter(java.util.Objects::nonNull).toList();
            Subquery<Long> hidden = query.subquery(Long.class);
            var line = hidden.from(PurchaseRequisitionLine.class);
            hidden.select(line.get("id")).where(cb.equal(line.get("requisition"), root),
                    cb.isNotNull(line.get("site")), allowedIds.isEmpty()
                            ? cb.conjunction() : cb.not(line.get("site").get("id").in(allowedIds)));
            // A scoped user sees an order only when every assigned line is in their site set.
            return cb.not(cb.exists(hidden));
        };
    }

    public Specification<PurchaseOrder> purchaseOrdersVisibleTo(User user) {
        return (root, query, cb) -> {
            if (user.isAllSitesAccess()) return cb.conjunction();
            Collection<Long> allowedIds = user.getSites() == null ? List.of()
                    : user.getSites().stream().map(Site::getId).filter(java.util.Objects::nonNull).toList();
            Subquery<Long> hidden = query.subquery(Long.class);
            var line = hidden.from(PartQuantity.class);
            hidden.select(line.get("id")).where(cb.equal(line.get("purchaseOrder"), root),
                    cb.isNotNull(line.get("site")), allowedIds.isEmpty()
                            ? cb.conjunction() : cb.not(line.get("site").get("id").in(allowedIds)));
            return cb.not(cb.exists(hidden));
        };
    }
}
