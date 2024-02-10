import { Coloring } from "../coloring";
import s from './Message.module.css';
import cts from "../../../ui/ChildrenTable/ChildrenTable.module.css";
import { colorPalette } from "../SessionConfiguration/ColoringRulesInput/ColoringRuleInput/ColorPickerButton/ColorPicker/color-palette";

const selectedColor = '#fff';
const selectedBackgroundColor = colorPalette.blue[700];

export type TdProps = {
  children: React.ReactNode,
  width?: string,
  coloring: Coloring,
  isSelected: boolean
} & React.ThHTMLAttributes<HTMLTableCellElement>;
export const Td: React.FC<TdProps> = (props) => {
  const { children, className, width, coloring, isSelected, ...restProps } = props;

  return (
    <td
      className={`
        ${cts.Td}
        ${s.Td}
        ${className || ''}
        ${props.isSelected ? s.SelectedTd : ''}
      `}
      style={{
        color: isSelected ? selectedColor : props.coloring?.foregroundColor,
        backgroundColor: isSelected ? selectedBackgroundColor : props.coloring?.backgroundColor
      }}
      {...restProps}
    >
      <div style={{ width, textOverflow: 'ellipsis', display: 'flex' }} >
        {children}
      </div>
    </td>
  );
};
