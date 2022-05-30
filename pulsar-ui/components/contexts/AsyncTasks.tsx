import React, { ReactNode, useCallback, useState } from 'react';

export type Value = {
  tasks: Record<string, string | undefined>,
  startTask: (id: string, comment?: string) => void,
  finishTask: (id: string) => void,
}

const defaultValue: Value = {
  tasks: {},
  startTask: () => undefined,
  finishTask: () => undefined,
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [value, setValue] = useState<Value>(defaultValue);

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
      <Context.Provider
        value={{
          ...value,
          startTask,
          finishTask,
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
