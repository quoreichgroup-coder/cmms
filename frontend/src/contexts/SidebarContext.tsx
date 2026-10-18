import { FC, useState, createContext } from 'react';
import {
  readDesktopSidebarCollapsed,
  writeDesktopSidebarCollapsed
} from 'src/utils/sidebarState';
type SidebarContext = {
  sidebarToggle: boolean;
  desktopSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  toggleDesktopSidebar: () => void;
  closeSidebar: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const SidebarContext = createContext<SidebarContext>(
  {} as SidebarContext
);

export const SidebarProvider: FC = ({ children }) => {
  const [sidebarToggle, setSidebarToggle] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(
    readDesktopSidebarCollapsed
  );
  const toggleSidebar = () => {
    setSidebarToggle((isOpen) => !isOpen);
  };
  const toggleDesktopSidebar = () => {
    setDesktopSidebarCollapsed((isCollapsed) => {
      const nextValue = !isCollapsed;
      writeDesktopSidebarCollapsed(nextValue);
      return nextValue;
    });
  };
  const closeSidebar = () => {
    setSidebarToggle(false);
  };

  return (
    <SidebarContext.Provider
      value={{
        sidebarToggle,
        desktopSidebarCollapsed,
        toggleSidebar,
        toggleDesktopSidebar,
        closeSidebar
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
