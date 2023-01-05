import React, { useMemo } from 'react';
import s from './BarChart.module.css'
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJs, CategoryScale, LinearScale, BarElement, LogarithmicScale, TimeSeriesScale, TimeScale, Legend } from 'chart.js';
import ZoomPlugin from 'chartjs-plugin-zoom';
import { getTheme } from '../../theme';
import { remToPx } from '../../../../../../../ui/rem-to-px';

ChartJs.register(CategoryScale, LinearScale, LogarithmicScale, Legend, BarElement, ZoomPlugin);

type Dimension = {
  getValue: (entry: any) => number | null,
  name: string
}

type Config = {
  name: string,
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
              label: dimension.name,
            }
          }),
          labels: props.data.map(props.config.getLabel),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'dataset',
          },
          plugins: {
            legend: {
              display: true,
              title: {
                display: true,
                text: props.config.name,
              },
              labels: {
                borderRadius: 3,
                useBorderRadius: true,
              },
              onHover: function (e) {
                (e.native?.target as any).style.cursor = 'pointer';
              },
              onLeave: function (e) {
                (e.native?.target as any).style.cursor = 'default';
              }
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
      />
    </div>
  );
}

export default BarChart;
