import { useEffect, useRef, useState } from 'react';
import frLocale from '@fullcalendar/core/locales/fr';
import enLocale from '@fullcalendar/core/locales/en-gb';
import FullCalendar, { LocaleSingularArg } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import {
  Alert,
  Button,
  Box,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  Grid,
  Stack,
  styled,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { alpha, lighten } from '@mui/material/styles';

import type { View } from 'src/models/calendar';
import { useDispatch, useSelector } from 'src/store';
import WorkOrder, { Priority } from 'src/models/owns/workOrder';
import { CalendarEvent, getWorkOrderEvents } from 'src/slices/workOrder';
import Actions from './Actions';
import i18n from 'i18next';
import PreventiveMaintenance from 'src/models/owns/preventiveMaintenance';
import {
  getCalendarLocale,
  getDateLocale,
  getSupportedLanguage,
  supportedLanguages
} from '../../../../i18n/i18n';
import { Locale as DateLocale } from 'date-fns';
import enGb from '@fullcalendar/core/locales/en-gb';
import { useTranslation } from 'react-i18next';
import { FilterField } from 'src/models/owns/page';
import { loadFilterFields, saveFilterFields } from 'src/utils/filter';
import MoreFilters from '../Filters/MoreFilters';
import _ from 'lodash';
import {
  getCalendarEventColor,
  getCalendarEventStatus
} from './eventPresentation';
import { qpmWorkOrderStatusTokens } from 'src/theme/tokens';

const FullCalendarWrapper = styled(Box)(
  ({ theme }) => `
    padding: ${theme.spacing(1)};
    position: relative;

    @media (min-width: ${theme.breakpoints.values.sm}px) {
      padding: ${theme.spacing(2)};
    }
   
    & .fc-license-message {
      display: none;
    }
    .fc {
      .fc-daygrid-day,.fc-timegrid-slot{
        cursor: pointer;
      }
      .fc-col-header-cell {
        padding: ${theme.spacing(1)};
        background: ${theme.palette.background.default};
        color: ${theme.palette.text.secondary};
        font-weight: 600;
      }

      .fc-scrollgrid {
        border: 1px solid ${theme.palette.divider};
        border-right-width: 1px;
        border-bottom-width: 1px;
        border-radius: ${theme.shape.borderRadius * 1.5}px;
        overflow: hidden;
      }

      .fc-cell-shaded,
      .fc-list-day-cushion {
        background: ${theme.palette.background.default};
      }

      .fc-list-event-graphic {
        padding-right: ${theme.spacing(1)};
      }

      .fc-theme-standard td, .fc-theme-standard th,
      .fc-col-header-cell {
        border: 1px solid ${theme.palette.divider};
      }

      .fc-event {
        padding: ${theme.spacing(0.1)} ${theme.spacing(0.25)};
        border: 0 !important;
        background: transparent !important;
        cursor: pointer;
      }

      .fc-list-day-side-text {
        font-weight: normal;
        color: ${theme.palette.text.secondary};
      }

      .fc-list-event:hover td,
      td.fc-daygrid-day.fc-day-today {
        background-color: ${theme.palette.action.hover};
      }

      td.fc-daygrid-day:hover,
      .fc-highlight {
        background: ${theme.palette.action.hover};
      }

      .fc-daygrid-dot-event:hover, 
      .fc-daygrid-dot-event.fc-event-mirror {
        background: ${theme.palette.action.hover};
      }

      .fc-daygrid-day-number {
        padding: ${theme.spacing(1)};
        font-weight: 600;
        color: ${theme.palette.text.primary};
      }

      .fc-list-sticky .fc-list-day > * {
        background: ${theme.palette.background.default} !important;
      }

      .fc-cell-shaded, 
      .fc-list-day-cushion {
        background: ${theme.palette.background.default} !important;
        color: ${theme.palette.text.secondary} !important;
      }

      &.fc-theme-standard td, 
      &.fc-theme-standard th,
      &.fc-theme-standard .fc-list {
        border-color: ${theme.palette.divider};
      }

      .fc-day-today {
        background: ${theme.palette.action.selected} !important;
      }

      .fc-daygrid-day-frame {
        transition: background-color 120ms ease;
      }

      .fc-daygrid-day:hover .fc-daygrid-day-frame {
        background: ${theme.palette.action.hover};
      }

      .fc-timegrid-slot-label,
      .fc-timegrid-axis-cushion {
        color: ${theme.palette.text.secondary};
        font-size: 0.75rem;
      }

      .fc-list-event:hover td {
        background: ${theme.palette.action.hover};
      }
    }
`
);

interface Event {
  id: string;
  allDay: boolean;
  color: string;
  textColor: string;
  description: string;
  end: Date;
  start: Date;
  title: string;
  extendedProps: {
    type: string;
    status?: string | null;
    priority: Priority;
    accentColor: string;
  };
}

interface OwnProps {
  handleAddWorkOrder: (date: Date) => void;
  handleOpenDetails: (id: number, type: string) => void;
  companyId: number | null;
  eventsRefreshTrigger?: number;
}

const FILTERS_STORAGE_KEY = 'workOrder_filters';
const DEFAULT_FILTER_FIELDS: FilterField[] = [
  { field: 'archived', operation: 'eq', value: false },
  {
    field: 'priority',
    operation: 'in',
    values: ['NONE', 'LOW', 'MEDIUM', 'HIGH'],
    value: '',
    enumName: 'PRIORITY'
  },
  {
    field: 'status',
    operation: 'in',
    values: ['OPEN', 'IN_PROGRESS', 'ON_HOLD'],
    value: '',
    enumName: 'STATUS'
  }
];

const normalizeFields = (fields: FilterField[]) =>
  [...fields]
    .sort((a, b) => a.field.localeCompare(b.field))
    .map((f) => ({ ...f, values: f.values ? [...f.values].sort() : f.values }));

const getInitialFilterFields = (): FilterField[] =>
  loadFilterFields(FILTERS_STORAGE_KEY, DEFAULT_FILTER_FIELDS);

function ApplicationsCalendar({
  handleAddWorkOrder,
  handleOpenDetails,
  companyId,
  eventsRefreshTrigger = 0
}: OwnProps) {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'));
  const { i18n, t } = useTranslation();
  const calendarRef = useRef<FullCalendar | null>(null);
  const dispatch = useDispatch();
  const { calendar } = useSelector((state) => state.workOrders);
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>('timeGridWeek');
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>({
    start: null,
    end: null
  });
  const [filterFields, setFilterFields] = useState<FilterField[]>(
    getInitialFilterFields()
  );
  const [openFilterDrawer, setOpenFilterDrawer] = useState<boolean>(false);
  const getLanguage = i18n.language;
  const [calendarLocale, setCalendarLocale] = useState<LocaleSingularArg>(enGb);

  const onFilterChange = (newFilters: FilterField[]) => {
    setFilterFields(newFilters);
    saveFilterFields(FILTERS_STORAGE_KEY, newFilters, new Set());
  };
  const handleCloseFilterDrawer = () => setOpenFilterDrawer(false);

  useEffect(() => {
    getCalendarLocale(i18n.language).then(setCalendarLocale);
  }, [i18n.language]);

  const getColor = (priority: Priority) => {
    switch (priority) {
      case 'HIGH':
        return theme.colors.error.main;
      case 'MEDIUM':
        return theme.colors.warning.main;
      case 'LOW':
        return theme.colors.info.main;
      case 'NONE':
        return theme.colors.primary.main;
      default:
        break;
    }
  };
  const getEventFromWO = (
    eventPayload: CalendarEvent<WorkOrder | PreventiveMaintenance>
  ): Event => {
    const status =
      'status' in eventPayload.event ? eventPayload.event.status : undefined;
    const color =
      getCalendarEventColor({
        status,
        dueDate: eventPayload.event.dueDate
      }) ??
      getColor(eventPayload.event.priority) ??
      theme.colors.primary.main;

    return {
      id: eventPayload.event.id.toString(),
      allDay: false,
      color: theme.palette.background.paper,
      textColor: theme.palette.text.primary,
      description: eventPayload.event?.description,
      end: new Date(eventPayload.endDate),
      start: new Date(eventPayload.date),
      title: eventPayload.event.title,
      extendedProps: {
        type: eventPayload.type,
        status: getCalendarEventStatus({
          status,
          dueDate: eventPayload.event.dueDate
        }),
        priority: eventPayload.event.priority,
        accentColor: color
      }
    };
  };
  const handleDateToday = (): void => {
    const calItem = calendarRef.current;

    if (calItem) {
      const calApi = calItem.getApi();

      calApi.today();
      setDate(calApi.getDate());
    }
  };
  useEffect(() => {
    if (visibleRange.start && visibleRange.end)
      dispatch(
        getWorkOrderEvents(
          visibleRange.start,
          visibleRange.end,
          companyId,
          filterFields
        )
      );
  }, [
    visibleRange.start,
    visibleRange.end,
    companyId,
    filterFields,
    eventsRefreshTrigger
  ]);
  const changeView = (changedView: View): void => {
    const calItem = calendarRef.current;

    if (calItem) {
      const calApi = calItem.getApi();

      calApi.changeView(changedView);
      setView(changedView);
    }
  };

  const handleDatePrev = (): void => {
    const calItem = calendarRef.current;

    if (calItem) {
      const calApi = calItem.getApi();

      calApi.prev();
      setDate(calApi.getDate());
    }
  };

  const handleDateNext = (): void => {
    const calItem = calendarRef.current;

    if (calItem) {
      const calApi = calItem.getApi();

      calApi.next();
      setDate(calApi.getDate());
    }
  };

  return (
    <Grid item xs={12}>
      <Actions
        date={date}
        rangeStart={visibleRange.start}
        rangeEnd={visibleRange.end}
        onNext={handleDateNext}
        onPrevious={handleDatePrev}
        onToday={handleDateToday}
        changeView={changeView}
        view={view}
        onFilterClick={() => setOpenFilterDrawer(true)}
        hasActiveFilters={
          !_.isEqual(
            normalizeFields(filterFields),
            normalizeFields(DEFAULT_FILTER_FIELDS)
          )
        }
      />
      <Divider />
      {calendar.error && (
        <Alert
          severity="error"
          action={
            <Button
              onClick={() =>
                dispatch(
                  getWorkOrderEvents(
                    visibleRange.start,
                    visibleRange.end,
                    companyId,
                    filterFields
                  )
                )
              }
            >
              {t('retry')}
            </Button>
          }
        >
          {calendar.error}
        </Alert>
      )}
      <FullCalendarWrapper>
        {calendar.loading && (
          <Stack position="absolute" top={'45%'} left={'45%'} zIndex={10}>
            <CircularProgress size={64} />
          </Stack>
        )}
        <FullCalendar
          allDaySlot={false}
          initialDate={date}
          initialView={view}
          locale={calendarLocale}
          droppable
          eventDisplay="block"
          eventClick={(arg) =>
            handleOpenDetails(
              Number(arg.event.id),
              arg.event.extendedProps.type
            )
          }
          dateClick={(event) => handleAddWorkOrder(event.date)}
          dayMaxEventRows={4}
          datesSet={(arg) =>
            setVisibleRange((current) =>
              current.start?.getTime() === arg.start.getTime() &&
              current.end?.getTime() === arg.end.getTime()
                ? current
                : { start: arg.start, end: arg.end }
            )
          }
          events={calendar.events.map((eventPayload) =>
            getEventFromWO(eventPayload)
          )}
          eventContent={(arg) => {
            const status = arg.event.extendedProps.status;
            const statusToken = status
              ? qpmWorkOrderStatusTokens[status] ??
                qpmWorkOrderStatusTokens.DEFAULT
              : null;
            const accentColor = arg.event.extendedProps.accentColor;
            return (
              <Box
                sx={{
                  minWidth: 0,
                  overflow: 'hidden',
                  px: 0.75,
                  py: 0.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeft: '3px solid',
                  borderLeftColor: accentColor,
                  borderRadius: 1.25,
                  boxShadow: 1
                }}
              >
                {status && (
                  <Chip
                    size="small"
                    label={t(status === 'OVERDUE' ? 'overdue' : status)}
                    sx={{
                      display: 'flex',
                      width: 'fit-content',
                      maxWidth: '100%',
                      height: 20,
                      mb: 0.5,
                      color:
                        theme.palette.mode === 'dark'
                          ? lighten(statusToken?.foreground ?? '#475467', 0.58)
                          : statusToken?.foreground,
                      bgcolor: alpha(
                        statusToken?.foreground ?? '#475467',
                        0.16
                      ),
                      '& .MuiChip-label': {
                        px: 0.75,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: 10,
                        fontWeight: 700
                      }
                    }}
                  />
                )}
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    color: 'text.primary',
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {arg.event.title}
                </Box>
              </Box>
            );
          }}
          headerToolbar={false}
          height={isCompact ? 'auto' : 660}
          ref={calendarRef}
          rerenderDelay={10}
          weekends
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            listPlugin
          ]}
        />
      </FullCalendarWrapper>
      <Drawer
        anchor="left"
        open={openFilterDrawer}
        onClose={handleCloseFilterDrawer}
        PaperProps={{
          sx: { width: { xs: '100vw', sm: 360, md: 420 }, maxWidth: '100vw' }
        }}
      >
        <MoreFilters
          filterFields={filterFields}
          onFilterChange={onFilterChange}
          onClose={handleCloseFilterDrawer}
          onReset={() => {
            onFilterChange(DEFAULT_FILTER_FIELDS);
            handleCloseFilterDrawer();
          }}
          showEnumFilters
        />
      </Drawer>
    </Grid>
  );
}

export default ApplicationsCalendar;
