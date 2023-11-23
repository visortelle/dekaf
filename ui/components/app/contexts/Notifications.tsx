import React, { ReactElement, ReactNode } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import s from './Notifications.module.css';
import SmallButton from '../../ui/SmallButton/SmallButton';
import copyIcon from './copy.svg';
import { renderToStaticMarkup } from 'react-dom/server';

export const toastContainerId = '__dekaf__toast-container';

export type Value = {
  notifySuccess: (content: ReactNode, notificationId?: string, isShort?: boolean) => void,
  notifyInfo: (content: ReactNode, notificationId?: string, isShort?: boolean) => void,
  notifyWarn: (content: ReactNode, notificationId?: string, isShort?: boolean) => void,
  notifyError: (content: ReactNode, notificationId?: string, isShort?: boolean) => void,
}

const withCopyButton = (content: ReactNode) => {
  return <>
    {content}
    <div className={s.CopyButton}>
      <SmallButton
        onClick={() => {
          const html = renderToStaticMarkup(content as ReactElement);
          const div = document.createElement('div');
          div.innerHTML = html;
          const text = div.innerText;
          navigator.clipboard.writeText(text);
          toast.success(<span>The message has been copied to clipboard.</span>, { containerId: toastContainerId });
        }}
        svgIcon={copyIcon}
        type={"regular"}
        title={<span>Copy message to clipboard.</span>}
        appearance="borderless-semitransparent"
      />
    </div>
  </>
}

const isShortTimeout = 100;
const defaultValue: Value = {
  notifySuccess: (content, notificationId, isShort) => toast.success(withCopyButton(content), { containerId: toastContainerId, toastId: notificationId || content?.toString(), autoClose: isShort ? isShortTimeout : undefined }),
  notifyInfo: (content, notificationId, isShort) => toast.info(withCopyButton(content), { containerId: toastContainerId, toastId: notificationId || content?.toString(), autoClose: isShort ? isShortTimeout : undefined }),
  notifyWarn: (content, notificationId, isShort) => toast.warn(withCopyButton(content), { containerId: toastContainerId, toastId: notificationId || content?.toString(), autoClose: isShort ? isShortTimeout : undefined }),
  notifyError: (content, notificationId, isShort) => toast.error(withCopyButton(content), { containerId: toastContainerId, toastId: notificationId || content?.toString(), autoClose: isShort ? isShortTimeout : undefined }),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactElement }) => {
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
