import { useDispatch } from '../../../store';
import { useTranslation } from 'react-i18next';
import Location from '../../../models/location';
import { editLocation } from '../../../slices/location';
import AttachmentList from '../../../components/AttachmentList';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';

export default function LocationFiles({ location }: { location: Location }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { hasEditPermission } = useAuth();
  const canDelete = hasEditPermission(PermissionEntity.LOCATIONS, location);

  return (
    <AttachmentList
      files={location.files ?? []}
      confirmationMessage={t('confirm_delete_file_location')}
      canDelete={canDelete}
      onDelete={(id) =>
        dispatch(
          editLocation(location.id, {
            ...location,
            files: (location.files ?? []).filter((file) => file.id !== id)
          })
        )
      }
    />
  );
}
