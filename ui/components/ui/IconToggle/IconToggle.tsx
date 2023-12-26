import React from 'react';
import s from './IconToggle.module.css'
import SvgIcon from '../SvgIcon/SvgIcon';
import { renderToStaticMarkup } from 'react-dom/server';
import { tooltipId } from '../Tooltip/Tooltip';

export type IconToggleItem<T> = {
  type: "item",
  value: T,
  iconSvg?: string,
  foregroundColor?: string,
  backgroundColor?: string,
  label?: string,
  help?: React.ReactElement | string
};

function getNextValue<T>(currentValue: T, items: IconToggleItem<T>[]): T {
  const currentValueIndex = items.findIndex(item => item.value === currentValue);

  if (currentValueIndex === items.length - 1) {
    return items[0].value;
  }

  return items[currentValueIndex + 1].value;
}

export type IconToggleProps<T> = {
  value: T,
  onChange: (v: T) => void,
  items: IconToggleItem<T>[],
  isReadOnly?: boolean
};

function IconToggle<T>(props: IconToggleProps<T>): React.ReactElement {
  const currentItem = props.items.find(item => item.value === props.value);

  return (
    <div
      className={`
        ${s.IconToggle}
        ${currentItem?.label ? s.IconToggleWithLabel : ''}
        ${props.isReadOnly ? s.ReadOnly : ''}
      `}
      onClick={() => {
        if (props.isReadOnly) {
          return;
        }

        const nextValue = getNextValue<T>(props.value, props.items);
        props.onChange(nextValue);
      }}
      style={{
        backgroundColor: currentItem?.backgroundColor ? currentItem.backgroundColor : '#fff',
      }}
      data-tooltip-id={tooltipId}
      data-tooltip-html={currentItem?.help === undefined ? undefined : renderToStaticMarkup(<>{currentItem.help}</>)}
    >
      {(currentItem?.iconSvg) && (
        <div
          className={s.SvgIcon}
          style={{
            fill: currentItem.foregroundColor ? currentItem.foregroundColor : 'var(--text-color)'
          }}
        >
          <SvgIcon svg={currentItem.iconSvg} />
        </div>
      )}
      {currentItem?.label && (
        <div className={s.Label} style={{ color: currentItem.foregroundColor }}>
          {currentItem.label}
        </div>
      )}
    </div>
  );
}

export default IconToggle;
