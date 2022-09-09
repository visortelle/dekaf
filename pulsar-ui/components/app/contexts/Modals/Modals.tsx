import React, { ReactNode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import s from './Modals.module.css'
import { motion, AnimatePresence } from "framer-motion"

type ModalStackEntry = {
  id: string,
  element: ReactNode,
}

type ModalStack = ModalStackEntry[];

export type Value = {
  stack: ModalStack,
  push: (id: string, element: ReactNode) => void,
  pop: () => void,
  clear: () => void,
};

const defaultValue: Value = {
  stack: [],
  push: () => undefined,
  pop: () => undefined,
  clear: () => undefined,
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [value, setValue] = useState<Value>(defaultValue);

  const pop = () => setValue((value) => ({ ...value, stack: value.stack.slice(0, value.stack.length - 1) }));
  const push = (id: string, element: ReactNode) => setValue((value) => ({ ...value, stack: [...value.stack, { id, element }] }));
  const clear = () => setValue((value) => ({ ...value, stack: [] }));

  const modalPortal = ReactDOM.createPortal(
    <ModalElement
      stack={value.stack}
      onClose={pop}
    />,
    document.body
  );

  return (
    <Context.Provider value={{ ...value, pop, push, clear }}>
      {modalPortal}
      {children}
    </Context.Provider>
  )
};

type ModalElementProps = {
  stack: ModalStackEntry[];
  onClose: () => void;
}

const ModalElement: React.FC<ModalElementProps> = (props) => {
  const isVisible = props.stack.length > 0;
  const rootRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, [props.stack]);

  return (
    <motion.div
      ref={rootRef}
      className={s.Root}
      key={'modal'}
      initial={{ y: '-100%' }}
      animate={{ y: isVisible ? '0' : '-100%' }}
      transition={{ duration: 0.33 }}
      tabIndex={0}
      onKeyDown={(e) => {
        console.log('keydown', e.key);
        if (e.key === 'Escape') {
          props.onClose();
        }
      }}
    >
      {isVisible && props.stack[props.stack.length - 1].element}
    </motion.div>
  );
}

export const useContext = () => React.useContext(Context);
