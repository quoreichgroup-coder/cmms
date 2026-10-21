// @ts-nocheck Jest globals are provided by the test runtime, not the app tsconfig.
import {
  formatAvailabilityDuration,
  getEffectiveShiftDay,
  isValidIsoCalendarDate,
  shiftDayOrder
} from '../shiftAvailability';
import { ShiftConfiguration } from '../../models/shiftConfiguration';

describe('personal shift availability helpers', () => {
  const config: ShiftConfiguration = {
    enabled: true,
    days: [{ dayOfWeek: 'MONDAY', availabilityMinutes: 450, enabled: true }],
    exceptions: []
  };

  it('uses the same Monday-to-Sunday order as the web schedule editor', () => {
    expect(shiftDayOrder).toEqual([
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY'
    ]);
  });

  it('applies the existing web editor default to a day absent from a saved configuration', () => {
    expect(getEffectiveShiftDay(config, 'TUESDAY')).toEqual({
      dayOfWeek: 'TUESDAY',
      availabilityMinutes: 480,
      enabled: true
    });
  });

  it('formats availability minutes without rounding away remaining minutes', () => {
    expect(formatAvailabilityDuration(450)).toBe('7 h 30 min');
    expect(formatAvailabilityDuration(480)).toBe('8 h');
    expect(formatAvailabilityDuration(-30)).toBe('0 h');
  });

  it('accepts real ISO calendar dates and rejects impossible dates', () => {
    expect(isValidIsoCalendarDate('2024-02-29')).toBe(true);
    expect(isValidIsoCalendarDate('2026-10-21')).toBe(true);
    expect(isValidIsoCalendarDate('2026-02-29')).toBe(false);
    expect(isValidIsoCalendarDate('2026-02-30')).toBe(false);
    expect(isValidIsoCalendarDate('2026-13-01')).toBe(false);
    expect(isValidIsoCalendarDate('2026-1-01')).toBe(false);
    expect(isValidIsoCalendarDate(null)).toBe(false);
  });

  it('falls back safely when an older API response omits day entries', () => {
    expect(
      getEffectiveShiftDay(
        { ...config, days: undefined as unknown as ShiftConfiguration['days'] },
        'TUESDAY'
      )
    ).toEqual({
      dayOfWeek: 'TUESDAY',
      availabilityMinutes: 480,
      enabled: true
    });
  });
});
