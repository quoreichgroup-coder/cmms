import {
  Box,
  Button,
  Card,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AssetDTO } from '../../../../models/owns/asset';
import { UserMiniDTO } from '../../../../models/user';
import { Customer } from '../../../../models/owns/customer';
import { Vendor } from '../../../../models/owns/vendor';
import Team, { TeamMiniDTO } from '../../../../models/owns/team';
import {
  getCustomerUrl,
  getTeamUrl,
  getUserUrl,
  getVendorUrl
} from '../../../../utils/urlPaths';
import { useContext } from 'react';
import { useDispatch } from '../../../../store';
import { editAsset } from '../../../../slices/asset';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import AssetStatusSelect from '../components/AssetStatusSelect';
import Loading from '../../Analytics/Loading';
import { PermissionEntity } from '../../../../models/owns/role';
import SplitButton from '../../components/SplitButton';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import * as React from 'react';
import useAuth from '../../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getCustomFieldValuesForDetails } from '../../type';
import { QRCodeSVG } from 'qrcode.react';
import { useLicenseEntitlement } from '../../../../hooks/useLicenseEntitlement';
import { populateQrPrintDocument } from '../../../../utils/printQrCode';

interface PropsType {
  asset: AssetDTO;
  loading: boolean;
  onCopy?: () => void;
}
const downloadQRCode = (value: string) => {
  const svgElement = document.getElementById(`qr-code-${value}`);
  if (!svgElement) return;

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  canvas.width = 120;
  canvas.height = 120;

  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx?.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `qr-code-${value}.png`;
    link.click();
  };

  img.src = url;
};
const printAssetLabel = (asset: AssetDTO, t: (key: string) => string) => {
  if (!asset.barCode) return;

  const svgElement = document.getElementById(`qr-code-${asset.barCode}`);
  if (!svgElement) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.opener = null;

  const svgData = new XMLSerializer().serializeToString(svgElement);
  populateQrPrintDocument(
    printWindow,
    asset.name,
    `data:image/svg+xml;base64,${btoa(svgData)}`,
    {
      subtitle: t('asset_label_scan_hint'),
      identifier: `${t('barcode')}: ${asset.barCode}`
    }
  );
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};
const AssetDetails = ({ asset, loading, onCopy }: PropsType) => {
  const { t }: { t: any } = useTranslation();
  const { hasCreatePermission, hasEditPermission } = useAuth();
  const hasNfcBarcode = useLicenseEntitlement('NFC_BARCODE');
  const navigate = useNavigate();
  const { getFormattedDate, getFormattedCurrency } = useContext(
    CompanySettingsContext
  );
  const dispatch = useDispatch();
  const informationFields = [
    { label: t('name'), value: asset?.name },
    { label: t('description'), value: asset?.description },
    { label: t('category'), value: asset?.category?.name },
    { label: t('model'), value: asset?.model },
    { label: t('serial_number'), value: asset?.serialNumber },
    { label: t('power'), value: asset?.power },
    { label: t('manufacturer'), value: asset?.manufacturer },
    {
      label: t('acquisition_cost'),
      value: asset?.acquisitionCost
        ? getFormattedCurrency(asset?.acquisitionCost)
        : null
    },
    { label: t('area'), value: asset?.area },
    { label: t('barcode'), value: asset?.barCode, barcode: true },
    ...(hasNfcBarcode ? [{ label: t('nfc_tag'), value: asset?.nfcId }] : [])
  ];
  const moreInfosFields = [
    {
      label: t('additional_information'),
      value: asset?.additionalInfos
    },
    {
      label: t('placed_in_service'),
      value: getFormattedDate(asset?.inServiceDate)
    },
    {
      label: t('warranty_expiration'),
      value: getFormattedDate(asset?.warrantyExpirationDate)
    },
    ...getCustomFieldValuesForDetails(
      asset?.customFieldValues,
      getFormattedDate
    )
  ];
  const BasicField = ({
    label,
    value,
    barcode
  }: {
    label: string | number;
    value: string | number;
    barcode?: boolean;
  }) => {
    return value ? (
      <Grid item xs={12}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0.5, sm: 5 }}
          sx={{ minWidth: 0 }}
        >
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ flexShrink: 0 }}
          >
            {label}
          </Typography>
          <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <Typography variant="body1" fontWeight={500}>
              {value}
            </Typography>
            {barcode && value && (
              <Stack alignItems="flex-start" spacing={1}>
                <IconButton
                  aria-label={t('download_asset_qr')}
                  title={t('download_asset_qr')}
                  onClick={() => downloadQRCode(value.toString())}
                  sx={{ mt: 1, ml: -1, width: 196, height: 196 }}
                >
                  <QRCodeSVG
                    id={`qr-code-${value}`}
                    value={value.toString()}
                    size={180}
                    level="H"
                    includeMargin
                  />
                </IconButton>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PrintOutlinedIcon />}
                  onClick={() => printAssetLabel(asset, t)}
                >
                  {t('print_asset_label')}
                </Button>
              </Stack>
            )}
          </Box>
        </Stack>
        <Divider sx={{ mt: 1 }} />
      </Grid>
    ) : null;
  };
  const ListField = <T extends { id: number }>({
    values,
    label,
    getHref,
    getValueLabel
  }: {
    values: T[];
    label: string;
    getHref: (value: T) => string;
    getValueLabel: (value: T) => string;
  }) => {
    return (
      !!values?.length && (
        <Grid item xs={12}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.5, sm: 5 }}
            sx={{ minWidth: 0 }}
          >
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ flexShrink: 0 }}
            >
              {label}
            </Typography>
            <Stack
              spacing={1}
              direction="row"
              flexWrap="wrap"
              sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
            >
              {values.map((value, index) => (
                <Stack key={value.id} spacing={1} direction="row">
                  <Link href={getHref(value)} variant="h6">
                    {getValueLabel(value)}
                  </Link>
                  {index !== values.length - 1 && (
                    <Typography variant="h6">,</Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          </Stack>
          <Divider sx={{ mt: 1 }} />
        </Grid>
      )
    );
  };
  if (loading)
    return (
      <Box
        sx={{
          height: '50vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Loading />
      </Box>
    );
  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 4 } }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {asset?.image && (
                <Grid item xs={12}>
                  <img
                    src={asset.image.url}
                    alt={asset.name}
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: 300,
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  spacing={2}
                >
                  <Stack
                    direction="row"
                    spacing={{ xs: 1, sm: 2 }}
                    alignItems="center"
                    sx={{ flexWrap: 'wrap' }}
                  >
                    <Typography
                      variant="h3"
                      sx={{ fontSize: { xs: 24, sm: 30 } }}
                    >
                      {t('asset_information')}
                    </Typography>
                    {asset && (
                      <AssetStatusSelect
                        value={asset.status}
                        onChange={(status) =>
                          dispatch(editAsset(asset.id, { ...asset, status }))
                        }
                        disabled={
                          !hasEditPermission(PermissionEntity.ASSETS, asset)
                        }
                      />
                    )}
                    {hasCreatePermission(PermissionEntity.ASSETS) && (
                      <IconButton
                        onClick={onCopy}
                        aria-label={t('copy_asset')}
                        title={t('copy_asset')}
                      >
                        <ContentCopyOutlinedIcon />
                      </IconButton>
                    )}
                  </Stack>
                  {hasCreatePermission(PermissionEntity.WORK_ORDERS) && (
                    <Button
                      onClick={() =>
                        navigate(`/app/work-orders?asset=${asset.id}`)
                      }
                      startIcon={<AddOutlinedIcon />}
                      variant={'contained'}
                      sx={{
                        alignSelf: { xs: 'flex-start', sm: 'auto' },
                        minHeight: 44
                      }}
                    >
                      {t('work_order')}
                    </Button>
                  )}
                </Stack>
              </Grid>
              {informationFields.map((field) => (
                <BasicField key={field.label} {...field} />
              ))}
              <Grid item xs={12}>
                <Typography variant="h3">{t('more_informations')}</Typography>
              </Grid>
              {moreInfosFields.map((field) => (
                <BasicField key={field.label} {...field} />
              ))}
              {asset?.primaryUser && (
                <Grid item xs={12}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 0.5, sm: 5 }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ flexShrink: 0 }}
                    >
                      {t('primary_worker')}
                    </Typography>
                    <Link
                      key={asset.primaryUser.id}
                      href={`/app/people-teams/people/${asset.primaryUser.id}`}
                      variant="body1"
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {`${asset.primaryUser.firstName} ${asset.primaryUser.lastName}`}
                    </Link>
                  </Stack>
                  <Divider sx={{ mt: 1 }} />
                </Grid>
              )}
              {asset?.location && (
                <Grid item xs={12}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 0.5, sm: 5 }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ flexShrink: 0 }}
                    >
                      {t('location')}
                    </Typography>
                    <Link
                      href={`/app/locations/${asset.location.id}`}
                      variant="body1"
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {asset.location.name}
                    </Link>
                  </Stack>
                  <Divider sx={{ mt: 1 }} />
                </Grid>
              )}
              <ListField
                values={asset?.assignedTo}
                label={t('assigned_to')}
                getHref={(user: UserMiniDTO) => getUserUrl(user.id)}
                getValueLabel={(user: UserMiniDTO) =>
                  `${user.firstName} ${user.lastName}`
                }
              />
              <ListField
                values={asset?.customers}
                label={t('customers')}
                getHref={(customer: Customer) => getCustomerUrl(customer.id)}
                getValueLabel={(customer: Customer) => customer.name}
              />
              <ListField
                values={asset?.vendors}
                label={t('vendors')}
                getHref={(vendor: Vendor) => getVendorUrl(vendor.id)}
                getValueLabel={(vendor: Vendor) => vendor.companyName}
              />
              <ListField
                values={asset?.teams}
                label={t('teams')}
                getHref={(team: TeamMiniDTO) => getTeamUrl(team.id)}
                getValueLabel={(team: TeamMiniDTO) => team.name}
              />
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AssetDetails;
