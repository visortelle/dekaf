import React from 'react';
import st from './SimpleTable.module.css'
import NoData from '../NoData/NoData';

export const Td: React.FC<React.HTMLProps<HTMLTableCellElement>> = ({ children, ...props }) => (
  <td className={st.Cell} {...props}>{children || <NoData />}</td>
);

export default Td;
