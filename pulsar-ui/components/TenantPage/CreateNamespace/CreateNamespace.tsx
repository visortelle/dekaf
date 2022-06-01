import React from 'react';
import s from './CreateNamespace.module.css'

export type CreateNamespaceProps = {};

const CreateNamespace: React.FC<CreateNamespaceProps> = (props) => {
  return (
    <div className={s.CreateNamespace}>
      Create namespace
    </div>
  );
}

export default CreateNamespace;
