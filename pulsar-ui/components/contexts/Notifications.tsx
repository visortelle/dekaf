import React, { ReactNode } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import s from './Notifications.module.css';

export const toastContainerId = 'pulsar-ui-toast-container';

export type Value = {
  notifySuccess: (content: ReactNode) => void,
  notifyError: (content: ReactNode) => void,
}

const defaultValue: Value = {
  notifySuccess: (content) => toast.success(content, { containerId: toastContainerId, toastId: content?.toString() }),
  notifyError: (content) => toast.error(content, { containerId: toastContainerId, toastId: content?.toString() }),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <Context.Provider value={defaultValue}>
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
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
