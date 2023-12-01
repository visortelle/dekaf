import React, { ReactNode, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import { H2 } from '../../ui/H/H';

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
  update: (id: string, entry: ModalStackEntry) => void,
  pop: () => void,
  clear: () => void,
};

const defaultValue: Value = {
  stack: [],
  push: () => undefined,
  update: () => undefined,
  pop: () => undefined,
  clear: () => undefined,
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [value, setValue] = useState<Value>(defaultValue);

  const pop = () => setValue((value) => ({ ...value, stack: value.stack.slice(0, value.stack.length - 1) }));
  const push = (entry: ModalStackEntry) => setValue((value) => ({ ...value, stack: [...value.stack, entry] }));
  const update = (id: string, entry: ModalStackEntry) => setValue((value) => ({ ...value, stack: value.stack.map((e) => e.id === id ? entry : e) }));
  const clear = () => setValue((value) => ({ ...value, stack: [] }));

  const modalPortal = ReactDOM.createPortal(
    <>
      <AnimatePresence>
        {value.stack.map((entry, i) => (
          <ModalElement
            key={entry.id}
            entry={entry}
            onClose={pop}
            isVisible={i === value.stack.length - 1}
          />
        ))}
      </AnimatePresence>
    </>,
    document.body
  );

  return (
    <Context.Provider value={{ ...value, pop, push, clear, update: update }}>
      {modalPortal}
      {children}
    </Context.Provider>
  )
};

type ModalElementProps = {
  entry: ModalStackEntry;
  isVisible: boolean;
  onClose: () => void;
}

const ModalElement: React.FC<ModalElementProps> = (props) => {
  const isVisible = props.isVisible;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (props.isVisible) {
      rootRef.current?.focus();
    }
  }, [props.isVisible]);

  return (
    <motion.div
      ref={rootRef}
      className={s.Root}
      key={props.entry.id}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.5
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
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
            <H2>{props.entry.title}</H2>
          </div>
          <div className={s.TopBarClose} onClick={props.onClose}><SvgIcon svg={closeIcon} /></div>
        </div>
        {(
          <div className={`${s.Content} ${props.entry.styleMode === 'no-content-padding' ? s.NoContentPadding : ''}`}>{props.entry.content}</div>
        )}
      </div>
    </motion.div>
  );
}

export const useContext = () => React.useContext(Context);
