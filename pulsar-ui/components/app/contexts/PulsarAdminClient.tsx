import React, { ReactNode, useEffect, useState } from 'react';
import * as pulsarAdmin from 'pulsar-admin-client-fetch';

export type Value = {
  client: pulsarAdmin.Client,
}

const defaultValue: Value = {
  client: new pulsarAdmin.Client(),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [client, _] = useState<pulsarAdmin.Client>(new pulsarAdmin.Client({ BASE: "http://localhost:3001/pulsar-broker-web/admin/v2", HEADERS: { "Content-Type": "application/json" } }));

  useEffect(() => {
    (async () => {
      const s = await client.brokerStats.getTopics2();
      console.log('s', s);
    })()
  }, []);

  return (
    <>
      <Context.Provider
        value={{
          client,
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
