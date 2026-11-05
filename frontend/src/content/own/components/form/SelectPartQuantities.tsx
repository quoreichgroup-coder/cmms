import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from '../../../../store';
import PartQuantity, {
  PartQuantityMiniDTO
} from '../../../../models/owns/partQuantity';
import SelectParts from './SelectParts';
import { randomInt } from 'src/utils/generators';
import PartQuantitiesList from '../PartQuantitiesList';
import api from '../../../../utils/api';

interface SiteOption { id: number; name: string }

interface SelectPartQuantitiesProps {
  onChange: (partQuantities: PartQuantityMiniDTO[]) => void;
  selected: PartQuantity[];
  purchaseUnitPriceInput?: boolean;
  siteSelectionEnabled?: boolean;
  siteSelectionRequired?: boolean;
}

export default function SelectPartQuantities({
  onChange,
  selected,
  purchaseUnitPriceInput = false,
  siteSelectionEnabled = false,
  siteSelectionRequired = false
}: SelectPartQuantitiesProps) {
  const [partQuantities, setPartQuantities] = useState<PartQuantityMiniDTO[]>(
    []
  );

  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const [sites, setSites] = useState<SiteOption[]>([]);

  useEffect(() => {
    if (!siteSelectionEnabled) return;
    let active = true;
    api.get<SiteOption[]>('sites').then((result) => {
      if (!active) return;
      const available = Array.isArray(result) ? result : [];
      setSites(available);
    }).catch(() => { if (active) setSites([]); });
    return () => { active = false; };
  }, [siteSelectionEnabled]);
  const onPartQuantityChange = (value: string, partQuantity) => {
    let partQuantitiesClone = [...partQuantities];
    partQuantitiesClone = partQuantitiesClone.map((pq) => {
      if (pq.id === partQuantity.id) {
        return { ...pq, quantity: Number(value) };
      }
      return pq;
    });
    setPartQuantities(partQuantitiesClone);
    onChange(partQuantitiesClone);
  };

  useEffect(() => {
    setPartQuantities(selected);
  }, [selected]);
  useEffect(() => {
    if (sites.length !== 1 || !partQuantities.some((line) => line.siteId == null)) return;
    const updated = partQuantities.map((line) => line.siteId == null
      ? { ...line, siteId: sites[0].id, siteName: sites[0].name }
      : line);
    setPartQuantities(updated);
    onChange(updated);
  }, [sites, partQuantities, onChange]);
  return (
    <>
      <PartQuantitiesList
        partQuantities={partQuantities}
        onChange={onPartQuantityChange}
        disabled={false}
        purchaseUnitPriceInput={purchaseUnitPriceInput}
        siteSelectionEnabled={siteSelectionEnabled}
        siteSelectionRequired={siteSelectionRequired}
        siteOptions={sites}
        onSiteChange={(siteId, line) => {
          const site = sites.find((item) => item.id === siteId);
          const updated = partQuantities.map((item) => item.id === line.id
            ? { ...item, siteId: siteId || null, siteName: site?.name || null }
            : item);
          setPartQuantities(updated);
          onChange(updated);
        }}
        onPurchasePriceChange={(value, line) => {
          const updated = partQuantities.map((item) => item.id === line.id
            ? { ...item, purchaseUnitPrice: value === '' ? undefined : Number(value) }
            : item);
          setPartQuantities(updated);
          onChange(updated);
        }}
        onDelete={(partQuantity) => {
          const updatedPartQuantities = partQuantities.filter(
            (pq) => pq.id !== partQuantity.id
          );
          setPartQuantities(updatedPartQuantities);
          onChange(updatedPartQuantities);
        }}
      />
      <SelectParts
        selected={partQuantities.map((partQuantity) => partQuantity.part.id)}
        onChange={(newParts) => {
          const existingByPart = new Map(partQuantities.map((line) => [line.part.id, line]));
          const newPartQuantities = newParts.map((part) => {
            const existing = existingByPart.get(part.id);
            if (existing) return existing;
            return {
              part,
              quantity: 0,
              id: randomInt(),
              createdAt: new Date().toDateString(),
              createdBy: null,
              updatedAt: null,
              updatedBy: null
            };
          });
          setPartQuantities(newPartQuantities);
          onChange(newPartQuantities);
        }}
      />
    </>
  );
}
