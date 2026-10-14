export type AppearancePreference = 'system' | 'light' | 'dark';

export const createAsyncWriteQueue = () => {
  let pendingWrite = Promise.resolve();

  return <Result>(write: () => Promise<Result>): Promise<Result> => {
    const currentWrite = pendingWrite.then(write, write);
    pendingWrite = currentWrite.then(
      () => undefined,
      () => undefined
    );
    return currentWrite;
  };
};

export const parseAppearancePreference = (
  value: string | null
): AppearancePreference =>
  value === 'light' || value === 'dark' ? value : 'system';

export const resolveAppearanceScheme = (
  preference: AppearancePreference,
  deviceScheme: 'light' | 'dark'
): 'light' | 'dark' => (preference === 'system' ? deviceScheme : preference);
