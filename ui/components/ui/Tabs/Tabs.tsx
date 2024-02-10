import React, { ReactElement, useEffect, useRef } from 'react';
import s from './Tabs.module.css'
import SvgIcon from '../SvgIcon/SvgIcon';
import closeIcon from './close.svg';
import newTabIcon from './new-tab.svg';
import SmallButton from '../SmallButton/SmallButton';

export type Tab = {
  title: string | React.ReactElement;
  render: () => React.ReactNode;
  isRenderAlways?: boolean;
  onClose?: () => void;
  extraControls?: React.ReactElement
}

export type TabsProps<TK extends string> = {
  tabs: Record<TK, Tab>;
  activeTab: TK;
  onActiveTabChange: (tab: TK) => void;
  closeTitle?: string,
  size?: 'regular' | 'small';
  direction?: 'horizontal' | 'vertical';
  newTab?: {
    onNewTab: () => void,
    title: string
  }
  scrollToTabId?: string,
};

function Tabs<TabKey extends string>(props: TabsProps<TabKey>): ReactElement {
  const { tabs } = props;
  const scrollToTabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToTabRef) {
      scrollToTabRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scrollToTabRef.current]);

  const tabEntries = Array.isArray(tabs)
    ? tabs.map(tabKey => [tabKey, { title: tabKey, render: () => null }] as [TabKey, Tab])
    : Object.entries<Tab>(tabs);

  return (
    <div className={`${s.Tabs} ${props.size === 'small' ? s.Small : ''} ${props.direction === 'vertical' ? s.TabsVertical : ''}`}>
      <div style={{ display: 'flex' }}>
        <div className={`${s.TabsList} ${props.direction === 'vertical' ? s.TabsListVertical : ''}`}>
          {tabEntries.map(([tabKey, tab]) => {
            return (
              <div
                key={tabKey}
                className={`${s.Tab} ${tabKey === props.activeTab ? s.ActiveTab : ''} ${props.direction === 'vertical' ? s.TabVertical : ''}`}
                onClick={() => props.onActiveTabChange(tabKey as TabKey)}
                ref={props.scrollToTabId === tabKey ? scrollToTabRef : undefined}
              >
                <div className={s.TabTitle}>{tab.title}</div>

                {tab.extraControls && (
                  <div className={s.TabExtraControls}>
                    {tab.extraControls}
                  </div>
                )}

                {tab.onClose && (
                  <div className={s.CloseTab} title={props.closeTitle || "Close this tab"} onClick={tab.onClose}>
                    <SvgIcon svg={closeIcon} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {props.newTab && (
          <div className={s.NewTabButton}>
            <SmallButton
              appearance='borderless-semitransparent'
              svgIcon={newTabIcon}
              onClick={props.newTab.onNewTab}
            />
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
      flex: '1 1',
      overflowX: 'hidden',
      flexDirection: props.direction === 'row' ? 'row' : 'column'
    }}>
      {props.children}
    </div>
  );
}
