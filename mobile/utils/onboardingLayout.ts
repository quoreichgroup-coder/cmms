/** Keep the selected onboarding slide aligned to the viewport after resizing. */
export function getOnboardingPageOffset(
  page: number,
  width: number,
  totalPages: number
): number {
  if (!Number.isFinite(width) || width <= 0 || totalPages <= 0) return 0;

  const lastPage = Math.max(0, Math.trunc(totalPages) - 1);
  const safePage = Number.isFinite(page)
    ? Math.min(lastPage, Math.max(0, Math.trunc(page)))
    : 0;

  return safePage * width;
}
