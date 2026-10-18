import type { ElementType, FC, ReactNode } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Grid,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';

import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import ViewDayOutlinedIcon from '@mui/icons-material/ViewDayOutlined';
import CalendarViewMonthOutlinedIcon from '@mui/icons-material/CalendarViewMonthOutlined';
import ViewWeekOutlinedIcon from '@mui/icons-material/ViewWeekOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import type { View } from 'src/models/calendar';
import { useTranslation } from 'react-i18next';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import useDateLocale from '../../../../hooks/useDateLocale';
import { getCalendarPeriodLabel } from './periodLabel';

interface ActionsProps {
  children?: ReactNode;
  className?: string;
  date: Date;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  onNext?: () => void;
  onPrevious?: () => void;
  onToday?: () => void;
  handleCreateEvent?: () => void;
  changeView?: (view: View) => void;
  view: View;
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
}

interface ViewOption {
  label: string;
  value: View;
  icon: ElementType;
}

const viewOptions: ViewOption[] = [
  {
    label: 'month',
    value: 'dayGridMonth',
    icon: CalendarViewMonthOutlinedIcon
  },
  {
    label: 'week',
    value: 'timeGridWeek',
    icon: ViewWeekOutlinedIcon
  },
  {
    label: 'day',
    value: 'timeGridDay',
    icon: ViewDayOutlinedIcon
  },
  {
    label: 'agenda',
    value: 'listWeek',
    icon: ViewAgendaOutlinedIcon
  }
];

const Actions: FC<ActionsProps> = ({
  date,
  rangeStart,
  rangeEnd,
  onNext,
  onPrevious,
  onToday,
  changeView,
  view,
  onFilterClick,
  hasActiveFilters
}) => {
  const { t }: { t: any } = useTranslation();
  const dateLocale = useDateLocale();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.25, sm: 2 },
        mb: 2,
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        borderColor: 'divider'
      }}
    >
      <Grid container spacing={{ xs: 1.5, md: 2 }} alignItems="center">
        <Grid item xs={12} md="auto">
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.25}
              sx={{
                p: 0.5,
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Tooltip arrow placement="top" title={t('previous')}>
                <IconButton
                  color="primary"
                  aria-label={t('previous')}
                  onClick={onPrevious}
                  size="small"
                >
                  <ArrowBackOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip arrow placement="top" title={t('next')}>
                <IconButton
                  color="primary"
                  aria-label={t('next')}
                  onClick={onNext}
                  size="small"
                >
                  <ArrowForwardOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              onClick={onToday}
              startIcon={<TodayOutlinedIcon />}
              sx={{ minHeight: 40, borderRadius: 1.75, whiteSpace: 'nowrap' }}
            >
              {t('today')}
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12} md>
          <Typography
            variant="h5"
            color="text.primary"
            sx={{
              textAlign: { xs: 'left', md: 'center' },
              fontWeight: 700,
              textTransform: 'capitalize',
              lineHeight: 1.2
            }}
          >
            {getCalendarPeriodLabel({
              date,
              view,
              rangeStart,
              rangeEnd,
              locale: dateLocale
            })}
          </Typography>
        </Grid>
        <Grid item xs={12} md="auto">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ minWidth: 0, overflowX: 'auto', borderRadius: 2 }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={view}
                aria-label={t('calendar_view')}
                onChange={(_event, nextView: View | null) => {
                  if (nextView) changeView(nextView);
                }}
                sx={{
                  whiteSpace: 'nowrap',
                  p: 0.5,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  '& .MuiToggleButtonGroup-grouped': {
                    border: 0,
                    borderRadius: '8px !important',
                    mx: 0.25
                  },
                  '& .Mui-selected': {
                    bgcolor: 'primary.main !important',
                    color: 'primary.contrastText !important',
                    boxShadow: 1
                  }
                }}
              >
                {viewOptions.map((viewOption) => {
                  const Icon = viewOption.icon;
                  return (
                    <ToggleButton
                      key={viewOption.value}
                      value={viewOption.value}
                      aria-label={t(viewOption.label)}
                      sx={{ px: { xs: 1, sm: 1.5 }, minHeight: 40, gap: 0.5 }}
                    >
                      <Icon fontSize="small" />
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ display: { xs: 'inline', sm: 'none' }, ml: 0.75 }}
                      >
                        {t(viewOption.label)}
                      </Typography>
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            </Box>
            {onFilterClick && (
              <Tooltip arrow placement="top" title={t('more_filters')}>
                <IconButton
                  color={hasActiveFilters ? 'primary' : 'secondary'}
                  aria-label={t('more_filters')}
                  aria-pressed={Boolean(hasActiveFilters)}
                  sx={
                    hasActiveFilters
                      ? {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': { bgcolor: 'primary.dark' }
                        }
                      : { border: '1px solid', borderColor: 'divider' }
                  }
                  onClick={onFilterClick}
                >
                  <FilterAltOutlinedIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

Actions.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  date: PropTypes.instanceOf(Date).isRequired,
  rangeStart: PropTypes.instanceOf(Date),
  rangeEnd: PropTypes.instanceOf(Date),
  onNext: PropTypes.func,
  onPrevious: PropTypes.func,
  onToday: PropTypes.func,
  handleCreateEvent: PropTypes.func,
  changeView: PropTypes.func,
  view: PropTypes.oneOf([
    'dayGridMonth',
    'timeGridWeek',
    'timeGridDay',
    'listWeek'
  ])
};

Actions.defaultProps = {
  onNext: () => {},
  onPrevious: () => {},
  onToday: () => {},
  rangeStart: null,
  rangeEnd: null,
  handleCreateEvent: () => {},
  changeView: () => {},
  onFilterClick: null,
  hasActiveFilters: false
};

export default Actions;
