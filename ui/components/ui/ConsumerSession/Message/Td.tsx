import { Coloring } from "../coloring";
import s from './Message.module.css';
import cts from "../../../ui/ChildrenTable/ChildrenTable.module.css";

export type TdProps = {
  children: React.ReactNode,
  width?: string,
  coloring: Coloring,
} & React.ThHTMLAttributes<HTMLTableCellElement>;
export const Td: React.FC<TdProps> = (props) => {
  const { children, className, width, coloring, ...restProps } = props;

  return (
    <td
      className={`${cts.Td} ${s.Td} ${className || ''}`}
      style={{
        color: props.coloring?.foregroundColor,
        backgroundColor: props.coloring?.backgroundColor
      }}
      {...restProps}
    >
      <div style={{ width, textOverflow: 'ellipsis', display: 'flex' }} >
        {children}
      </div>
    </td>
  );
};
