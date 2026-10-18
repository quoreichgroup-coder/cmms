export interface WorkloadUserName {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
}

export function getWorkloadUserDisplayName(
  userId: number,
  users: WorkloadUserName[]
): string {
  const user = users.find((candidate) => candidate.id === userId);
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || String(userId);
}
