import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface Props {
  days: number;
  onChange: (days: number) => void;
}

export default function AnalyticsPeriodSelector({ days, onChange }: Props) {
  const { t } = useTranslation();
  const label = t('analytics_period');

  return (
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <InputLabel id="analytics-period-label">{label}</InputLabel>
      <Select
        labelId="analytics-period-label"
        value={days}
        label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {[7, 30, 90].map((value) => (
          <MenuItem key={value} value={value}>
            {t('analytics_last_days', { count: value })}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
