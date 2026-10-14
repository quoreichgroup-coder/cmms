import { useCallback, useRef, useState } from 'react';

type LoadState = 'loading' | 'error' | 'success';

/** Keeps related-list feedback local to its screen and keyed to its resource. */
export default function useRelatedWorkOrdersLoad(resourceId: number) {
  const [state, setState] = useState<{ key: number; status: LoadState }>({
    key: resourceId,
    status: 'loading'
  });
  const requestSequence = useRef(0);

  const run = useCallback(
    async (key: number, request: () => unknown | Promise<unknown>) => {
      const requestId = ++requestSequence.current;
      setState({ key, status: 'loading' });
      try {
        await request();
        if (requestSequence.current === requestId)
          setState({ key, status: 'success' });
      } catch {
        if (requestSequence.current === requestId)
          setState({ key, status: 'error' });
      }
    },
    []
  );

  return {
    loading: state.key !== resourceId || state.status === 'loading',
    error: state.key === resourceId && state.status === 'error',
    run
  };
}
