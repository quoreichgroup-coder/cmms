export const STOMP_RESPONSE_TIMEOUT_MS = 120000;

export interface StompMessage {
  body: string;
}

export interface StompSubscription {
  unsubscribe: () => void;
}

export interface StompMessageClient {
  subscribe: (
    destination: string,
    callback: (message: StompMessage) => void
  ) => StompSubscription;
}

/**
 * Subscribe before starting an import/export request and fail cleanly if the
 * server never sends its completion message (for example, after a WS 403).
 */
export const waitForStompMessage = (
  client: StompMessageClient,
  destination: string,
  timeoutMs = STOMP_RESPONSE_TIMEOUT_MS
): { message: Promise<StompMessage>; cancel: () => void } => {
  let subscription: StompSubscription | undefined;
  let timer: ReturnType<typeof setTimeout>;
  let settled = false;
  let rejectMessage: (error: Error) => void;

  const cleanup = () => {
    clearTimeout(timer);
    subscription?.unsubscribe();
  };

  const message = new Promise<StompMessage>((resolve, reject) => {
    rejectMessage = reject;
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new Error(
          'Le serveur n’a pas confirmé l’opération dans le délai imparti. Vérifiez les données avant de réessayer.'
        )
      );
    }, timeoutMs);

    try {
      subscription = client.subscribe(destination, (response) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(response);
      });
      // A test double or unusual client can deliver synchronously from
      // subscribe(), before the subscription handle has been assigned.
      if (settled) subscription.unsubscribe();
    } catch (error) {
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });

  return {
    message,
    cancel: () => {
      if (settled) return;
      settled = true;
      cleanup();
      rejectMessage(new Error('L’attente du message serveur a été annulée.'));
    }
  };
};
