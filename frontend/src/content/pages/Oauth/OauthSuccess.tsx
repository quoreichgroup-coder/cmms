import SuspenseLoader from '../../../components/SuspenseLoader';
import { useEffect, useRef } from 'react';
import useAuth from '../../../hooks/useAuth';
import api, { authHeader } from '../../../utils/api';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export default function OauthSuccess() {
  const { loginInternal } = useAuth();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    api
      .post<AuthResponse>(
        'auth/oauth/exchange',
        {},
        { credentials: 'include', headers: authHeader(true) }
      )
      .then(({ accessToken, refreshToken }) =>
        loginInternal(accessToken, refreshToken)
      )
      .catch(() => {
        window.location.replace('/oauth2/failure?error=authentication_failed');
      });
  }, [loginInternal]);
  return <SuspenseLoader />;
}
