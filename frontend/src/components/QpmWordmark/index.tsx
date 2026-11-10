import { Box, Typography } from '@mui/material';
import { qpmBrandTokens } from '../../theme/tokens';

interface Props {
  /** White version for dark or brand-blue backgrounds (charter page 3). */
  white?: boolean;
  /** Monogram only, for narrow places such as the collapsed sidebar. */
  compact?: boolean;
  /** Show the charter signature under the wordmark. */
  tagline?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = { small: 15, medium: 19, large: 26 } as const;

/**
 * QUOREICH GROUP wordmark from the visual charter (docs/CHARTE-VISUELLE-QPM.md): Montserrat SemiBold,
 * brand blue on light backgrounds, white on dark ones. The brand orange is kept decorative (accent bar):
 * the charter forbids it as text on white (2.33:1 contrast).
 */
export default function QpmWordmark({
  white = false,
  compact = false,
  tagline = false,
  size = 'medium'
}: Props) {
  const color = white ? '#FFFFFF' : qpmBrandTokens.primary;
  const fontSize = SIZES[size];

  if (compact) {
    return (
      <Box
        aria-label="QUOREICH GROUP · QPM"
        role="img"
        sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: white ? 'rgba(255,255,255,0.14)' : qpmBrandTokens.primary,
          color: '#FFFFFF',
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: 20,
          position: 'relative'
        }}
      >
        Q
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: 7,
            right: 8,
            width: 8,
            height: 3,
            borderRadius: 2,
            backgroundColor: qpmBrandTokens.accent
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      aria-label="QUOREICH GROUP · QPM"
      role="img"
      sx={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '0.35em' }}>
        <Typography
          component="span"
          sx={{
            color,
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: 600,
            fontSize,
            letterSpacing: '0.04em',
            lineHeight: 1
          }}
        >
          QUOREICH
        </Typography>
        <Typography
          component="span"
          sx={{
            color,
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: 400,
            fontSize: fontSize * 0.82,
            letterSpacing: '0.16em',
            lineHeight: 1,
            opacity: white ? 0.92 : 1
          }}
        >
          GROUP
        </Typography>
      </Box>
      <Box
        aria-hidden
        sx={{
          mt: '6px',
          width: fontSize * 2.2,
          height: 3,
          borderRadius: 2,
          backgroundColor: qpmBrandTokens.accent
        }}
      />
      {tagline && (
        <Typography
          component="span"
          sx={{
            mt: 1,
            // Too tight next to the sign-in headline on phones; the wordmark alone stays.
            display: { xs: 'none', sm: 'block' },
            color: white ? 'rgba(255,255,255,0.88)' : 'text.secondary',
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: 500,
            fontSize: Math.max(11, fontSize * 0.5),
            letterSpacing: '0.08em'
          }}
        >
          Intelligence Beyond Boundaries
        </Typography>
      )}
    </Box>
  );
}
