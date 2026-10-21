export function isPdfContentType(contentType: string | null): boolean {
  return (
    contentType?.split(';', 1)[0].trim().toLowerCase() === 'application/pdf'
  );
}
