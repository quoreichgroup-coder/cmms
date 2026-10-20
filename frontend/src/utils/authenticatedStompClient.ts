import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { apiUrl } from '../config';

/**
 * Create the authenticated WebSocket client used by notifications and imports.
 * Refresh the CONNECT token before every initial connection/reconnection so a
 * refreshed session does not leave the broker using an expired JWT.
 */
export const createAuthenticatedStompClient = (): Client => {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${apiUrl}ws`),
    reconnectDelay: 5000,
    // STOMP frames include CONNECT headers; never print them (they contain JWTs).
    debug: () => undefined
  });

  client.beforeConnect = async () => {
    let token: string | null = null;
    try {
      token = window.localStorage.getItem('accessToken');
    } catch {
      // The broker will reject an unauthenticated connection; UI/API auth
      // remains responsible for reporting an unavailable session.
    }
    client.connectHeaders = token ? { token } : {};
  };

  return client;
};
