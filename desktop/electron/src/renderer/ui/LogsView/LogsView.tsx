import React, { useCallback, useRef, useState } from 'react';
import s from './LogsView.module.css'
import { colorsByName } from '../ColorPickerButton/ColorPicker/color-palette';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import useInterval from '../../app/hooks/use-interval';
import Select, { ListItem } from '../Select/Select';
import Input from '../Input/Input';
import SmallButton from '../SmallButton/SmallButton';

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
  logs: LogEntry[],
  onClear: () => void
};

const allSources = 'e9cca391-7fd0-4ab7-a28c-c701047437f9';

const displayEntriesWhenFollow = 50;

type LogSources = Record<string, { color: string }>;

const LogsView: React.FC<LogsViewProps> = (props) => {
  const sources = useRef<LogSources>({});
  const [isFollow, setIsFollow] = useState(true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const [sourceFilter, setSourceFilter] = useState(allSources);
  const [filter, setFilter] = useState('');

  const scrollToBottom = (bottomOffset?: number, behavior?: 'auto' | 'smooth') => {
    const scrollParent = logsRef.current?.children[0];
    scrollParent?.scrollTo({ top: scrollParent.scrollHeight - (bottomOffset || 0), behavior: behavior || 'auto' });
  }

  useInterval(() => {
    scrollToBottom();
  }, isFollow ? 100 : false);

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
      setTimeout(() => scrollToBottom(15), 50);
    }
  }, [isFollow]);

  props.logs.forEach(entry => {
    let color = 'inherit';

    if (sources.current[entry.source] !== undefined) {
      color = sources.current[entry.source].color;
    } else {
      const nextColor = logsColorPalette[Object.keys(sources.current).length];
      sources.current[entry.source] = { ...sources.current[entry.source], color: nextColor };
      color = nextColor;
    }
  });

  let filteredItems = sourceFilter === allSources ? props.logs : props.logs.filter(entry => entry.source === sourceFilter);
  filteredItems = filteredItems.filter(item => item.content.toLowerCase().includes(filter.toLowerCase()));

  const itemsToShow = isFollow ? filteredItems.slice(-displayEntriesWhenFollow) : filteredItems;

  const itemContent = (i: number, entry: LogEntry) => {
    const color = sources.current[entry.source].color;

    return (
      <div key={i} className={s.LogEntry} style={{ color }}>
        <div className={s.LogEntrySource}>{entry.source}&nbsp;</div>
        <pre className={s.LogEntryContent}>{entry.content}</pre>
      </div>
    );
  }

  return (
    <div className={s.LogsView}>
      <div className={s.Toolbar}>
        <div style={{ maxWidth: '240rem', flex: '1' }}>
          <Select<string>
            value={sourceFilter}
            list={
              [
                { type: 'item', title: 'All sources', value: allSources },
                ...Object.entries(sources.current).map<ListItem<string>>(([sourceId]) => ({ type: 'item', title: sourceId, value: sourceId }))
              ]
            }
            onChange={setSourceFilter}
          />
        </div>
        <div style={{ width: '320rem' }}>
          <Input value={filter} onChange={setFilter} placeholder='Search in logs' />
        </div>
        <div>Shown <strong>{filteredItems.length}</strong> of latest <strong>{props.logs.length}</strong> entries</div>
        <div style={{ marginLeft: 'auto' }}>
          <SmallButton type='regular' text='Clear' onClick={props.onClear} />
        </div>
      </div>
      <div ref={logsRef} className={s.Logs} onWheel={onWheel}>
        <Virtuoso
          ref={virtuosoRef}
          data={itemsToShow}
          totalCount={itemsToShow.length}
          itemContent={itemContent}
          followOutput={isFollow}
          atBottomThreshold={10}
          overscan={{ main: window.innerHeight * 2, reverse: window.innerWidth }}
        />
      </div>
    </div>
  );
}

export default LogsView;
