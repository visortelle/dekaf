import React, { ReactNode, useCallback, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import s from './AppContext.module.css';

export const toastContainerId = 'pulsar-ui-toast-container';

export type SearchHistory = string[];

export type AppContextValue = {
  notifySuccess: (content: ReactNode) => void,
  notifyError: (content: ReactNode) => void,
  tasks: Record<string, string | undefined>,
  startTask: (id: string, comment?: string) => void,
  finishTask: (id: string) => void,
}

const defaultAppContextValue: AppContextValue = {
  notifySuccess: () => { },
  notifyError: () => { },
  tasks: {},
  startTask: () => { },
  finishTask: () => { },
}

export const AppContext = React.createContext<AppContextValue>(defaultAppContextValue);

export const DefaultAppContextProvider = ({ children }: { children: ReactNode }) => {
  const [value, setValue] = useState<AppContextValue>(defaultAppContextValue);

  const notifySuccess = useCallback((content: ReactNode) => toast.success(content, { containerId: toastContainerId }), []);
  const notifyError = useCallback((content: ReactNode) => toast.error(content, { containerId: toastContainerId }), []);

  const startTask = useCallback((id: string, comment?: string) => {
    setValue({
      ...value,
      tasks: { ...value.tasks, [id]: comment }
    });
  }, [value]);

  const finishTask = useCallback((id: string) => {
    let tasks = { ...value.tasks };
    delete tasks[id];

    setValue({ ...value, tasks });
  }, [value]);

  return (
    <>
      <AppContext.Provider
        value={{
          ...value,
          notifySuccess,
          notifyError,
          startTask,
          finishTask,
        }}
      >
        <ToastContainer
          enableMultiContainer
          containerId={toastContainerId}
          position="top-right"
          autoClose={3000}
          newestOnTop={true}
          hideProgressBar={true}
          closeOnClick
          pauseOnFocusLoss
          draggable={false}
          pauseOnHover
          className={s.toastContainer}
          toastClassName={s.toast}
          bodyClassName={s.toastBody}
        />
        {children}
      </AppContext.Provider>
    </>
  )
};

export const useAppContext = () => React.useContext(AppContext);
