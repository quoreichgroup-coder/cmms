import { ChangeEvent, useContext, useRef, useState } from 'react';
import { Avatar, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { useTranslation } from 'react-i18next';
import api, { getErrorMessage } from '../../../utils/api';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';

/** Same limits as the API (DocumentLogoService): PNG or JPEG, 512 KiB at most. */
export const SITE_LOGO_MAX_BYTES = 512 * 1024;

/** Detects PNG/JPEG from the file signature; the browser-declared type is not trusted. */
export const isPngOrJpeg = (bytes: Uint8Array) =>
  (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a)
  || (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff);

interface SiteLogoSite {
  id?: number;
  name: string;
  logoId?: number | null;
  logoUrl?: string | null;
}

interface Props {
  site: SiteLogoSite;
  canEdit: boolean;
  onChange: (site: any) => void;
}

/** Logo printed on this site's documents; without one, documents use the company logo. */
export default function SiteLogoControl({ site, canEdit, onChange }: Props) {
  const { t }: { t: any } = useTranslation();
  const { uploadFiles } = useContext(CompanySettingsContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !site.id) return;
    if (file.size > SITE_LOGO_MAX_BYTES) {
      showSnackBar(t('site_logo_too_large'), 'error');
      return;
    }
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (!isPngOrJpeg(header)) {
      showSnackBar(t('site_logo_invalid_format'), 'error');
      return;
    }
    setBusy(true);
    try {
      const files = await uploadFiles([], [file]);
      const fileId = files?.[0]?.id;
      if (!fileId) throw new Error('site_logo_upload_error');
      onChange(await api.put(`sites/${site.id}/logo`, { fileId }));
      showSnackBar(t('site_logo_saved'), 'success');
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'site_logo_upload_error')), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!site.id) return;
    setBusy(true);
    try {
      onChange(await api.deletes(`sites/${site.id}/logo`));
      showSnackBar(t('site_logo_removed'), 'success');
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'site_logo_upload_error')), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
      <Avatar
        variant="rounded"
        src={site.logoUrl || undefined}
        alt={site.logoUrl ? t('site_logo_alt', { name: site.name }) : ''}
        sx={{ width: 56, height: 32, bgcolor: 'action.hover', '& img': { objectFit: 'contain' } }}
      >
        <ImageOutlinedIcon fontSize="small" color="disabled" />
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {site.logoUrl ? t('site_logo_used') : t('site_logo_company_fallback')}
        </Typography>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <input
              ref={inputRef}
              hidden
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => void upload(event)}
            />
            <Button size="small" disabled={busy} onClick={() => inputRef.current?.click()}
              startIcon={busy ? <CircularProgress size={14} /> : undefined}>
              {site.logoUrl ? t('site_logo_replace') : t('site_logo_add')}
            </Button>
            {site.logoUrl && (
              <Button size="small" color="inherit" disabled={busy} onClick={() => void remove()}>
                {t('site_logo_remove')}
              </Button>
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
