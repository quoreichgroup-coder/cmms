import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import { IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface Props {
  articleSlug: string;
  labelKey: string;
}

export default function ContextualHelpButton({ articleSlug, labelKey }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = t(labelKey);

  return (
    <Tooltip title={label}>
      <IconButton
        onClick={() => navigate(`/app/help/${encodeURIComponent(articleSlug)}`)}
        aria-label={label}
        sx={{ minWidth: 40, minHeight: 40 }}
      >
        <HelpOutlineOutlinedIcon />
      </IconButton>
    </Tooltip>
  );
}
