import { logSafeError } from '../../../utils/safeErrorLog';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from '../../../store';
import { useTranslation } from 'react-i18next';
import Part from '../../../models/part';
import { getAssetsByPart } from '../../../slices/asset';
import RelatedAssetList from '../../../components/RelatedAssetList';
import { beginRequest, isCurrentRequest } from '../../../utils/requestSequence';

export default function PartAssets({
  part,
  navigation
}: {
  part: Part;
  navigation: any;
}) {
  const dispatch = useDispatch();
  const { assetsByPart } = useSelector((state) => state.assets);
  const assets = assetsByPart[part.id] ?? [];
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadRequestSequence = useRef(0);

  const loadAssets = useCallback(async () => {
    const requestId = beginRequest(loadRequestSequence);
    setLoading(true);
    setError(false);
    try {
      await dispatch(getAssetsByPart(part.id));
    } catch (loadError) {
      if (!isCurrentRequest(requestId, loadRequestSequence)) return;
      logSafeError('Could not load equipment linked to part:', loadError);
      setError(true);
    } finally {
      if (isCurrentRequest(requestId, loadRequestSequence)) {
        setLoading(false);
      }
    }
  }, [dispatch, part.id]);

  useEffect(() => {
    void loadAssets();
    return () => {
      // Ignore completion after leaving this tab or changing its part context.
      beginRequest(loadRequestSequence);
    };
  }, [loadAssets]);

  return (
    <RelatedAssetList
      items={assets}
      loading={loading}
      error={error}
      emptyMessage={t('no_asset_related_part')}
      onRefresh={loadAssets}
      navigation={navigation}
    />
  );
}
