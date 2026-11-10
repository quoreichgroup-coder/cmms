import { FC, useState, createContext, Dispatch, SetStateAction } from 'react';
import { Helmet } from 'react-helmet-async';
type TitleContext = {
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const TitleContext = createContext<TitleContext>({} as TitleContext);

export const TitleProvider: FC = ({ children }) => {
  const [title, setTitle] = useState<string>('');

  return (
    <TitleContext.Provider value={{ title, setTitle }}>
      {/* The page title also names the browser tab ("Work orders · QPM"); pages may still override it. */}
      {title ? (
        <Helmet>
          <title>{title}</title>
        </Helmet>
      ) : null}
      {children}
    </TitleContext.Provider>
  );
};
