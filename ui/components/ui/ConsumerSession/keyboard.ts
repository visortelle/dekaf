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
/** Keys that start navigating from nothing, without moving an existing selection. */
const enterKeys = ['Enter'];

let lastKeyDownTime = new Date().getTime();

export function handleKeyDown(props: HandleKeyDownProps) {
  const { event, messages, selectedMessages, setSelectedMessages, virtuoso } = props;

  // Only swallow the keys this handler acts on. The table is focusable, so preventing the default
  // for every key trapped focus inside it - Tab / Shift-Tab could no longer move focus out.
  // Enter is deliberately NOT here: it is acted on only when there is no selection to move, and it
  // is swallowed there rather than for every press.
  if (arrowUpKeys.includes(event.key) || arrowDownKeys.includes(event.key)) {
    event.preventDefault();
  }

  // Debounce frequent events for better performance
  const keyDownTime = new Date().getTime();
  if (lastKeyDownTime && (keyDownTime - lastKeyDownTime < 64)) {
    return;
  }
  lastKeyDownTime = keyDownTime;

  const select = (index: number) => {
    setSelectedMessages([messages[index].numMessageProcessed!]);
    virtuoso.scrollIntoView({ index, align: index === 0 ? 'start' : 'end' });
  };

  // Nothing (or a whole group) is selected: this press has to CREATE the first selection, or the
  // table is unreachable without a pointer - the table is focusable precisely so that it is not.
  // Down/Enter start at the top, Up starts at the bottom, which is where a session that has been
  // running leaves the messages worth looking at.
  if (selectedMessages.length !== 1) {
    if (messages.length === 0) {
      return;
    }

    if (arrowDownKeys.includes(event.key) || enterKeys.includes(event.key)) {
      // Acted on, so swallowed - unlike an Enter pressed with a selection already in place, which
      // this handler leaves entirely alone.
      event.preventDefault();
      select(0);
      return;
    }

    if (arrowUpKeys.includes(event.key)) {
      select(messages.length - 1);
    }

    return;
  }

  const selectedMessageIndex = messages.findIndex(msg => msg.numMessageProcessed === selectedMessages[0]);

  if (selectedMessageIndex < 0) {
    setSelectedMessages([]);
    return;
  }

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
