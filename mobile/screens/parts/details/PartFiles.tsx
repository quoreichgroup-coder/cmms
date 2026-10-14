import { useDispatch } from '../../../store';
import { useTranslation } from 'react-i18next';
import Part from '../../../models/part';
import { editPart } from '../../../slices/part';
import AttachmentList from '../../../components/AttachmentList';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';

export default function PartFiles({ part }: { part: Part }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { hasEditPermission } = useAuth();
  const canDelete = hasEditPermission(
    PermissionEntity.PARTS_AND_MULTIPARTS,
    part
  );

  return (
    <AttachmentList
      files={part.files ?? []}
      confirmationMessage={t('confirm_delete_file_part')}
      canDelete={canDelete}
      onDelete={(id) =>
        dispatch(
          editPart(part.id, {
            ...part,
            files: (part.files ?? []).filter((file) => file.id !== id)
          })
        )
      }
    />
  );
}
