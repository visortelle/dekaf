import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import * as pulsarAdmin from "pulsar-admin-client-axios";

export type Value = {
  client: pulsarAdmin.Client,
}

const defaultValue: Value = {
  client: new pulsarAdmin.Client(),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [client, _] = useState<pulsarAdmin.Client>(new pulsarAdmin.Client({ BASE: "/api/pulsar-broker-web/admin/v2" }));

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
