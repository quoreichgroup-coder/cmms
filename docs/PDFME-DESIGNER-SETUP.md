# PDFME Work Order Designer setup

The PDFME renderer is an internal service used only by the Spring API. The browser designer saves a validated PDFME template through the existing document-template API; the API loads authorized Work Order data and calls the renderer. The renderer must remain private and must not receive database credentials.

## Docker Compose

Generate a strong service token locally, then add it to the deployment environment without committing it:

```sh
openssl rand -hex 32
```

Set the same `PDFME_RENDERER_TOKEN` value for the API and `pdfme-renderer` services. Compose already injects that variable into both services and sets the internal URL to `http://pdfme-renderer:8090`. The renderer only uses `expose`; do not add a host `ports` mapping or publish it through the reverse proxy.

The token must contain at least 32 characters. If it is missing, PDFME previews and generated PDFME reports return service unavailable; the existing `QPM_NATIVE` document engine remains usable. Restart/recreate both services after changing the token.

## Template and data boundary

- Only Work Order templates are accepted by this pilot.
- The supported template uses PDFME 6.2.8, a blank A4 portrait/landscape page, and an allowlist of text, image, signature, table, shape, line and QR components.
- Data bindings must match the server-side Work Order provider. Static template text uses a `static:` component name. No expressions, custom JavaScript plugins, external PDF URLs or remote images are accepted.
- Preview requests use the existing authenticated `preview-pdf` endpoint. The Spring API applies current company and Work Order visibility rules before requesting a PDF.
- Published versions remain immutable in the existing version history. Existing `QPM_NATIVE` templates continue through the existing renderer.

## Current pilot limitations

- The Job Card binds `company.logo` to the current Work Order company's logo. Spring reads only that company's stored logo, accepts PNG/JPEG files up to 512 KiB, and embeds it in the renderer request; unsupported or missing logos are omitted. Other image components remain embedded PNG/JPEG data and cannot load remote URLs.
- The designer exposes PDFME's component palette, direct canvas placement, drag/move/resize, and property panel. Component positions, sizes and styles remain in the versioned template JSON and are used by preview and report generation.
- An editor can add one optional TTF/OTF fallback font up to 512 KiB. The browser checks the font signature before import; its bytes are embedded in the template draft and published version. API and renderer validate the font data URI, size and file signature; external font URLs are rejected.
- Safety instructions are template-authored static content and must be reviewed for the relevant site before publishing.
- The included PDF evidence uses synthetic representative values. It is not a PDF issued from a real, authorized production Work Order.
- Before enabling in a deployment, visually inspect the actual PDF in a PDF viewer, verify the preview against an authorized Work Order, and provide the token to the deployment environment. No deployment or production data was changed for this implementation.
