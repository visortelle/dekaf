import React, { useMemo } from 'react';
import s from './BarChart.module.css'
import { Bar } from 'react-chartjs-2';
import {Chart as ChartJs, CategoryScale, LinearScale, BarElement, LogarithmicScale, TimeSeriesScale, TimeScale} from 'chart.js';
import ZoomPlugin from 'chartjs-plugin-zoom';
import sampleData from '../sample-data.json';
import { getTheme } from '../theme';

ChartJs.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, ZoomPlugin);

export type BarChartProps = {
};

const BarChart: React.FC<BarChartProps> = (props) => {
  const theme = useMemo(() => getTheme(), []);

  return (
    <div className={s.BarChart}>
      <Bar
        data={{
          datasets: [
            {
              data: sampleData.map(s => s.y),
              animation: false,
              backgroundColor: theme.blueColor,
              borderRadius: 4
            },
          ],
          labels: sampleData.map(s => s.x.toString()),
        }}
        options={{
          normalized: true,
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
