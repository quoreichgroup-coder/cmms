import { useDispatch } from '../../../store';
import { useTranslation } from 'react-i18next';
import { AssetDTO } from '../../../models/asset';
import { editAsset } from '../../../slices/asset';
import AttachmentList from '../../../components/AttachmentList';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';

export default function AssetFiles({ asset }: { asset: AssetDTO }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { hasEditPermission } = useAuth();
  const canDelete = hasEditPermission(PermissionEntity.ASSETS, asset);
  return (
    <AttachmentList
      files={asset.files ?? []}
      confirmationMessage={t('confirm_delete_file_asset')}
      canDelete={canDelete}
      onDelete={(id) =>
        dispatch(
          editAsset(asset.id, {
            ...asset,
            files: (asset.files ?? []).filter((file) => file.id !== id)
          })
        )
      }
    />
  );
}
