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

interface PartQuantityListProps {
  partQuantities: PartQuantityMiniDTO[];
  onChange: (value: string, partQuantity: PartQuantityMiniDTO) => void;
  disabled: boolean;
  deleteDisabled?: boolean;
  onDelete?: (partQuantity: PartQuantityMiniDTO) => void;
}
export default function PartQuantitiesList({
  partQuantities,
  onChange,
  disabled,
  deleteDisabled,
  onDelete
}: PartQuantityListProps) {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { getFormattedCurrency } = useContext(CompanySettingsContext);

  return (
    <List>
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
                min: '0'
              }}
              size="small"
              onChange={(event) => onChange(event.target.value, partQuantity)}
              defaultValue={partQuantity.quantity}
            />
            <Typography variant="h6">
              {' * '}
              {getFormattedCostPerUnit(
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
            {getFormattedCurrency(
              partQuantities.reduce(
                (acc, partQuantity) =>
                  acc + partQuantity.part.cost * partQuantity.quantity,
                0
              )
            )}
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
