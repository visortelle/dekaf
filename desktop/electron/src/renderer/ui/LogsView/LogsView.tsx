import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './LogsView.module.css'
import { colorsByName } from '../ColorPickerButton/ColorPicker/color-palette';
import { ItemContent, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import useInterval from '../../app/hooks/use-interval';

const logsColorPalette: string[] = [
  colorsByName['slate-700'],
  colorsByName['blue-700'],
  colorsByName['green-700'],
  colorsByName['teal-700'],
  colorsByName['purple-700'],
  colorsByName['blue-600'],
  colorsByName['green-600'],
  colorsByName['teal-600'],
  colorsByName['purple-600'],
];

export type LogEntry = {
  source: string,
  content: string,
  epoch: number
};

export type LogsViewProps = {
  logs: LogEntry[]
};

const displayEntriesWhenFollow = 50;

type ColorPerSource = Record<string, string>;

const LogsView: React.FC<LogsViewProps> = (props) => {
  const colorPerSource = useRef<ColorPerSource>({});
  const [isFollow, setIsFollow] = useState(true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (bottomOffset?: number) => {
    const scrollParent = logsRef.current?.children[0];
    scrollParent?.scrollTo({ top: scrollParent.scrollHeight - (bottomOffset || 0), behavior: 'auto' });
  }

  useInterval(() => {
    scrollToBottom();
  }, isFollow ? 200 : false);

  const onWheel = useCallback<React.WheelEventHandler<HTMLDivElement>>((e) => {
    if (!isFollow) {
      const element = logsRef?.current?.children[0];
      if (!element) {
        return;
      }

      const isAtBottom = (element.scrollHeight - element.scrollTop) < (element.clientHeight + 5);
      if (isAtBottom) {
        setIsFollow(true);
      }
    }

    if (e.deltaY < 0 && isFollow) {
      setIsFollow(false);
      setTimeout(() => scrollToBottom(50), 0);
    }
  }, [isFollow]);

  const entriesToShow = isFollow ? props.logs.slice(-displayEntriesWhenFollow) : props.logs;

  const itemContent = (i: number, entry: LogEntry) => {
    let color = 'inherit';

    if (colorPerSource.current[entry.source] !== undefined) {
      color = colorPerSource.current[entry.source];
    } else {
      const nextColor = logsColorPalette[Object.keys(colorPerSource.current).length];
      colorPerSource.current[entry.source] = nextColor;
      color = nextColor;
    }

    return (
      <div key={i} className={s.LogEntry} style={{ color }}>
        <div className={s.LogEntrySource}><i><u>{entry.source}</u></i>&nbsp;</div>
        <pre className={s.LogEntryContent}>{entry.content}</pre>
      </div>
    );
  }

  return (
    <div className={s.LogsView}>
      <div ref={logsRef} className={s.Logs} onWheel={onWheel}>
        <Virtuoso
          ref={virtuosoRef}
          data={entriesToShow}
          totalCount={entriesToShow.length}
          itemContent={itemContent}
          followOutput={isFollow}
          overscan={{ main: window.innerHeight * 2, reverse: window.innerWidth }}
        />
      </div>
    </div>
  );
}

export default LogsView;
