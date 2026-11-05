import {
  Box,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography
} from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { PartQuantityMiniDTO } from '../../../models/owns/partQuantity';
import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { getFormattedCostPerUnit } from '../../../utils/formatters';
import { deletePartQuantity } from '../../../slices/partQuantity';
import { useDispatch } from '../../../store';
import MenuItem from '@mui/material/MenuItem';

interface SiteOption { id: number; name: string }

interface PartQuantityListProps {
  partQuantities: PartQuantityMiniDTO[];
  onChange: (value: string, partQuantity: PartQuantityMiniDTO) => void;
  disabled: boolean;
  deleteDisabled?: boolean;
  onDelete?: (partQuantity: PartQuantityMiniDTO) => void;
  showReceiptProgress?: boolean;
  showPurchaseCostSnapshot?: boolean;
  purchaseUnitPriceInput?: boolean;
  purchasePriceCommitOnBlur?: boolean;
  onPurchasePriceChange?: (value: string, partQuantity: PartQuantityMiniDTO) => void;
  siteSelectionEnabled?: boolean;
  siteSelectionRequired?: boolean;
  siteOptions?: SiteOption[];
  onSiteChange?: (siteId: number | null, partQuantity: PartQuantityMiniDTO) => void;
}
export default function PartQuantitiesList({
  partQuantities,
  onChange,
  disabled,
  deleteDisabled,
  onDelete,
  showReceiptProgress = false,
  showPurchaseCostSnapshot = false,
  purchaseUnitPriceInput = false,
  purchasePriceCommitOnBlur = false,
  onPurchasePriceChange,
  siteSelectionEnabled = false,
  siteSelectionRequired = false,
  siteOptions = [],
  onSiteChange
}: PartQuantityListProps) {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { getFormattedCurrency, getCurrencyCode } = useContext(CompanySettingsContext);

  return (
    <List>
      {showPurchaseCostSnapshot && (
        <ListItem sx={{ px: 2, py: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {t('purchase_cost_snapshot_help', 'Cost estimate captured when this order line was created; it is not a supplier quote.')}
          </Typography>
        </ListItem>
      )}
      {partQuantities.map((partQuantity, index) => (
        <ListItem
          key={partQuantity.part.id}
          sx={{
            alignItems: { xs: 'stretch', sm: 'center' },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            py: 1.5
          }}
        >
          <ListItemText
            sx={{ minWidth: 0, my: 0 }}
            primary={
              <div style={{ minWidth: 0, maxWidth: '100%' }}>
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`/app/inventory/parts/${partQuantity.part.id}`}
                  key={partQuantity.part.id}
                  variant="h6"
                  noWrap
                >
                  {partQuantity.part.name}
                </Link>
              </div>
            }
            secondary={
              <div style={{ minWidth: 0, maxWidth: '100%' }}>
                <Typography noWrap>{partQuantity.part.description}</Typography>
                {partQuantity.purchaseRequisitionId && (
                  <Typography variant="caption" color="text.secondary">
                    {t('source_requisition', { id: partQuantity.purchaseRequisitionId })}
                  </Typography>
                )}
                {siteSelectionEnabled ? (
                  <TextField
                    select
                    size="small"
                    label={t('site', 'Site')}
                    required={siteSelectionRequired && siteOptions.length > 0}
                    value={partQuantity.siteId ?? ''}
                    disabled={disabled}
                    onChange={(event) => onSiteChange?.(event.target.value ? Number(event.target.value) : null, partQuantity)}
                    sx={{ mt: 1, minWidth: { xs: '100%', sm: 180 }, maxWidth: 280 }}
                  >
                    {!siteSelectionRequired && <MenuItem value="">{t('no_site', 'No site')}</MenuItem>}
                    {siteOptions.map((site) => <MenuItem key={site.id} value={site.id}>{site.name}</MenuItem>)}
                  </TextField>
                ) : partQuantity.siteName ? (
                  <Typography variant="caption" color="text.secondary" display="block">{t('site', 'Site')}: {partQuantity.siteName}</Typography>
                ) : null}
                {showReceiptProgress && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('received')}: {partQuantity.receivedQuantity || 0} · {t('remaining')}: {partQuantity.remainingToReceive ?? partQuantity.quantity} {partQuantity.part.unit || ''}
                  </Typography>
                )}
              </div>
            }
          />
          <Box
            display="flex"
            flexDirection="row"
            alignItems="center"
            justifyContent="flex-end"
            sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0, gap: 0.5 }}
          >
            <TextField
              label={t('quantity')}
              variant="outlined"
              sx={{ width: { xs: 108, sm: 120 } }}
              type="number"
              disabled={disabled}
              inputProps={{
                min: '0',
                step: partQuantity.part.unit ? 'any' : 1
              }}
              size="small"
              onChange={(event) => onChange(event.target.value, partQuantity)}
              defaultValue={partQuantity.quantity}
            />
            {purchaseUnitPriceInput && (
              <TextField
                label={t('agreed_unit_price', 'Agreed unit price')}
                type="number"
                size="small"
                sx={{ width: { xs: '100%', sm: 170 } }}
                disabled={disabled}
                inputProps={{ min: 0, step: '0.0001' }}
                {...(purchasePriceCommitOnBlur
                  ? {
                      key: `${partQuantity.id}-${partQuantity.purchaseUnitPrice ?? ''}`,
                      defaultValue: partQuantity.purchaseUnitPrice ?? '',
                      onBlur: (event) => onPurchasePriceChange?.(event.target.value, partQuantity)
                    }
                  : {
                      value: partQuantity.purchaseUnitPrice ?? '',
                      onChange: (event) => onPurchasePriceChange?.(event.target.value, partQuantity)
                    })}
                helperText={`${t('company_currency', 'Company currency')}${getCurrencyCode() ? ` · ${getCurrencyCode()}` : ''}`}
              />
            )}
            <Typography variant="h6">
              {' * '}
                {purchaseUnitPriceInput
                  ? partQuantity.purchaseUnitPrice == null
                    ? t('enter_supplier_price', 'Enter agreed supplier price')
                    : `${getFormattedCurrency(partQuantity.purchaseUnitPrice)}${partQuantity.part.unit ? ` / ${partQuantity.part.unit}` : ''}`
                  : showPurchaseCostSnapshot
                  ? partQuantity.purchaseUnitCostSnapshot == null || !partQuantity.purchaseCurrencySnapshot
                    ? t('purchase_cost_snapshot_missing', 'Price snapshot unavailable')
                    : `${new Intl.NumberFormat(undefined, { style: 'currency', currency: partQuantity.purchaseCurrencySnapshot }).format(partQuantity.purchaseUnitCostSnapshot)}${partQuantity.part.unit ? ` / ${partQuantity.part.unit}` : ''}`
                  : getFormattedCostPerUnit(
                      partQuantity.part.cost,
                      partQuantity.part.unit,
                      getFormattedCurrency
                    )}
            </Typography>
            {!(disabled || deleteDisabled) && (
              <IconButton
                size="small"
                sx={{
                  minWidth: { xs: 48, sm: 40 },
                  minHeight: { xs: 48, sm: 40 }
                }}
                onClick={() => {
                  if (onDelete) {
                    onDelete(partQuantity);
                  } else {
                    if (window.confirm(t('confirm_delete_row'))) {
                      dispatch(deletePartQuantity(partQuantity.id));
                    }
                  }
                }}
              >
                <DeleteOutlinedIcon fontSize="small" color="error" />
              </IconButton>
            )}
          </Box>
        </ListItem>
      ))}
      <ListItem
        secondaryAction={
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{ mr: !(deleteDisabled || disabled) ? 3 : 0 }}
          >
            {showPurchaseCostSnapshot
              ? purchaseUnitPriceInput
                ? partQuantities.length === 0 || partQuantities.some((line) => line.purchaseUnitPrice == null || !line.purchasePriceCurrency)
                  ? '—'
                  : new Intl.NumberFormat(undefined, { style: 'currency', currency: partQuantities[0].purchasePriceCurrency! }).format(partQuantities.reduce(
                      (acc, line) => acc + line.purchaseUnitPrice! * line.quantity, 0
                    ))
                : partQuantities.length === 0 || partQuantities.some((line) => line.purchaseUnitCostSnapshot == null || !line.purchaseCurrencySnapshot)
                ? '—'
                : new Intl.NumberFormat(undefined, {
                    style: 'currency',
                    currency: partQuantities[0].purchaseCurrencySnapshot!
                  }).format(partQuantities.reduce(
                    (acc, line) => acc + (line.purchaseUnitCostSnapshot || 0) * line.quantity,
                    0
                  ))
              : getFormattedCurrency(partQuantities.reduce(
                  (acc, partQuantity) => acc + partQuantity.part.cost * partQuantity.quantity,
                  0
                ))}
          </Typography>
        }
      >
        <ListItemText
          primary={
            <Typography variant="h6" fontWeight="bold">
              {t('total')}
            </Typography>
          }
        />
      </ListItem>
    </List>
  );
}
