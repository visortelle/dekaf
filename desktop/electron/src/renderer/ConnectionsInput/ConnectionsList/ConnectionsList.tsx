import React from 'react';
import s from './ConnectionsList.module.css'

export type ConnectionsListProps = {};

const ConnectionsList: React.FC<ConnectionsListProps> = (props) => {
  return (
    <div className={s.ConnectionsList}>
      connections list
    </div>
  );
}

export default ConnectionsList;
