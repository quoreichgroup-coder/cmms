import { text } from '@pdfme/schemas';
import { qpmBrandTokens } from '../../../../theme/tokens';

/** Width (mm) the component builders are authored for; the designer scales them to the actual page. */
export const AUTHORING_PAGE_WIDTH = 297;
export const PRIMARY = qpmBrandTokens.primary;
export const TEXT_COLOR = '#101828';
export const MUTED_TEXT_COLOR = '#475467';

export const schemaFrom = (
  plugin: any,
  name: string,
  content: string,
  position: { x: number; y: number },
  width: number,
  height: number,
  extra: Record<string, unknown> = {}
) => ({
  ...plugin.propPanel.defaultSchema,
  name,
  content,
  position,
  width,
  height,
  ...extra
});

/** A single-line text binding (or `static:` text) with QPM defaults. */
export const field = (
  name: string,
  x: number,
  y: number,
  width: number,
  sample: string,
  fontSize = 9,
  extra: Record<string, unknown> = {}
) =>
  schemaFrom(text, name, sample, { x, y }, width, 8, {
    fontSize,
    fontColor: TEXT_COLOR,
    backgroundColor: '',
    borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    ...extra
  });

/** Scales component schemas authored for {@link AUTHORING_PAGE_WIDTH} to the template page width. */
export const scaleSchemasToPageWidth = (schemas: any[], width: number) => {
  const scale = width / AUTHORING_PAGE_WIDTH;
  if (scale === 1) return schemas;
  return schemas.map((schema) => ({
    ...schema,
    position: schema.position
      ? { ...schema.position, x: Number(schema.position.x || 0) * scale }
      : schema.position,
    ...(Number.isFinite(Number(schema.width)) ? { width: Number(schema.width) * scale } : {})
  }));
};

export type PageOrientation = 'LANDSCAPE' | 'PORTRAIT';
const A4_LONG = 297;
const A4_SHORT = 210;

/**
 * Switches an A4 template between portrait and landscape, scaling every element so it keeps its relative
 * place and size. Works from either starting orientation (work orders start landscape, PO/PR portrait).
 */
export const reorientTemplate = <T extends { basePdf: any; schemas: any[] }>(template: T, orientation: PageOrientation): T => {
  const previousWidth = Number(template.basePdf?.width) || A4_LONG;
  const previousHeight = Number(template.basePdf?.height) || A4_SHORT;
  const width = orientation === 'LANDSCAPE' ? A4_LONG : A4_SHORT;
  const height = orientation === 'LANDSCAPE' ? A4_SHORT : A4_LONG;
  if (previousWidth === width && previousHeight === height) return template;
  const scaleX = width / previousWidth;
  const scaleY = height / previousHeight;
  const schemas = (template.schemas as any[][]).map((page) => page.map((schema) => ({
    ...schema,
    position: schema.position ? {
      ...schema.position,
      x: Number(schema.position.x || 0) * scaleX,
      y: Number(schema.position.y || 0) * scaleY
    } : schema.position,
    ...(Number.isFinite(Number(schema.width)) ? { width: Number(schema.width) * scaleX } : {}),
    ...(Number.isFinite(Number(schema.height)) ? { height: Number(schema.height) * scaleY } : {})
  })));
  return { ...template, basePdf: { ...template.basePdf, width, height }, schemas };
};
