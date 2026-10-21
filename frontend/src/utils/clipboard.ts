/** Copy text only when the browser clipboard succeeds. */
export async function writeClipboardText(
  text: string,
  getClipboard: () => Pick<Clipboard, 'writeText'> | undefined = () =>
    navigator.clipboard
): Promise<boolean> {
  try {
    const clipboard = getClipboard();
    if (!clipboard?.writeText) return false;
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
