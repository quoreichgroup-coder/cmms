import { Box, Button, CircularProgress, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';

type ContentStateVariant = 'loading' | 'empty' | 'error' | 'denied';

interface ContentStateProps {
  variant: ContentStateVariant;
  message: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  minHeight?: number;
}

const icons = {
  empty: InboxOutlinedIcon,
  error: ErrorOutlineIcon,
  denied: BlockOutlinedIcon
};

export default function ContentState({
  variant,
  message,
  description,
  actionLabel,
  onAction,
  minHeight = 180
}: ContentStateProps) {
  const Icon = variant === 'loading' ? null : icons[variant];
  const role = variant === 'error' ? 'alert' : 'status';

  return (
    <Box
      role={role}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      sx={{
        minHeight,
        width: '100%',
        px: 2,
        py: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.25,
        textAlign: 'center'
      }}
    >
      {variant === 'loading' ? (
        <CircularProgress size={28} aria-label={message} />
      ) : (
        <Box
          aria-hidden="true"
          sx={{
            width: 44,
            height: 44,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            color: variant === 'error' ? 'error.main' : 'text.secondary',
            bgcolor: 'action.hover'
          }}
        >
          <Icon fontSize="small" />
        </Box>
      )}
      <Typography
        variant={
          variant === 'error' ? 'body1' : variant === 'empty' ? 'h6' : 'body2'
        }
        color={variant === 'error' ? 'text.primary' : 'text.secondary'}
        fontWeight={variant === 'empty' ? 500 : 400}
      >
        {message}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button size="small" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
