import React from 'react';
import s from './ColorPickerButton.module.css'
import ColorPicker from './ColorPicker/ColorPicker';
import * as Modals from '../../app/Modals/Modals';
import { colorsByName } from './ColorPicker/color-palette';
import { tooltipId } from '../Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

export type ColorPickerButtonProps = {
  value: string;
  onChange: (value: string) => void;
  width?: string,
  height?: string
  title?: React.ReactElement;
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
        modals.push({
          id: 'color-picker',
          title: 'Pick a Color',
          content: (
            <div style={{ maxHeight: 'inherit', overflow: 'auto' }}>
              <ColorPicker
                value={props.value}
                onChange={(v) => {
                  modals.pop();
                  props.onChange(v);
                }}
              />
            </div>
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
