import { SheetProps } from 'react-native-actions-sheet';
import { useTheme } from 'react-native-paper';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { AssetDTO } from '../../models/asset';
import CustomActionSheet, {
  CustomActionSheetOption
} from './CustomActionSheet';
import { getAssetDetailsActionVisibility } from '../../utils/assetDetailsAccess';

export default function AssetDetailsSheet(
  props: SheetProps<{
    onEdit: () => void;
    onAddFile: () => void;
    onAddPart: () => void;
    onCreateWorkOrder: () => void;
    onCreateChildAsset: () => void;
    onDelete: () => void;
    asset: AssetDTO;
  }>
) {
  const { t } = useTranslation();
  const { hasEditPermission, hasDeletePermission, hasCreatePermission } =
    useAuth();
  const theme = useTheme();
  const actionVisibility = getAssetDetailsActionVisibility({
    canEditAsset: hasEditPermission(
      PermissionEntity.ASSETS,
      props.payload.asset
    ),
    canCreateWorkOrder: hasCreatePermission(PermissionEntity.WORK_ORDERS),
    canCreateChildAsset: hasCreatePermission(PermissionEntity.ASSETS),
    canDeleteAsset: hasDeletePermission(
      PermissionEntity.ASSETS,
      props.payload.asset
    )
  });
  const options: CustomActionSheetOption[] = [
    {
      title: t('edit'),
      icon: 'pencil',
      onPress: props.payload.onEdit,
      visible: actionVisibility.canEditAsset
    },
    {
      title: t('create_work_order'),
      icon: 'clipboard-text-outline',
      onPress: props.payload.onCreateWorkOrder,
      visible: actionVisibility.canCreateWorkOrder
    },
    {
      title: t('create_child_asset'),
      icon: 'package-variant-closed',
      onPress: props.payload.onCreateChildAsset,
      visible: actionVisibility.canCreateChildAsset
    },
    {
      title: t('to_delete'),
      icon: 'delete-outline',
      onPress: props.payload.onDelete,
      color: theme.colors.error,
      visible: actionVisibility.canDeleteAsset
    }
  ];

  return <CustomActionSheet options={options} />;
}
