import React, { useMemo } from 'react';
import s from './BarChart.module.css'
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJs, CategoryScale, LinearScale, BarElement, LogarithmicScale, TimeSeriesScale, TimeScale } from 'chart.js';
import ZoomPlugin from 'chartjs-plugin-zoom';
import { getTheme } from '../theme';
import { MessageDescriptor } from '../../../../../types';
import FormItem from '../../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Input from '../../../../../../../ui/Input/Input';

ChartJs.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, ZoomPlugin);

export type BarChartProps = {
  data: any[];
};

// export type MessageDescriptor = {
//   messageId: Nullable<Uint8Array>;
//   eventTime: Nullable<number>;
//   publishTime: Nullable<number>;
//   brokerPublishTime: Nullable<number>;
//   sequenceId: Nullable<number>;
//   producerName: Nullable<string>;
//   key: Nullable<string>;
//   orderingKey: Nullable<Uint8Array>;
//   topic: Nullable<string>;
//   size: Nullable<number>;
//   redeliveryCount: Nullable<number>;
//   schemaVersion: Nullable<number>;
//   isReplicated: Nullable<boolean>;
//   replicatedFrom: Nullable<string>;
//   properties: Record<string, string>;

//   value: Nullable<Uint8Array>;
//   jsonValue: Nullable<string>;
//   jsonAggregate: Nullable<string>;
// };

type XAxisGetValue = (entry: MessageDescriptor) => string;
type XAxisType = keyof MessageDescriptor;
type XAxisConfig = {
  type: XAxisType,
  get: XAxisGetValue,
}

const BarChart: React.FC<BarChartProps> = (props) => {
  const theme = useMemo(() => getTheme(), []);
  const data = (props.data as MessageDescriptor[])
    .map((entry) => ({
      x: entry.publishTime === null ? 'unknown' : entry.publishTime.toString(),
      y: entry.key
    }));

  return (
    <div className={s.BarChart}>
      <div className={s.Controls}>
        <div className={s.Range}>
          <FormItem>
            <FormLabel content="x" />
          </FormItem>
        </div>
      </div>

      <div className={s.Chart}>
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
                  scaleMode: 'x',
                }
              }
            },
          }}
        />
      </div>
    </div>
  );
}

export default BarChart;
