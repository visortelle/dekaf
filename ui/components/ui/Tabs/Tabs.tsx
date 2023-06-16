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
  tabs: Record<TK, Tab>
  activeTab: TK;
  onActiveTabChange: (tab: TK) => void;
  onClose?: () => void;
};

function Tabs<TabKey extends string>(props: TabsProps<TabKey>): ReactElement {
  return (
    <div className={s.Tabs}>
      <div className={s.TabsList}>
        {Object.entries<Tab>(props.tabs).map(([tabKey, tab]) => {
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
        {Object.entries<Tab>(props.tabs).map(([tabKey, tab]) => {
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

type TabContentProps = {
  isShow: boolean;
  isRenderAlways?: boolean;
  children: React.ReactNode;
}
const TabContent: React.FC<TabContentProps> = (props) => {
  if (!props.isShow && !props.isRenderAlways) {
    return <></>;
  }

  return (
    <div style={{ display: props.isShow ? 'flex' : 'none', flex: '1', overflow: 'hidden' }}>
      {props.children}
    </div>
  );
}
