import React from 'react';
import s from './Overview.module.css'

export type NamespacesProps = {};

const Namespaces: React.FC<NamespacesProps> = (props) => {
  return (
    <div className={s.Namespaces}>
      Namespaces
    </div>
  );
}

export default Namespaces;
