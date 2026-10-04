/** Default to all recorded history, matching the existing mobile reports. */
export const getReportDateRange = () => ({
  start: new Date(0).toISOString(),
  end: new Date().toISOString(),
  filterFields: []
});
