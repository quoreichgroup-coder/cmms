import { useMediaQuery, useTheme } from '@mui/material';

/** True on phone-width screens, where dialogs should open full screen (pattern used by the work-order form). */
export default function useCompactDialog(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}
