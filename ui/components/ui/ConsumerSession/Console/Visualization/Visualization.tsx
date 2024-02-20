// import React, { useEffect, useState } from 'react';
// import { MessageDescriptor, SessionState } from '../../types';
// import Chart from './Chart/Chart';
// import s from './Visualization.module.css'
// import { useDebounce } from 'use-debounce'

// export type VisualizationProps = {
//   messages: MessageDescriptor[];
//   isVisible: boolean;
//   sessionState: SessionState;
// };

// const Visualization: React.FC<VisualizationProps> = (props) => {
//   const [messagesDebounced] = useDebounce(
//     props.messages,
//     chooseDebounceDelay(props.messages.length),
//     { maxWait: 3000, leading: true, trailing: true }
//   );

//   const [messages, setMessages] = useState<VisualizationProps['messages']>([]);

//   useEffect(() => {
//     if (props.isVisible && props.sessionState !== 'pausing') {
//       setMessages(messagesDebounced);
//     }
//   }, [props.sessionState, props.isVisible, messagesDebounced]);

//   return (
//     <div className={s.Visualization}>
//       {props.isVisible && (
//         <Chart
//           type='bar'
//           messages={messages}
//           sessionState={props.sessionState}
//         />
//       )}
//     </div>
//   );
// }

// function chooseDebounceDelay(itemsCount: number) {
//   if (itemsCount > 5000) {
//     return 3000;
//   } else if (itemsCount > 1000) {
//     return 1000;
//   } else if (itemsCount > 500) {
//     return 500;
//   } else {
//     return 100;
//   }
// }

// export default Visualization;
