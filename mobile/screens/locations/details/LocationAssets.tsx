import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from '../../../store';
import { useTranslation } from 'react-i18next';
import Location from '../../../models/location';
import { getAssetsByLocation } from '../../../slices/asset';
import RelatedAssetList from '../../../components/RelatedAssetList';

export default function LocationAssets({
  location,
  navigation
}: {
  location: Location;
  navigation: any;
}) {
  const dispatch = useDispatch();
  const { assetsByLocation } = useSelector((state) => state.assets);
  const assets = assetsByLocation[location.id] ?? [];
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      await dispatch(getAssetsByLocation(location.id));
    } catch (loadError) {
      console.warn('Could not load equipment linked to location:', loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [dispatch, location.id]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return (
    <RelatedAssetList
      items={assets}
      loading={loading}
      error={error}
      emptyMessage={t('no_asset_in_location')}
      onRefresh={loadAssets}
      navigation={navigation}
    />
  );
}
