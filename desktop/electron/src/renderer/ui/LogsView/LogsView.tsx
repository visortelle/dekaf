import React, { useMemo, useRef } from 'react';
import s from './LogsView.module.css'
import { colorsByName } from '../ColorPickerButton/ColorPicker/color-palette';

const logsColorPalette: string[] = [
  colorsByName['slate-700'],
  colorsByName['blue-700'],
  colorsByName['green-700'],
  colorsByName['teal-700'],
  colorsByName['purple-700'],
  colorsByName['blue-600'],
  colorsByName['green-600'],
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
      <div className={s.Logs}>
        {props.logs.map((l, i) => {
          let color = 'inherit';

          if (colorPerSource.current[l.source] !== undefined) {
            color = colorPerSource.current[l.source];
          } else {
            const nextColor = logsColorPalette[Object.keys(colorPerSource.current).length];
            colorPerSource.current[l.source] = nextColor;
            color = nextColor;
          }

          return <div key={i} className={s.LogEntry} style={{ color }}>{l.content}</div>
        })}
      </div>
    </div>
  );
}

export default LogsView;
