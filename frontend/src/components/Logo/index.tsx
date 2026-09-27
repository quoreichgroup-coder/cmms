import { Box, styled } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLocalizedHomeUrl } from '../../utils/urlPaths';
import { useBrand } from '../../hooks/useBrand';

const LogoWrapper = styled(Link)(
  ({ theme }) => `
        color: ${theme.palette.text.primary};
        padding: ${theme.spacing(0, 1, 0, 0)};
        display: flex;
        text-decoration: none;
        font-weight: ${theme.typography.fontWeightBold};
`
);

const LogoSignWrapper = styled(Box)(
  () => `
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
`
);

const LogoTextWrapper = styled(Box)(
  ({ theme }) => `
        padding-left: ${theme.spacing(1)};
`
);

const LogoText = styled(Box)(
  ({ theme }) => `
        font-size: ${theme.typography.pxToRem(15)};
        font-weight: ${theme.typography.fontWeightBold};
`
);

function Logo() {
  const { i18n } = useTranslation();
  const { logo, shortName } = useBrand();

  return (
    <LogoWrapper to={getLocalizedHomeUrl('', i18n.language)}>
      <LogoSignWrapper>
        <Box
          component="img"
          src={logo.dark}
          alt={`${shortName} logo`}
          sx={{ width: 40, height: 40, objectFit: 'contain' }}
        />
      </LogoSignWrapper>
      <Box
        component="span"
        sx={{
          display: { xs: 'none', sm: 'inline-block' }
        }}
      >
        <LogoTextWrapper>
          <LogoText>{shortName}</LogoText>
        </LogoTextWrapper>
      </Box>
    </LogoWrapper>
  );
}

export default Logo;
