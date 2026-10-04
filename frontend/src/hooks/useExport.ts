import { useState, useEffect, useCallback } from 'react';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { apiUrl } from 'src/config';
import api from 'src/utils/api';
import useAuth from './useAuth';
import { waitForStompMessage } from './stompResponse';

interface UseExportReturn {
  exportEntity: (entity: ExportEntityType) => Promise<void>;
  loadingExport: Record<ExportEntityType, boolean>;
}

export type ExportEntityType =
  | 'work-orders'
  | 'assets'
  | 'locations'
  | 'parts'
  | 'meters'
  | 'preventive-maintenances'
  | 'costs-times'
  | 'part-transactions';

/**
 * Custom hook for exporting entities with WebSocket support
 * Generates a UUID, subscribes to WebSocket topic, then makes the export request
 */
export const useExport = (): UseExportReturn => {
  const [loadingExport, setLoadingExport] = useState<
    Record<ExportEntityType, boolean>
  >({
    'work-orders': false,
    assets: false,
    locations: false,
    parts: false,
    meters: false,
    'preventive-maintenances': false,
    'costs-times': false,
    'part-transactions': false
  });
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

  const exportEntity = useCallback(
    async (entity: ExportEntityType): Promise<void> => {
      if (!stompClient) {
        throw new Error('La connexion temps réel n’est pas disponible.');
      }
      if (!user?.email) throw new Error('Utilisateur non authentifié.');

      const uuid = crypto.randomUUID();
      const pendingMessage = waitForStompMessage(
        stompClient,
        `/user/${user.email}/exports/${uuid}`
      );
      setLoadingExport((prev) => ({ ...prev, [entity]: true }));
      try {
        const [, message] = await Promise.all([
          api.get<{ success: boolean; message: string }>(
            `export/${entity}?uuid=${uuid}`
          ),
          pendingMessage.message
        ]);
        if (message.body.includes('error:')) {
          throw new Error(
            message.body.split('error: ').pop() || 'Export échoué.'
          );
        }
        window.open(message.body, '_blank');
      } catch (error) {
        pendingMessage.cancel();
        throw error;
      } finally {
        setLoadingExport((prev) => ({ ...prev, [entity]: false }));
      }
    },
    [stompClient, user?.email]
  );

  return {
    exportEntity,
    loadingExport
  };
};

export default useExport;
