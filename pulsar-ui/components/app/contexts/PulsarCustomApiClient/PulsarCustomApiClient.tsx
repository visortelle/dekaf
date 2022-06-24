import React, { ReactNode } from 'react';
import * as Notifications from '../Notifications';
import { Client, createClient, dummyClient } from './client/client';

export type Value = {
  client: Client;
}

const defaultValue: Value = {
  client: dummyClient,
};

const Context = React.createContext<Value>(defaultValue);

const apiUrl = 'http://localhost:3001';

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const { notifyError } = Notifications.useContext();

  const client = createClient({ apiUrl, notifyError });

  return (
    <>
      <Context.Provider value={{ client }}>
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
