import React, { ReactElement } from 'react';
import s from './Tabs.module.css'
import SvgIcon from '../SvgIcon/SvgIcon';
import closeIcon from './close.svg';

export type Tab = {
  title: string;
  render: () => React.ReactNode;
  isRenderAlways?: boolean;
  onClose?: () => void;
}

export type TabsProps<TK extends string> = {
  tabs: Record<TK, Tab>;
  activeTab: TK;
  onActiveTabChange: (tab: TK) => void;
  onClose?: () => void;
};

function Tabs<TabKey extends string>(props: TabsProps<TabKey>): ReactElement {
  const { tabs } = props;

  const tabEntries = Array.isArray(tabs)
    ? tabs.map(tabKey => [tabKey, { title: tabKey, render: () => null }] as [TabKey, Tab])
    : Object.entries<Tab>(tabs);

  return (
    <div className={s.Tabs}>
      <div className={s.TabsList}>
        {tabEntries.map(([tabKey, tab]) => {
          return (
            <div
              key={tabKey}
              className={`${s.Tab} ${tabKey === props.activeTab ? s.ActiveTab : ''}`}
              onClick={() => props.onActiveTabChange(tabKey as TabKey)}
            >
              <div>{tab.title}</div>

              {tab.onClose && (
                <div className={s.CloseConsole} title="Close tab" onClick={tab.onClose}>
                  <SvgIcon svg={closeIcon} />
                </div>
              )}
            </div>
          );
        })}
        {props.onClose && (
          <div className={s.CloseTabs} title="Close" onClick={props.onClose}>
            <SvgIcon svg={closeIcon} />
          </div>
        )}
      </div>

      <div className={s.TabContent}>
        {tabEntries.map(([tabKey, tab]) => {
          return (
            <TabContent key={tabKey} isShow={props.activeTab === tabKey} isRenderAlways={tab.isRenderAlways}>
              {tab.render()}
            </TabContent>
          );
        })}
      </div>
    </div>
  );
}

export default Tabs;

export type TabContentProps = {
  isShow: boolean;
  isRenderAlways?: boolean;
  direction?: 'row' | 'column';
  children: React.ReactNode;
}
export const TabContent: React.FC<TabContentProps> = (props) => {
  if (!props.isShow && !props.isRenderAlways) {
    return <></>;
  }

  return (
    <div style={{
      display: props.isShow ? 'flex' : 'none',
      flex: '1',
      overflow: 'hidden',
      flexDirection: props.direction === 'row' ? 'row' : 'column'
    }}>
      {props.children}
    </div>
  );
}
