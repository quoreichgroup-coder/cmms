/**
 * Amount coverage of the active approval policies of one document type.
 *
 * When at least one policy is active, the API refuses a document whose estimated amount matches no
 * active policy (`approval_no_matching_policy`). This finds the amount ranges, from 0 upwards, that no
 * active policy accepts, so administrators can close the gaps before users hit them.
 * The rules mirror ProcurementApprovalService.matchesConditions: the conditions of one policy are
 * combined with AND, and the policies with OR.
 */
export interface CoverageCondition {
  operator: string;
  value: string;
}

export interface AmountGap {
  from: number;
  fromInclusive: boolean;
  /** Infinity when the gap has no upper bound. */
  to: number;
  toInclusive: boolean;
}

interface Interval {
  lo: number;
  loInc: boolean;
  hi: number;
  hiInc: boolean;
  excluded: number[];
}

function toInterval(conditions: CoverageCondition[]): Interval | null {
  const interval: Interval = { lo: 0, loInc: true, hi: Infinity, hiInc: false, excluded: [] };
  for (const condition of conditions) {
    const value = Number(condition.value);
    if (condition.value === '' || !Number.isFinite(value)) continue;
    switch (condition.operator) {
      case 'EQUALS':
        if (value > interval.lo || (value === interval.lo && interval.loInc)) {
          interval.lo = value;
          interval.loInc = true;
        }
        if (value < interval.hi || (value === interval.hi && interval.hiInc)) {
          interval.hi = value;
          interval.hiInc = true;
        }
        break;
      case 'NOT_EQUALS':
        interval.excluded.push(value);
        break;
      case 'GREATER_THAN':
      case 'GREATER_THAN_OR_EQUAL': {
        const inclusive = condition.operator === 'GREATER_THAN_OR_EQUAL';
        if (value > interval.lo) {
          interval.lo = value;
          interval.loInc = inclusive;
        } else if (value === interval.lo) interval.loInc = interval.loInc && inclusive;
        break;
      }
      case 'LESS_THAN':
      case 'LESS_THAN_OR_EQUAL': {
        const inclusive = condition.operator === 'LESS_THAN_OR_EQUAL';
        if (value < interval.hi) {
          interval.hi = value;
          interval.hiInc = inclusive;
        } else if (value === interval.hi) interval.hiInc = interval.hiInc && inclusive;
        break;
      }
      default:
        break;
    }
  }
  if (interval.lo > interval.hi) return null;
  if (interval.lo === interval.hi && !(interval.loInc && interval.hiInc)) return null;
  return interval;
}

function contains(interval: Interval, value: number): boolean {
  const aboveLow = value > interval.lo || (value === interval.lo && interval.loInc);
  const belowHigh = value < interval.hi || (value === interval.hi && interval.hiInc);
  return aboveLow && belowHigh && !interval.excluded.includes(value);
}

/** Uncovered amount ranges; an empty list means every amount is accepted by some active policy. */
export function findAmountGaps(policies: { conditions?: CoverageCondition[] }[]): AmountGap[] {
  if (!policies.length) return [];
  const intervals = policies
    .map((policy) => toInterval(policy.conditions ?? []))
    .filter((interval): interval is Interval => interval !== null)
    .sort((a, b) => a.lo - b.lo || Number(b.loInc) - Number(a.loInc));

  const gaps: AmountGap[] = [];
  let reach = 0;
  let reachInc = false; // whether `reach` itself is covered
  for (const interval of intervals) {
    const gap = interval.lo > reach || (interval.lo === reach && !reachInc && !interval.loInc);
    if (gap) {
      gaps.push({ from: reach, fromInclusive: !reachInc, to: interval.lo, toInclusive: !interval.loInc });
    }
    if (interval.hi > reach) {
      reach = interval.hi;
      reachInc = interval.hiInc;
    } else if (interval.hi === reach) {
      reachInc = reachInc || interval.hiInc;
    }
  }
  if (reach !== Infinity) {
    gaps.push({ from: reach, fromInclusive: !reachInc, to: Infinity, toInclusive: false });
  }

  // A value excluded by NOT_EQUALS is a gap unless another policy accepts it.
  for (const interval of intervals) {
    for (const value of interval.excluded) {
      const coveredElsewhere = intervals.some((other) => other !== interval && contains(other, value));
      const alreadyInGap = gaps.some(
        (gap) =>
          (value > gap.from || (value === gap.from && gap.fromInclusive)) &&
          (value < gap.to || (value === gap.to && gap.toInclusive))
      );
      if (!coveredElsewhere && !alreadyInGap) {
        gaps.push({ from: value, fromInclusive: true, to: value, toInclusive: true });
      }
    }
  }
  return gaps.sort((a, b) => a.from - b.from);
}

/** Compact text such as "≥ 0 and < 1000", "> 5000" or "= 250". */
export function formatAmountGap(gap: AmountGap, format: (value: number) => string, and: string): string {
  if (gap.from === gap.to) return `= ${format(gap.from)}`;
  const lower = `${gap.fromInclusive ? '≥' : '>'} ${format(gap.from)}`;
  if (gap.to === Infinity) return lower;
  return `${lower} ${and} ${gap.toInclusive ? '≤' : '<'} ${format(gap.to)}`;
}
