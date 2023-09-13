import React, { ReactNode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';

import SvgIcon from '../../../ui/SvgIcon/SvgIcon';
import { H2 } from '../../../ui/H/H';

import closeIcon from './close.svg';

import s from './Modals.module.css'

export type ModalStackEntry = {
  id: string,
  title: string,
  content: ReactNode,
  styleMode?: 'no-content-padding',
}

export type ModalStack = ModalStackEntry[];

export type Value = {
  stack: ModalStack,
  push: (entry: ModalStackEntry) => void,
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
  const push = (entry: ModalStackEntry) => setValue((value) => ({ ...value, stack: [...value.stack, entry] }));
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

  const currentModal = props.stack[props.stack.length - 1];

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
        if (e.key === 'Escape') {
          props.onClose();
        }
      }}
    >
      <div className={s.ContentContainer}>
        <div className={s.TopBar}>
          <div className={s.TopBarTitle}>
            <H2>{currentModal?.title}</H2>
          </div>
          <div className={s.TopBarClose} onClick={props.onClose}><SvgIcon svg={closeIcon} /></div>
        </div>
        {isVisible && (
          <div className={`${s.Content} ${currentModal.styleMode === 'no-content-padding' ? s.NoContentPadding : ''}`}>{currentModal.content}</div>
        )}
      </div>
    </motion.div>
  );
}

export const useContext = () => React.useContext(Context);
