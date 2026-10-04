import { useState, useEffect, useCallback } from 'react';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { apiUrl } from 'src/config';
import api from 'src/utils/api';
import useAuth from './useAuth';
import { waitForStompMessage } from './stompResponse';

interface UseImportReturn {
  importEntity: (entity: EntityType, payload: any[]) => Promise<ImportResponse>;
  loadingImport: boolean;
}

export type EntityType =
  | 'work-orders'
  | 'assets'
  | 'locations'
  | 'parts'
  | 'meters'
  | 'preventive-maintenances';

export interface ImportResponse {
  success: boolean;
  created: number;
  updated: number;
  message?: string;
}

/**
 * Custom hook for importing entities with WebSocket support
 * Generates a UUID, subscribes to WebSocket topic, then makes the import request
 */
export const useImport = (): UseImportReturn => {
  const [loadingImport, setLoadingImport] = useState<boolean>(false);
  const [stompClient, setStompClient] = useState(null);
  const { user } = useAuth();
  // Initialize WebSocket connection
  useEffect(() => {
    const socket = new SockJS(`${apiUrl}ws`);
    const client = Stomp.over(socket);
    client.connect({ token: localStorage.getItem('accessToken') }, () => {
      setStompClient(client);
    });

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, []);

  const importEntity = useCallback(
    async (entity: EntityType, payload: any[]): Promise<ImportResponse> => {
      if (!stompClient) {
        throw new Error('La connexion temps réel n’est pas disponible.');
      }
      if (!user?.email) throw new Error('Utilisateur non authentifié.');

      const uuid = crypto.randomUUID();
      const pendingMessage = waitForStompMessage(
        stompClient,
        `/user/${user.email}/imports/${uuid}`
      );
      setLoadingImport(true);
      try {
        const [, message] = await Promise.all([
          api.post<ImportResponse>(
            `${basePath}/${entity}?uuid=${uuid}`,
            payload
          ),
          pendingMessage.message
        ]);
        if (message.body.includes('error:')) {
          throw new Error(message.body.split('error: ')[1] || 'Import échoué.');
        }

        let response: unknown;
        try {
          response = JSON.parse(message.body);
        } catch (error) {
          throw new Error(`Réponse serveur d’import invalide : ${message.body}`);
        }
        if (typeof response === 'string' && response.includes('error:')) {
          throw new Error(response.split('error: ')[1] || 'Import échoué.');
        }
        return response as ImportResponse;
      } catch (error) {
        pendingMessage.cancel();
        throw error;
      } finally {
        setLoadingImport(false);
      }
    },
    [stompClient, user?.email]
  );

  return {
    importEntity,
    loadingImport
  };
};

const basePath = 'import';

export default useImport;
