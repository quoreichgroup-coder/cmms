/** Shared QPM visual identity tokens. Operational status colors stay separate. */
export const qpmBrandTokens = {
  primary: '#4B5FE8',
  canvas: '#F4F6FD'
} as const;

/** Repeatable chart series colors; workflow and priority colors remain semantic. */
export const qpmAnalyticsTokens = [
  '#4B5FE8',
  '#6941C6',
  '#0086C9',
  '#0E9384',
  '#B54708',
  '#B42318',
  '#667085',
  '#7A5AF8'
] as const;

/** Light navigation surface with the QPM brand blue reserved for selection. */
export const qpmNavigationTokens = {
  sidebar: '#FFFFFF',
  text: '#344054',
  mutedText: '#475467',
  divider: '#E4E7EC',
  // Strong enough to read as an intentional hover surface on the white rail,
  // while keeping dark navigation labels comfortably above WCAG AA contrast.
  hover: '#C7D2FE',
  active: '#4B5FE8',
  activeText: '#FFFFFF'
} as const;

/** Fixed semantic work-order colors; brand customization must not change status meaning. */
export const qpmWorkOrderStatusTokens: Record<
  string,
  { foreground: string; background: string }
> = {
  OPEN: { foreground: '#2F5BEA', background: '#E8EEFF' },
  IN_PROGRESS: { foreground: '#6941C6', background: '#EBE9FE' },
  ON_HOLD: { foreground: '#B54708', background: '#FEF0C7' },
  OVERDUE: { foreground: '#B42318', background: '#FEE4E2' },
  COMPLETE: { foreground: '#067647', background: '#DCFAE6' },
  DEFAULT: { foreground: '#475467', background: '#F2F4F7' }
};

/** Priority colors stay distinct from workflow statuses and meet text contrast. */
export const qpmPriorityTokens: Record<
  string,
  { foreground: string; background: string }
> = {
  HIGH: { foreground: '#B54708', background: '#FEF0C7' },
  MEDIUM: { foreground: '#2F5BEA', background: '#E8EEFF' },
  LOW: { foreground: '#475467', background: '#F2F4F7' },
  DEFAULT: { foreground: '#475467', background: '#F2F4F7' }
};

/** Request approval states keep fixed meaning across company accent colors. */
export const qpmRequestStatusTokens: Record<
  string,
  { foreground: string; background: string }
> = {
  PENDING: { foreground: '#B54708', background: '#FEF0C7' },
  APPROVED: { foreground: '#067647', background: '#DCFAE6' },
  CANCELLED: { foreground: '#B42318', background: '#FEE4E2' },
  DEFAULT: { foreground: '#475467', background: '#F2F4F7' }
};
