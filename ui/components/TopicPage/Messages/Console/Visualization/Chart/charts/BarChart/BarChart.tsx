import React, { useMemo } from 'react';
import s from './BarChart.module.css'
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJs, CategoryScale, LinearScale, BarElement, LogarithmicScale, TimeSeriesScale, TimeScale } from 'chart.js';
import ZoomPlugin from 'chartjs-plugin-zoom';
import { getTheme } from '../theme';
import { MessageDescriptor } from '../../../../../types';
import { get } from 'lodash';

ChartJs.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, ZoomPlugin);

export type BarChartProps = {
  data: any[];
};

const BarChart: React.FC<BarChartProps> = (props) => {
  const theme = useMemo(() => getTheme(), []);
  const data = (props.data as MessageDescriptor[]).map((entry) => ({
    x: entry.publishTime === null ? 'unknown' : entry.publishTime,
    y: entry.jsonValue
  }));

  console.log('datale', data)
  console.log('datalength', data.length)
  console.log('data', data.length > 1 && data[data.length - 1].y);

  return (
    <div className={s.BarChart}>
      <Bar
        data={{
          datasets: [
            {
              data: data.map(s => s.y),
              animation: false,
              backgroundColor: theme.blueColor,
              borderRadius: 4
            },
          ],
          labels: data.map(s => s.x.toString()),
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
              }
            }
          },
        }}
      />
    </div>
  );
}

export default BarChart;
