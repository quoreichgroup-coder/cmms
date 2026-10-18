import { Box, Container, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Logo from 'src/components/LogoSign';

interface AuthPageLayoutProps {
  children: ReactNode;
  contentWidth?: 'sm' | 'md';
}

/** Shared responsive frame for public authentication pages. */
export default function AuthPageLayout({
  children,
  contentWidth = 'sm'
}: AuthPageLayoutProps) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(340px, 40%) 1fr' },
        bgcolor: 'background.default'
      }}
    >
      <Box
        component="aside"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: { xs: 190, md: '100vh' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: { xs: 'center', md: 'space-between' },
          px: { xs: 3, sm: 5, lg: 7 },
          py: { xs: 3, md: 5 },
          color: '#fff',
          bgcolor: 'primary.main',
          borderBottomRightRadius: { xs: 28, md: 0 },
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            right: { xs: -100, md: -170 },
            bottom: { xs: -220, md: -190 },
            width: { xs: 300, md: 500 },
            height: { xs: 300, md: 500 },
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: '50%',
            pointerEvents: 'none'
          },
          '&::after': {
            right: { xs: -65, md: -120 },
            bottom: { xs: -185, md: -155 },
            width: { xs: 230, md: 410 },
            height: { xs: 230, md: 410 }
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, alignSelf: 'flex-start' }}>
          <Logo white />
        </Box>
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>
          <Typography
            variant="h1"
            sx={{
              color: 'inherit',
              fontSize: { xs: '1.55rem', md: '2.6rem' },
              lineHeight: 1.15,
              mb: { xs: 0, md: 2 }
            }}
          >
            {t('perfect_tool')}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              display: { xs: 'none', md: 'block' },
              color: 'rgba(255,255,255,0.88)',
              fontWeight: 400,
              lineHeight: 1.65,
              maxWidth: 390
            }}
          >
            {t('home.you_will_have_description')}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'relative',
            zIndex: 1,
            color: 'rgba(255,255,255,0.78)'
          }}
        >
          {t('maintenance_dashboard')}
        </Typography>
      </Box>
      <Box
        component="main"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: { xs: 'flex-start', md: 'center' },
          px: { xs: 2, sm: 4, lg: 7 },
          py: { xs: 3, md: 5 }
        }}
      >
        <Container maxWidth={contentWidth} disableGutters>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
