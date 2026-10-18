import {
  Box,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SetType from '../../../models/owns/setType';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import { useContext } from 'react';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';

interface PartDetailsProps {
  set: SetType;
  handleOpenUpdate: () => void;
  handleOpenDelete: () => void;
}
export default function SetDetails(props: PartDetailsProps) {
  const { set, handleOpenUpdate, handleOpenDelete } = props;
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const { hasEditPermission, hasDeletePermission } = useAuth();
  const { getFormattedCurrency } = useContext(CompanySettingsContext);
  const { getFormattedDate } = useContext(CompanySettingsContext);

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
      padding={4}
    >
      <Grid
        item
        xs={12}
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h2">{set?.name}</Typography>
          <Typography variant="h6">
            {getFormattedDate(set?.createdAt)}
          </Typography>
        </Box>
        <Box>
          {hasEditPermission(PermissionEntity.PARTS_AND_MULTIPARTS, set) && (
            <IconButton onClick={handleOpenUpdate} style={{ marginRight: 10 }}>
              <EditOutlinedIcon color="primary" />
            </IconButton>
          )}
          {hasDeletePermission(PermissionEntity.PARTS_AND_MULTIPARTS, set) && (
            <IconButton onClick={handleOpenDelete}>
              <DeleteOutlinedIcon color="error" />
            </IconButton>
          )}
        </Box>
      </Grid>
      <Divider />
      <Grid item xs={12}>
        <Box display="flex" flexDirection="row">
          <HandymanOutlinedIcon />
          <Typography sx={{ mb: 1, ml: 1 }} variant="h4">
            {`${set?.parts.length} ${t('parts')}`}
          </Typography>
        </Box>
        <List sx={{ width: '100%' }}>
          {set?.parts.map((part) => (
            <ListItemButton key={part.id} divider>
              <ListItem
                secondaryAction={
                  <Typography>{getFormattedCurrency(part.cost)}</Typography>
                }
              >
                <ListItemText
                  primary={part.name}
                  secondary={part.description}
                />
              </ListItem>
            </ListItemButton>
          ))}
        </List>
        <Box display="flex" flexDirection="row" justifyContent="space-between">
          <Box display="flex" flexDirection="row">
            <AttachMoneyOutlinedIcon />
            <Typography sx={{ mb: 1, ml: 1 }} variant="h4">
              {t('total_cost')}
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ pr: 2 }}>
            {getFormattedCurrency(
              set?.parts.reduce((acc, part) => acc + part.cost, 0)
            )}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
}
