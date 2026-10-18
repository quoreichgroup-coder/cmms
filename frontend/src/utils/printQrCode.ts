/** Build a QR-code print document without parsing user-controlled HTML. */
export function populateQrPrintDocument(
  printWindow: Window,
  title: string,
  svgDataUrl: string,
  label?: { subtitle?: string; identifier?: string }
): void {
  const { document } = printWindow;

  const titleElement = document.createElement('title');
  titleElement.textContent = title;

  const style = document.createElement('style');
  style.textContent = label
    ? '@page { size: 100mm 70mm; margin: 5mm; } body { box-sizing: border-box; margin: 0; font-family: Arial, sans-serif; color: #101828; } .asset-label { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 6mm; min-height: 60mm; } .asset-copy { min-width: 0; overflow-wrap: anywhere; } h1 { margin: 0 0 3mm; font-size: 18pt; } p { margin: 0 0 3mm; font-size: 10pt; color: #475467; } .identifier { font-size: 12pt; font-weight: 700; } img { width: 42mm; height: 42mm; image-rendering: pixelated; }'
    : 'body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; } img { max-width: 100%; }';

  const image = document.createElement('img');
  image.alt = title;
  image.src = svgDataUrl;

  document.head.replaceChildren(titleElement, style);

  if (!label) {
    document.body.replaceChildren(image);
    return;
  }

  const container = document.createElement('main');
  container.className = 'asset-label';
  const copy = document.createElement('div');
  copy.className = 'asset-copy';
  const heading = document.createElement('h1');
  heading.textContent = title;
  copy.append(heading);

  if (label.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.textContent = label.subtitle;
    copy.append(subtitle);
  }

  if (label.identifier) {
    const identifier = document.createElement('p');
    identifier.className = 'identifier';
    identifier.textContent = label.identifier;
    copy.append(identifier);
  }

  container.append(copy, image);
  document.body.replaceChildren(container);
}
