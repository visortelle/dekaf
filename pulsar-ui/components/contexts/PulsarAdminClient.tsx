import React, { ReactNode, useEffect, useState } from 'react';
import * as pulsarAdmin from "pulsar-admin-client-axios";
import axios from 'axios';

export type Value = {
  client: pulsarAdmin.Client,
}

const defaultValue: Value = {
  client: new pulsarAdmin.Client(),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [client, _] = useState<pulsarAdmin.Client>(new pulsarAdmin.Client({ BASE: "/api/pulsar-broker-web/admin/v2" }));

  useEffect(() => {
    // XXX - Configure axios instance globally here.
    // TODO - Replace it with a better solution after the following issue will be solved:
    // https://github.com/ferdikoomen/openapi-typescript-codegen/issues/942
    axios.interceptors.response.use((response) => {
      return response;
    }, (error) => {
      // Provide better error messages.
      const reason = error?.response?.data?.reason;
      if (typeof reason === 'string') {
        return Promise.reject(reason);
      }
      return Promise.reject(error);
    });
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
