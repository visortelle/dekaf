import React from 'react';
import s from './ColorPickerButton.module.css'
import ColorPicker from './ColorPicker/ColorPicker';
import * as Modals from '../../../../../../app/contexts/Modals/Modals';
import { colorsByName } from './ColorPicker/color-palette';
import { tooltipId } from '../../../../../Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

export type ColorPickerButtonProps = {
  value: string,
  onChange: (value: string) => void,
  width?: string,
  height?: string
  title?: React.ReactElement,
  isReadOnly?: boolean
};

const ColorPickerButton: React.FC<ColorPickerButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div
      className={s.ColorPickerButton}
      style={{
        backgroundColor: colorsByName[props.value],
        width: props.width,
        height: props.height,
      }}
      onClick={() => {
        if (props.isReadOnly) {
          return;
        }

        modals.push({
          id: 'color-picker',
          title: 'Pick a Color',
          content: (
            <ColorPicker
              value={props.value}
              onChange={(v) => {
                modals.pop();
                props.onChange(v);
              }}
            />
          ),
          styleMode: 'no-content-padding'
        });
      }}
      data-tooltip-html={props.title === undefined ? undefined : renderToStaticMarkup(props.title)}
      data-tooltip-id={tooltipId}
    >
    </div>
  );
}

export default ColorPickerButton;
