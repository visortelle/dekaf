import React, { ReactNode } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import s from './Notifications.module.css';

export const toastContainerId = 'pulsar-ui-toast-container';

export type Value = {
  notifySuccess: (content: ReactNode, notificationId?: string) => void,
  notifyInfo: (content: ReactNode, notificationId?: string) => void,
  notifyWarn: (content: ReactNode, notificationId?: string) => void,
  notifyError: (content: ReactNode, notificationId?: string) => void,
}

const defaultValue: Value = {
  notifySuccess: (content, notificationId) => toast.success(content, { containerId: toastContainerId, toastId: notificationId || content?.toString() }),
  notifyInfo: (content, notificationId) => toast.info(content, { containerId: toastContainerId, toastId: notificationId || content?.toString() }),
  notifyWarn: (content, notificationId) => toast.warn(content, { containerId: toastContainerId, toastId: notificationId || content?.toString() }),
  notifyError: (content, notificationId) => toast.error(content, { containerId: toastContainerId, toastId: notificationId || content?.toString() }),
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
          closeOnClick={true}
          draggable={false}
          pauseOnHover={true}
          pauseOnFocusLoss={true}
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
