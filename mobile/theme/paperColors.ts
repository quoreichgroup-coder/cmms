import { qpmDesignTokens } from './tokens';

type QpmPalette = (typeof qpmDesignTokens)[keyof typeof qpmDesignTokens];

export function createQpmPaperColors<TBase extends object>(
  baseColors: TBase,
  tokens: QpmPalette
) {
  return {
    ...baseColors,
    primary: tokens.brandPrimary,
    onPrimary: tokens.onPrimary,
    brandLogo: tokens.brandLogo,
    brandHeader: tokens.brandHeader,
    onBrandHeader: tokens.onBrandHeader,
    mutedOnBrandHeader: tokens.mutedOnBrandHeader,
    primaryContainer: tokens.surfaceBrandSubtle,
    onPrimaryContainer: tokens.textPrimary,
    secondary: tokens.secondary,
    onSecondary: tokens.onSecondary,
    secondaryContainer: tokens.surfaceBrandSubtle,
    onSecondaryContainer: tokens.textPrimary,
    tertiary: tokens.info,
    onTertiary: tokens.onInfo,
    tertiaryContainer: tokens.tertiaryContainer,
    onTertiaryContainer: tokens.textPrimary,
    background: tokens.canvas,
    onBackground: tokens.textPrimary,
    surface: tokens.surface,
    onSurface: tokens.textPrimary,
    surfaceVariant: tokens.surfaceRaised,
    onSurfaceVariant: tokens.textSecondary,
    // Paper uses `outline` for outlined text fields and other controls.
    // Keep decorative separators on `outlineVariant` instead.
    outline: tokens.controlOutline,
    outlineVariant: tokens.borderSubtle,
    controlOutline: tokens.controlOutline,
    shadow: tokens.shadow,
    error: tokens.error,
    onError: tokens.onError,
    errorContainer: tokens.errorContainer,
    onErrorContainer: tokens.onErrorContainer,
    success: tokens.success,
    onSuccess: tokens.onSuccess,
    successContainer: tokens.successContainer,
    onSuccessContainer: tokens.onSuccessContainer,
    warning: tokens.warning,
    onWarning: tokens.onWarning,
    warningContainer: tokens.warningContainer,
    onWarningContainer: tokens.onWarningContainer,
    info: tokens.info,
    onInfo: tokens.onInfo,
    infoContainer: tokens.infoContainer,
    onInfoContainer: tokens.onInfoContainer,
    assetModernization: tokens.assetModernization,
    onAssetModernization: tokens.onAssetModernization,
    assetCommissioning: tokens.assetCommissioning,
    onAssetCommissioning: tokens.onAssetCommissioning,
    neutral: tokens.neutral,
    onNeutral: tokens.onNeutral,
    complete: tokens.complete,
    onComplete: tokens.onComplete,
    black: tokens.textPrimary,
    white: tokens.onBrandHeader,
    primaryAlt: tokens.primaryAlt,
    grey: tokens.neutral
  };
}
