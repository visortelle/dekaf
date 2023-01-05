import React, { useMemo, useRef } from 'react';
import s from './BarChart.module.css'
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJs, CategoryScale, LinearScale, BarElement, LogarithmicScale, TimeSeriesScale, TimeScale, Legend, Tooltip } from 'chart.js';
import ZoomPlugin from 'chartjs-plugin-zoom';
import { getTheme } from '../../theme';
import { remToPx } from '../../../../../../../ui/rem-to-px';

ChartJs.register(CategoryScale, LinearScale, LogarithmicScale, Legend, BarElement, ZoomPlugin, Tooltip);

type Dimension<EntryT> = {
  getValue: (entry: EntryT) => number | null,
  name: string
}

type Config<EntryT> = {
  name: string,
  dimensions: Dimension<EntryT>[],
  getLabel: (entry: EntryT) => string,
}

export type BarChartProps<EntryT> = {
  data: EntryT[];
  config: Config<EntryT>;
  onEntryClick?: (entry: EntryT) => void;
};

export function BarChart<EntryT>(props: BarChartProps<EntryT>) {
  const theme = useMemo(() => getTheme(), []);
  const chartRef = useRef<ChartJs>();
  const isPreventChangeCursor = useRef(false);

  const palette = useMemo(() => theme.getRandomColors(props.config.dimensions.length), [props.config.dimensions]);

  return (
    <div className={s.BarChart}>
      <Bar
        ref={chartRef}
        data={{
          datasets: props.config.dimensions.map((dimension, i) => {
            return {
              data: props.data.map(dimension.getValue),
              backgroundColor: palette[i],
              animation: false,
              borderRadius: remToPx(4),
              label: dimension.name,
            }
          }),
          labels: props.data.map(props.config.getLabel),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
          },
          plugins: {
            legend: {
              display: true,
              title: {
                display: true,
                text: props.config.name,
              },
              labels: {
                borderRadius: remToPx(4),
                useBorderRadius: true,
              },
              onHover: function (e) {
                (e.native?.target as any).style.cursor = 'pointer';
                isPreventChangeCursor.current = true;
              },
              onLeave: function (e) {
                (e.native?.target as any).style.cursor = 'default';
                isPreventChangeCursor.current = false;
              }
            },
            tooltip: {
              enabled: true,
              animation: false,
              cornerRadius: remToPx(4),
              padding: remToPx(12),
            },
            zoom: {
              pan: {
                enabled: true,
                mode: 'x',
              },
              zoom: {
                wheel: {
                  enabled: true,
                  speed: 0.5
                },
                pinch: {
                  enabled: true,
                },
                mode: 'x',
                scaleMode: 'x',
              }
            }
          },
        }}
        onClick={(e) => {
          if (props.onEntryClick === undefined) {
            return;
          }

          const pointUnderCursor = chartRef.current?.getElementsAtEventForMode(e.nativeEvent, 'nearest', { intersect: true }, true)[0];
          if (pointUnderCursor !== undefined) {
            props.onEntryClick(props.data[pointUnderCursor.index]);
          }
        }}
        onMouseMove={(e) => {
          if (props.onEntryClick === undefined || isPreventChangeCursor.current) {
            return;
          }

          const pointUnderCursor = chartRef.current?.getElementsAtEventForMode(e.nativeEvent, 'nearest', { intersect: true }, true)[0];
          if (pointUnderCursor === undefined) {
            (e.nativeEvent.target as any).style.cursor = 'default';
          } else {
            (e.nativeEvent.target as any).style.cursor = 'pointer';
          }
        }}
      />
    </div>
  );
}

export default BarChart;
