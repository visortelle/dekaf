import React, { useMemo, useRef } from 'react';
import s from './LogsView.module.css'
import { colorsByName } from '../ColorPickerButton/ColorPicker/color-palette';

const logsColorPalette: string[] = [
  colorsByName['slate-600'],
  colorsByName['green-500'],
  colorsByName['blue-500'],
  colorsByName['teal-500'],
  colorsByName['purple-500'],
  colorsByName['green-600'],
  colorsByName['blue-600'],
  colorsByName['teal-600'],
  colorsByName['purple-600'],
];

export type LogEntry = {
  source: string,
  content: string,
  epoch: number
};

export type LogsViewProps = {
  logs: LogEntry[]
};

type ColorPerSource = Record<string, string>;

const LogsView: React.FC<LogsViewProps> = (props) => {
  const colorPerSource = useRef<ColorPerSource>({});

  return (
    <div className={s.LogsView}>
      {props.logs.map((l, i) => {
        let color = 'inherit';

        if (colorPerSource.current[l.source] !== undefined) {
          color = colorPerSource.current[l.source];
        } else {
          const nextColor = logsColorPalette[Object.keys(colorPerSource).length];
          colorPerSource.current[l.source] = nextColor;
          color = nextColor;
        }

        const datetime = new Date(l.epoch).toISOString();
        return <div key={i} style={{ color }}>{datetime}{l.content}</div>
      })}
    </div>
  );
}

export default LogsView;
