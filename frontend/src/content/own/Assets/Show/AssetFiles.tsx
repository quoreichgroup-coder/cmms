import { Box, Card, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CustomDataGrid from '../../components/CustomDatagrid';
import {
  GridActionsCellItem,
  GridRowParams,
  GridToolbar
} from '@mui/x-data-grid';
import { GridEnrichedColDef } from '@mui/x-data-grid/models/colDef/gridColDef';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { AssetDTO } from '../../../../models/owns/asset';
import { useDispatch } from '../../../../store';
import { editAsset } from '../../../../slices/asset';
import useAuth from '../../../../hooks/useAuth';
import { PermissionEntity } from '../../../../models/owns/role';
import { FileMiniDTO } from '../../../../models/owns/file';
import { openSafeWindow } from '../../../../utils/safeWindow';

interface PropsType {
  asset: AssetDTO;
}

const AssetFiles = ({ asset }: PropsType) => {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { hasEditPermission, hasDeletePermission } = useAuth();

  const handleDelete = (id: number) => {
    if (window.confirm(t('confirm_delete_file_asset'))) {
      dispatch(
        editAsset(asset.id, {
          ...asset,
          files: asset.files.filter((file) => file.id !== id)
        })
      );
    }
  };
  const columns: GridEnrichedColDef[] = [
    {
      field: 'name',
      headerName: t('name'),
      description: t('name'),
      flex: 1,
      minWidth: 180
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('actions'),
      description: t('actions'),
      width: 90,
      getActions: (params: GridRowParams) => {
        let actions = [
          <GridActionsCellItem
            key="delete"
            icon={<DeleteOutlinedIcon fontSize="small" color="error" />}
            onClick={() => handleDelete(Number(params.id))}
            label={t('to_delete')}
          />
        ];
        if (!hasEditPermission(PermissionEntity.ASSETS, asset)) actions.shift();
        return actions;
      }
    }
  ];
  return (
    <Box sx={{ px: { xs: 0, sm: 1, md: 2 } }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card
            variant="outlined"
            sx={{ p: { xs: 1, sm: 2 }, borderRadius: 2, minWidth: 0 }}
          >
            <Box sx={{ width: '100%', minWidth: 0 }}>
              <CustomDataGrid
                columns={columns}
                rows={asset?.files ?? []}
                components={{
                  Toolbar: GridToolbar
                }}
                onRowClick={(params: GridRowParams<FileMiniDTO>) => {
                  if (params.row.url) {
                    openSafeWindow(params.row.url);
                  }
                }}
                initialState={{
                  columns: {
                    columnVisibilityModel: {}
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AssetFiles;
