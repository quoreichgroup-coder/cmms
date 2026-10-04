import { Alert, Button, CircularProgress, Stack } from '@mui/material';

export default function Loading({
  error,
  onRetry
}: {
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Stack
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      spacing={1}
    >
      {error ? (
        <>
          <Alert severity="error">{error}</Alert>
          {onRetry && <Button onClick={onRetry}>Réessayer</Button>}
        </>
      ) : (
        <CircularProgress />
      )}
    </Stack>
  );
}
