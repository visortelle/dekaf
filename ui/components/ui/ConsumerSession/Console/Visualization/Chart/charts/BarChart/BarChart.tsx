// import { useEffect, useMemo, useRef } from 'react';
// import s from './BarChart.module.css'
// import { Bar } from 'react-chartjs-2';
// import { Chart as ChartJs, CategoryScale, LinearScale, BarElement, LogarithmicScale, Legend, Tooltip, Decimation } from 'chart.js';
// import ZoomPlugin from 'chartjs-plugin-zoom';
// import { getTheme } from '../../theme';
// import { remToPx } from '../../../../../../rem-to-px';
// import { Config } from './types';
// import { downSample } from '../../down-sample';
// import { usePrevious } from '../../../../../../../app/hooks/use-previous';

// ChartJs.register(CategoryScale, LinearScale, LogarithmicScale, Legend, BarElement, ZoomPlugin, Tooltip, Decimation);

// export type BarChartProps<EntryT> = {
//   data: EntryT[];
//   config: Config<EntryT>;
//   onEntryClick?: (entry: EntryT) => void;
//   isRealTime?: boolean;
// };

// export function BarChart<EntryT>(props: BarChartProps<EntryT>) {
//   const theme = useMemo(() => getTheme(), []);
//   const chartRef = useRef<ChartJs>();
//   const prevIsRealTime = usePrevious(props.isRealTime);
//   const isPreventChangeCursor = useRef(false);

//   const palette = useMemo(() => theme.getRandomColors(props.config.dimensions.length), [props.config.dimensions]);

//   const data = useMemo(() => {
//     return props.isRealTime ? downSample(props.data, 1000) : props.data;
//   }, [props.data, props.isRealTime, props.config]);

//   useEffect(() => {
//     // As we down-sample data in real-time mode, we need to reset zoom,
//     // otherwise we'll see much less part of the chart.
//     if (props.isRealTime && !prevIsRealTime) {
//       chartRef.current?.resetZoom();
//     }
//   }, [props.isRealTime, prevIsRealTime]);

//   return (
//     <div className={s.BarChart}>
//       <Bar
//         ref={chartRef}
//         data={{
//           datasets: props.config.dimensions.map((dimension, i) => {
//             return {
//               data: data.map(dimension.getValue),
//               backgroundColor: palette[i],
//               animation: false,
//               borderRadius: remToPx(4),
//               label: dimension.name,
//             }
//           }),
//           labels: data.map(props.config.getLabel),
//         }}
//         options={{
//           responsive: true,
//           maintainAspectRatio: false,
//           interaction: {
//             mode: 'index',
//           },
//           plugins: {
//             legend: {
//               display: true,
//               title: {
//                 display: true,
//                 text: props.config.name,
//               },
//               labels: {
//                 borderRadius: remToPx(4),
//                 useBorderRadius: true,
//               },
//               onHover: function (e) {
//                 (e.native?.target as any).style.cursor = 'pointer';
//                 isPreventChangeCursor.current = true;
//               },
//               onLeave: function (e) {
//                 (e.native?.target as any).style.cursor = 'default';
//                 isPreventChangeCursor.current = false;
//               }
//             },
//             tooltip: {
//               enabled: true,
//               animation: false,
//               cornerRadius: remToPx(4),
//               padding: remToPx(12),

//             },
//             zoom: {
//               pan: {
//                 enabled: true,
//                 mode: 'x',
//               },
//               zoom: {
//                 wheel: {
//                   enabled: true,
//                   speed: 0.5,
//                 },
//                 pinch: {
//                   enabled: true,
//                 },
//                 mode: 'x',
//                 scaleMode: 'x',
//               },
//             }
//           },
//         }}
//         onClick={(e) => {
//           if (props.onEntryClick === undefined) {
//             return;
//           }

//           const pointUnderCursor = chartRef.current?.getElementsAtEventForMode(e.nativeEvent, 'nearest', { intersect: true }, true)[0];
//           if (pointUnderCursor !== undefined) {
//             props.onEntryClick(data[pointUnderCursor.index]);
//           }
//         }}
//         onMouseMove={(e) => {
//           if (props.onEntryClick === undefined || isPreventChangeCursor.current) {
//             return;
//           }

//           const pointUnderCursor = chartRef.current?.getElementsAtEventForMode(e.nativeEvent, 'nearest', { intersect: true }, true)[0];
//           if (pointUnderCursor === undefined) {
//             (e.nativeEvent.target as any).style.cursor = 'default';
//           } else {
//             (e.nativeEvent.target as any).style.cursor = 'pointer';
//           }
//         }}
//       />
//     </div>
//   );
// }

// export default BarChart;
