import { useContext, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import MultipleTabsLayout from '../components/MultipleTabsLayout';
import { Alert, Box } from '@mui/material';
import { TitleContext } from '../../../contexts/TitleContext';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import PermissionErrorMessage from '../components/PermissionErrorMessage';
import ContextualHelpButton from '../HelpCenter/ContextualHelpButton';

function SettingsLayout() {
  const { t }: { t: any } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const readOnlyContent = useRef<HTMLFieldSetElement>(null);
  const canViewSettings = Boolean(
    user.ownsCompany ||
      user.role?.viewPermissions?.includes(PermissionEntity.SETTINGS)
  );
  const canViewDocuments = Boolean(
    user.ownsCompany ||
      user.role?.viewPermissions?.includes(
        PermissionEntity.DOCUMENT_TEMPLATES
      ) ||
      canViewSettings
  );
  const canViewCategories = Boolean(
    user.ownsCompany ||
      user.role?.viewPermissions?.includes(PermissionEntity.CATEGORIES)
  );
  const canEditCategories = Boolean(
    user.ownsCompany ||
      user.role?.editOtherPermissions?.includes(PermissionEntity.CATEGORIES) ||
      user.role?.createPermissions?.includes(PermissionEntity.CATEGORIES) ||
      user.role?.deleteOtherPermissions?.includes(PermissionEntity.CATEGORIES)
  );
  const canEditSettings = Boolean(
    user.ownsCompany ||
      (user.role?.viewPermissions?.includes(PermissionEntity.SETTINGS) &&
        user.role?.editOtherPermissions?.includes(PermissionEntity.SETTINGS))
  );
  const canEditDocuments = Boolean(
    user.ownsCompany ||
      user.role?.editOtherPermissions?.includes(
        PermissionEntity.DOCUMENT_TEMPLATES
      ) ||
      canEditSettings
  );
  const canCreateDocuments = Boolean(
    user.ownsCompany ||
      user.role?.createPermissions?.includes(
        PermissionEntity.DOCUMENT_TEMPLATES
      ) ||
      canEditDocuments
  );
  const documentsOnly = !canViewSettings && canViewDocuments;
  const categoriesOnly =
    !canViewSettings && !canViewDocuments && canViewCategories;
  const isDocumentsRoute = location.pathname.includes('/settings/documents');
  const isCategoriesRoute = location.pathname.includes(
    '/settings/purchase-order-categories'
  );
  const canEditCurrentPage = isCategoriesRoute
    ? canEditCategories
    : isDocumentsRoute
    ? canEditDocuments || canCreateDocuments
    : canEditSettings;
  const readOnlyCurrentPage = isCategoriesRoute
    ? !canEditCategories
    : isDocumentsRoute
    ? !canEditDocuments && !canCreateDocuments
    : !canEditSettings;

  useEffect(() => {
    const content = readOnlyContent.current;
    if (!content) return;
    if (canEditCurrentPage) content.removeAttribute('inert');
    else content.setAttribute('inert', '');
  }, [canEditCurrentPage]);

  const tabs = documentsOnly
    ? [{ value: 'documents', label: t('document_templates') }]
    : categoriesOnly
    ? [
        {
          value: 'purchase-order-categories',
          label: t('purchase_order_categories')
        }
      ]
    : [
        { value: '', label: t('general_settings') },
        { value: 'features', label: t('features') },
        { value: 'roles', label: t('roles') },
        ...(canViewDocuments
          ? [{ value: 'documents', label: t('document_templates') }]
          : []),
        ...(canViewSettings
          ? [
              {
                value: 'document-access-history',
                label: t('document_access_history')
              }
            ]
          : []),
        ...(canViewSettings
          ? [{ value: 'approval-management', label: t('ap_management') }]
          : []),
        ...(canViewCategories
          ? [
              {
                value: 'purchase-order-categories',
                label: t('purchase_order_categories')
              }
            ]
          : []),
        ...(canViewSettings
          ? [{ value: 'help-center', label: t('help_center_management') }]
          : []),
        { value: 'integrations', label: t('integrations') },
        ...(user.role?.roleType === 'ROLE_SUPER_ADMIN'
          ? [{ value: 'subscription-catalog', label: t('plan_catalog') }]
          : [])
      ];

  // Determine the current tab index based on the URL path
  const getCurrentTabIndex = () => {
    return Math.max(
      0,
      tabs.length -
        1 -
        [...tabs]
          .reverse()
          .findIndex((tab) => location.pathname.includes('/' + tab.value))
    );
  };

  const { setTitle } = useContext(TitleContext);

  useEffect(() => {
    setTitle(t('settings'));
  }, []);

  if (documentsOnly && !isDocumentsRoute) {
    return <Navigate to="/app/settings/documents" replace />;
  }

  return canViewSettings ||
    canViewDocuments ||
    (isCategoriesRoute && canViewCategories) ? (
    <MultipleTabsLayout
      basePath="/app/settings"
      tabs={tabs}
      tabIndex={getCurrentTabIndex()}
      title={t('settings')}
      rawAction={
        canViewSettings ? (
          <ContextualHelpButton
            articleSlug="settings"
            labelKey="help_contextual_settings"
          />
        ) : null
      }
    >
      {readOnlyCurrentPage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('settings_read_only')}
        </Alert>
      )}
      <Box
        component="fieldset"
        ref={readOnlyContent}
        disabled={!canEditCurrentPage}
        aria-disabled={!canEditCurrentPage}
        sx={{
          border: 0,
          m: 0,
          minWidth: 0,
          p: 0,
          width: '100%'
        }}
      >
        <Outlet />
      </Box>
    </MultipleTabsLayout>
  ) : (
    <PermissionErrorMessage message={'no_access_settings'} />
  );
}

export default SettingsLayout;
