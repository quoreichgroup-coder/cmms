import { createContext, FC, ReactNode, useCallback, useEffect } from 'react';
import { useAppTheme } from '../custom-theme';
import { useTranslation } from 'react-i18next';
import { showMessage } from 'react-native-flash-message';
import { getErrorMessage, setApiErrorHandler, setConflictErrorHandler } from '../utils/api';

type CustomSnackBarContext = {
  showSnackBar: (
    message: string,
    type?: 'error' | 'success' | 'info',
    action?: { label: string; onPress: () => void }
  ) => void;
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const CustomSnackBarContext = createContext<CustomSnackBarContext>(
  {} as CustomSnackBarContext
);

export const CustomSnackbarProvider: FC<{ children: ReactNode }> = ({
                                                                      children
                                                                    }) => {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const showSnackBar = useCallback(
    (
      text: string,
      type?: 'error' | 'success' | 'info',
      action?: { label: string; onPress: () => void }
    ) => {
      showMessage({
        message: t(type),
        description: text,
        backgroundColor: getBackgroundColor(type),
        color: getForegroundColor(type),
        type: type === 'error' ? 'danger' : type,
        onPress: action?.onPress
      });
    },
    [t, theme]
  );

  const getBackgroundColor = (type: 'error' | 'success' | 'info') => {
    switch (type) {
      case 'info':
        return theme.colors.info;
      case 'error':
        return theme.colors.error;
      case 'success':
        return theme.colors.success;
    }
  };

  const getForegroundColor = (type: 'error' | 'success' | 'info') => {
    if (type === 'info') return theme.colors.onInfo;
    if (type === 'error') return theme.colors.onError;
    return theme.colors.onSuccess;
  };

  useEffect(() => {
    const removeApiHandler = setApiErrorHandler((error) => showSnackBar(getErrorMessage(error), 'error'));
    const removeConflictHandler = setConflictErrorHandler(() => {
      showSnackBar(t('conflict_retry'), 'error');
    });
    return () => { removeApiHandler(); removeConflictHandler(); };
  }, [t, showSnackBar]);

  return (
    <CustomSnackBarContext.Provider value={{ showSnackBar }}>
      {children}
    </CustomSnackBarContext.Provider>
  );
};
