import React from 'react';
import s from './Layout.module.css'
import NavigationTree from './NavigationTree/NavigationTree';
import { TreePath } from './NavigationTree/TreeView';
import GlobalProgressIndicator from '../GlobalProgressIndicator/GlobalProgressIndicator';
import SettingsBar from './SettingsBar/SettingsBar';
import ThemeSwitch from '../ThemeSwitch/ThemeSwitch';
import { useResizablePane } from '../resizable/useResizablePane';
import PaneResizeHandle from '../resizable/PaneResizeHandle';

export type LayoutProps = {
  children: React.ReactNode;
  navigationTree: {
    selectedNodePath: TreePath;
  };
  scrollMode?: 'window' | 'page-own'
} & React.HTMLAttributes<HTMLDivElement>;

const Layout: React.FC<LayoutProps> = (props) => {
  const { children, navigationTree, scrollMode, ...restProps } = props;
  const sidebar = useResizablePane('nav-sidebar', { defaultSize: 320, minSize: 220, maxSize: 600, side: 'left' });

  return (
    <div className={s.Layout} {...restProps}>
      <GlobalProgressIndicator />
      <div className={s.LeftSidebar} style={{ width: sidebar.size }}>
        <div className={s.SettingsBar}>
          <SettingsBar />
        </div>

        <div className={s.NavigationTree}>
          <NavigationTree selectedNodePath={navigationTree.selectedNodePath} />
        </div>

        <div className={s.SidebarFooter}>
          <ThemeSwitch />
        </div>

        <PaneResizeHandle mode="edge" onResizeStart={sidebar.startResize} title="Drag to resize sidebar" />
      </div>
      <div className={s.Content} style={{ marginLeft: sidebar.size }}>
        <div className={s.Children} style={{ overflow: props?.scrollMode === 'page-own' ? "hidden" : 'initial' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;
