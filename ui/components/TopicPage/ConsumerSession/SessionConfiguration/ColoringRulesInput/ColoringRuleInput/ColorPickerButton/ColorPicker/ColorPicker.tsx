import React from 'react';
import s from './ColorPicker.module.css'
import { colorPalette, colorsByName, themeBackgroundColorName, themeForegroundColorName } from './color-palette';
import { tooltipId } from '../../../../../../../ui/Tooltip/Tooltip';
import FormLabel from '../../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import FormItem from '../../../../../../../ui/ConfigurationTable/FormItem/FormItem';

export type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  title?: React.ReactElement;
};

const themeDefaultColors = [themeForegroundColorName, themeBackgroundColorName];

const ColorPicker: React.FC<ColorPickerProps> = (props) => {
  return (
    <div
      className={s.ColorPicker}
    >
      <div className={s.Palettes}>
        <FormItem>
          <FormLabel content="Theme colors" />
          <div className={s.ColorSet}>
            {themeDefaultColors.map((colorName) => {
              return (
                <div
                  key={colorName}
                  className={`${s.Color} ${props.value === colorName ? s.IsCurrent : ''}`}
                  style={{ backgroundColor: colorsByName[colorName] }}
                  onClick={() => props.onChange(colorName)}
                  data-tooltip-id={tooltipId}
                  data-tooltip-content={colorName}
                />
              );
            })}
          </div>
        </FormItem>

        <div style={{ marginBottom: '24rem' }} />

        <FormItem>
          <FormLabel content="Built-in colors" />
          <div className={s.Palette}>
            {Object.entries(colorPalette).map(([colorSetName, colorSet]) => (
              <div key={colorSetName} className={s.ColorSet}>
                {Object.entries(colorSet).map(([colorIntensity, colorHex]) => {
                  const colorName = `${colorSetName}-${colorIntensity}`;
                  const isCurrent = colorName === props.value;

                  return (
                    <div
                      key={`${colorSetName}-${colorIntensity}-${colorHex}`}
                      className={`${s.Color} ${isCurrent ? s.IsCurrent : ''}`}
                      style={{ backgroundColor: colorHex }}
                      onClick={() => props.onChange(colorName)}
                      data-tooltip-id={tooltipId}
                      data-tooltip-content={colorName}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </FormItem>
      </div>
    </div>
  );
}

export default ColorPicker;
