export type RequestSequence = { current: number };

export function beginRequest(sequence: RequestSequence): number {
  sequence.current += 1;
  return sequence.current;
}

export function isCurrentRequest(
  requestId: number,
  sequence: RequestSequence
): boolean {
  return requestId === sequence.current;
}
