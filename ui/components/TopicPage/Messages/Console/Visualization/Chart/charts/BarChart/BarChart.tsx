import React, { useMemo, useState } from 'react';
import s from './BarChart.module.css'
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJs, CategoryScale, LinearScale, BarElement, LogarithmicScale, TimeSeriesScale, TimeScale } from 'chart.js';
import ZoomPlugin from 'chartjs-plugin-zoom';
import { getTheme } from '../../theme';

ChartJs.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, ZoomPlugin);

type Dimension = {
  getValue: (entry: any) => number | null
}

type Config = {
  dimensions: Dimension[],
  getLabel: (entry: any) => string,
}

export type BarChartProps = {
  data: any[];
  config: Config;
};

const BarChart: React.FC<BarChartProps> = (props) => {
  const theme = useMemo(() => getTheme(), []);

  const palette = useMemo(() => theme.getRandomColors(props.config.dimensions.length), [props.config.dimensions]);
  console.log(palette)

  return (
    <div className={s.BarChart}>
      <Bar
        data={{
          datasets: props.config.dimensions.map((dimension, i) => {
            return {
              data: props.data.map(dimension.getValue),
              backgroundColor: palette[i],
              animation: false,
              borderRadius: 4,
            }
          }),
          labels: props.data.map(props.config.getLabel),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          // scales: {
          //   x: {
          //     type: 'time',

          //   }
          // },
          font: {
            family: theme.fontFamily,
            size: theme.fontSize,
          },
          plugins: {
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
      />
    </div>
  );
}

export default BarChart;
