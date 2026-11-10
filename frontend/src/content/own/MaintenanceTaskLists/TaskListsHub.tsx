import { Box, Tab, Tabs } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import { PlanFeature } from '../../../models/owns/subscriptionPlan';
import MaintenanceTaskLists from './index';
import Checklists from '../Settings/Checklists';

/**
 * Single entry point for reusable task content: structured task lists (operations, components, counters,
 * used by PM plans) and simple checklists (picked with "Add tasks" on work orders, PMs and workflows).
 * Checklists used to live under Settings; /app/settings/checklists now redirects here.
 */
export default function TaskListsHub() {
  const { t }: { t: any } = useTranslation();
  const { hasViewPermission, hasFeature } = useAuth();
  const [params, setParams] = useSearchParams();
  // The checklist API requires the settings permission; hide the tab rather than show an error.
  const canManageChecklists =
    hasViewPermission(PermissionEntity.SETTINGS) && hasFeature(PlanFeature.CHECKLIST);
  const canViewTaskLists = hasViewPermission(PermissionEntity.TASK_LISTS);
  const requested = params.get('tab') === 'checklists' ? 'checklists' : 'task-lists';
  const tab =
    requested === 'checklists' && canManageChecklists
      ? 'checklists'
      : canViewTaskLists || !canManageChecklists
      ? 'task-lists'
      : 'checklists';

  const select = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'checklists') next.set('tab', 'checklists');
    else next.delete('tab');
    setParams(next, { replace: true });
  };

  return (
    <>
      {canManageChecklists && (
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            pt: { xs: 2, sm: 3 },
            maxWidth: 1500,
            mx: 'auto',
            width: '100%'
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, value) => select(value)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label={t('maintenance_task_lists')}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {canViewTaskLists && (
              <Tab value="task-lists" label={t('maintenance_task_lists')} />
            )}
            <Tab value="checklists" label={t('checklists')} />
          </Tabs>
        </Box>
      )}
      {tab === 'checklists' ? <Checklists /> : <MaintenanceTaskLists />}
    </>
  );
}
