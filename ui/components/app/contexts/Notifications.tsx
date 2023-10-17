import React, { ReactNode } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import s from './Notifications.module.css';

export const toastContainerId = '__dekaf__toast-container';

export type Value = {
  notifySuccess: (content: ReactNode, notificationId?: string, isShort?: boolean) => void,
  notifyInfo: (content: ReactNode, notificationId?: string, isShort?: boolean) => void,
  notifyWarn: (content: ReactNode, notificationId?: string, isShort?: boolean) => void,
  notifyError: (content: ReactNode, notificationId?: string, isShort?: boolean) => void,
}

const isShortTimeout = 100;
const defaultValue: Value = {
  notifySuccess: (content, notificationId, isShort) => toast.success(content, { containerId: toastContainerId, toastId: notificationId || content?.toString(), autoClose: isShort ? isShortTimeout : undefined }),
  notifyInfo: (content, notificationId, isShort) => toast.info(content, { containerId: toastContainerId, toastId: notificationId || content?.toString(), autoClose: isShort ? isShortTimeout : undefined }),
  notifyWarn: (content, notificationId, isShort) => toast.warn(content, { containerId: toastContainerId, toastId: notificationId || content?.toString(), autoClose: isShort ? isShortTimeout : undefined }),
  notifyError: (content, notificationId, isShort) => toast.error(content, { containerId: toastContainerId, toastId: notificationId || content?.toString(), autoClose: isShort ? isShortTimeout : undefined }),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  return (
    <Context.Provider value={defaultValue}>
      <ToastContainer
        enableMultiContainer
        containerId={toastContainerId}
        position="top-right"
        autoClose={5000}
        newestOnTop={true}
        hideProgressBar={true}
        closeOnClick={true}
        draggable={false}
        pauseOnHover={true}
        pauseOnFocusLoss={true}
        className={s.ToastContainer}
        toastClassName={s.Toast}
        bodyClassName={s.ToastBody}
      />
      {children}
    </Context.Provider>
  )
};

export const useContext = () => React.useContext(Context);
