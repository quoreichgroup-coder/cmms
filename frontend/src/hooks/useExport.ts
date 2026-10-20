import { useState, useEffect, useCallback } from 'react';
import api from 'src/utils/api';
import useAuth from './useAuth';
import { waitForStompMessage } from './stompResponse';
import { createAuthenticatedStompClient } from 'src/utils/authenticatedStompClient';
import { Client } from '@stomp/stompjs';
import {
  closePendingWindow,
  navigatePendingWindow,
  openPendingWindow
} from 'src/utils/asyncWindow';
import { useTranslation } from 'react-i18next';

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
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.id) {
      setStompClient(null);
      return;
    }

    const client = createAuthenticatedStompClient();
    client.onConnect = () => {
      setStompClient(client);
    };
    client.activate();

    return () => {
      void client.deactivate().catch(() => undefined);
    };
  }, [user?.id]);

  const exportEntity = useCallback(
    async (entity: ExportEntityType): Promise<void> => {
      if (!stompClient) {
        throw new Error('La connexion temps réel n’est pas disponible.');
      }
      if (!user?.email) throw new Error('Utilisateur non authentifié.');

      // Open synchronously from the click handler; browsers block popups opened
      // only after the export has finished over HTTP/WebSocket.
      const resultWindow = openPendingWindow(
        t('allow_popups_to_export'),
        t('preparing_export')
      );

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
        navigatePendingWindow(
          resultWindow,
          message.body,
          t('invalid_export_download_url')
        );
      } catch (error) {
        pendingMessage.cancel();
        closePendingWindow(resultWindow);
        throw error;
      } finally {
        setLoadingExport((prev) => ({ ...prev, [entity]: false }));
      }
    },
    [stompClient, user?.email, t]
  );

  return {
    exportEntity,
    loadingExport
  };
};

export default useExport;
