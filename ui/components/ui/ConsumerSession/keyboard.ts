import { KeyboardEvent } from 'react';
import { MessageDescriptor } from './types';
import { VirtuosoHandle } from 'react-virtuoso';

export type HandleKeyDownProps = {
  event: KeyboardEvent<HTMLDivElement>,
  messages: MessageDescriptor[],
  selectedMessages: number[],
  setSelectedMessages: (selected: number[]) => void,
  virtuoso: VirtuosoHandle
};

const arrowUpKeys = ['ArrowUp', 'k'];
const arrowDownKeys = ['ArrowDown', 'j'];

let lastKeyDownTime = new Date().getTime();

export function handleKeyDown(props: HandleKeyDownProps) {
  const { event, messages, selectedMessages, setSelectedMessages, virtuoso } = props;
  event.preventDefault();

  // Debounce frequent events for better performance
  const keyDownTime = new Date().getTime();
  if (lastKeyDownTime && (keyDownTime - lastKeyDownTime < 64)) {
    return;
  }
  lastKeyDownTime = keyDownTime;

  if (selectedMessages.length !== 1) {
    return;
  }

  const selectedMessageIndex = messages.findIndex(msg => msg.numMessageProcessed === selectedMessages[0]);

  if (arrowUpKeys.includes(event.key)) {
    const newSelectedMessageIndex = selectedMessageIndex === 0 ? messages.length - 1 : selectedMessageIndex - 1;
    const newSelectedMessages = [messages[newSelectedMessageIndex].numMessageProcessed!];
    setSelectedMessages(newSelectedMessages);
    virtuoso.scrollIntoView({ index: newSelectedMessageIndex, align: 'start' });
  } else if (arrowDownKeys.includes(event.key)) {
    const newSelectedMessageIndex = selectedMessageIndex === messages.length - 1 ? 0 : selectedMessageIndex + 1;
    const newSelectedMessages = [messages[newSelectedMessageIndex].numMessageProcessed!];
    setSelectedMessages(newSelectedMessages);
    virtuoso.scrollIntoView({ index: newSelectedMessageIndex, align: 'end' });
  }
}
