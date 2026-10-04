import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import useAuth from '../../../hooks/useAuth';
import { useDispatch, useSelector } from '../../../store';
import { activateLicense, getLicenseValidity } from '../../../slices/license';
import api, { getErrorMessage } from '../../../utils/api';

export default function CompanyLicense() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const license = useSelector((state) => state.license.state);
  const [key, setKey] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const canActivate = user?.ownsCompany || user?.role?.roleType === 'ROLE_SUPER_ADMIN';

  useEffect(() => {
    let mounted = true;
    dispatch(getLicenseValidity()).catch((err) => {
      if (mounted) setError(getErrorMessage(err));
    });
    if (canActivate) {
      api.get<{ available: boolean }>('license/activation-config')
        .then((result) => { if (mounted) setAvailable(result.available); })
        .catch((err) => { if (mounted) setError(getErrorMessage(err)); });
    }
    return () => { mounted = false; };
  }, [canActivate, dispatch]);

  const activate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!key.trim() || busy) return;
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      await dispatch(activateLicense(key.trim()));
      setKey('');
      setSuccess(true);
    } catch (err) {
      setError(err.message === 'conflict_error'
        ? 'Cette licence est déjà utilisée sur une autre installation de cet environnement.'
        : getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h3" gutterBottom>Licence de l’entreprise</Typography>
        <Typography color="text.secondary" paragraph>
          La licence couvre cette installation QPM. Saisissez la clé reçue pour activer ou renouveler vos droits.
        </Typography>
        <Stack spacing={2}>
          <Alert severity={license.valid ? 'success' : 'info'}>
            {license.valid ? 'Licence active' : license.hasLicense ? 'Licence expirée ou invalide' : 'Aucune licence activée'}
          </Alert>
          {license.hasLicense && (
            <Box>
              <Typography>Édition : {license.planName || '—'}</Typography>
              <Typography>Entreprise : {license.customerName || '—'}</Typography>
              <Typography>Utilisateurs complets : {license.seatsFull ?? 0} · Utilisateurs légers : {license.seatsLight ?? 0}</Typography>
              <Typography>Expiration : {license.expirationDate ? new Date(license.expirationDate).toLocaleDateString() : 'Sans expiration'}</Typography>
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">Licence activée. Vos droits ont été mis à jour.</Alert>}
          {canActivate ? available === false ? (
            <Alert severity="warning">L’activation n’est pas disponible sur ce serveur. Contactez l’administrateur de votre installation.</Alert>
          ) : (
            <Box component="form" onSubmit={activate}>
              <TextField fullWidth label="Clé de licence" type="password" autoComplete="off"
                value={key} onChange={(event) => setKey(event.target.value)}
                disabled={busy || available !== true} inputProps={{ maxLength: 256 }} />
              <Button sx={{ mt: 2 }} type="submit" variant="contained"
                disabled={busy || available !== true || !key.trim()}
                startIcon={busy ? <CircularProgress size={18} /> : undefined}>
                {busy ? 'Activation en cours…' : 'Activer la licence'}
              </Button>
            </Box>
          ) : <Typography>Le propriétaire de l’entreprise peut activer ou renouveler la licence.</Typography>}
        </Stack>
      </CardContent>
    </Card>
  );
}
