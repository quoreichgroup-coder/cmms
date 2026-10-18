export interface SelectOption {
  label: string;
  value: number | string;
}

/** Keep controlled selections visible when an async option list is replaced. */
export const mergeSelectedOptions = <
  TAvailable extends SelectOption,
  TSelected extends SelectOption
>(
  availableOptions: TAvailable[],
  selectedOptions: TSelected[]
): Array<TAvailable | TSelected> =>
  Array.from(
    new Map(
      [...availableOptions, ...selectedOptions].map((option) => [
        String(option.value),
        option
      ])
    ).values()
  );
