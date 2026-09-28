import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Stack,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AssetDTO } from '../../../../models/owns/asset';
import { Page } from '../../../../models/owns/page';
import api from '../../../../utils/api';
import { getAssetUrl } from '../../../../utils/urlPaths';

export default function AssetChildrenSummary({ assetId }: { assetId: number }) {
  const { t } = useTranslation();
  const [children, setChildren] = useState<AssetDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [nextPage, setNextPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setChildren([]);
    setTotal(0);
    setNextPage(1);
    setLoadMoreFailed(false);
    api
      .get<Page<AssetDTO>>(
        `assets/children/${assetId}/paginated?page=0&size=5&sort=name,asc`,
        { signal: controller.signal }
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          setChildren(result.content);
          setTotal(result.totalElements);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [assetId, attempt]);

  const loadMore = () => {
    setLoadingMore(true);
    setLoadMoreFailed(false);
    api
      .get<Page<AssetDTO>>(
        `assets/children/${assetId}/paginated?page=${nextPage}&size=5&sort=name,asc`
      )
      .then((result) => {
        setChildren((previous) => [...previous, ...result.content]);
        setNextPage((page) => page + 1);
      })
      .catch(() => setLoadMoreFailed(true))
      .finally(() => setLoadingMore(false));
  };

  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
      >
        <Typography variant="h5">{t('asset_child_assets')}</Typography>
        {!!total && (
          <Typography variant="body2" color="text.secondary">
            {total}
          </Typography>
        )}
      </Stack>
      {loading ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <CircularProgress size={28} aria-label={t('asset_child_assets')} />
        </Box>
      ) : failed ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {t('asset_retry')}
            </Button>
          }
        >
          {t('an_error_occured')}
        </Alert>
      ) : children.length ? (
        <Stack>
          {children.map((child) => (
            <Button
              key={child.id}
              component={Link}
              to={getAssetUrl(child.id)}
              sx={{
                justifyContent: 'flex-start',
                px: 0,
                py: 1,
                textAlign: 'left',
                textTransform: 'none'
              }}
            >
              <Stack sx={{ minWidth: 0, alignItems: 'flex-start' }}>
                <Typography noWrap>{child.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {child.customId || child.serialNumber || `#${child.id}`}
                  {child.status ? ` · ${t(child.status)}` : ''}
                </Typography>
              </Stack>
            </Button>
          ))}
          {total > children.length && (
            <Button
              size="small"
              onClick={loadMore}
              disabled={loadingMore}
              sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
            >
              {loadingMore ? (
                <CircularProgress size={16} />
              ) : loadMoreFailed ? (
                t('asset_retry')
              ) : (
                t('asset_more_children', { count: total - children.length })
              )}
            </Button>
          )}
        </Stack>
      ) : (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          {t('asset_no_children')}
        </Typography>
      )}
    </Card>
  );
}
