// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ApiEvent } from '../api/service';

export type Channels = 'api';
export const apiChannel: Channels = 'api';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: ApiEvent[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: ApiEvent[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: ApiEvent[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: ApiEvent[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
