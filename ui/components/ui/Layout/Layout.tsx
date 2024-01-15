import React from 'react';
import s from './Layout.module.css'
import NavigationTree from './NavigationTree/NavigationTree';
import { TreePath } from './NavigationTree/TreeView';
import GlobalProgressIndicator from '../GlobalProgressIndicator/GlobalProgressIndicator';
import SettingsBar from './SettingsBar/SettingsBar';

export type LayoutProps = {
  children: React.ReactNode;
  navigationTree: {
    selectedNodePath: TreePath;
  };
  scrollMode?: 'window' | 'page-own'
} & React.HTMLAttributes<HTMLDivElement>;

const Layout: React.FC<LayoutProps> = (props) => {
  const { children, navigationTree, scrollMode, ...restProps } = props;

  return (
    <div className={s.Layout} {...restProps}>
      <GlobalProgressIndicator />
      <div className={s.LeftSidebar}>
        <div className={s.SettingsBar}>
          <SettingsBar />
        </div>

        <div className={s.NavigationTree}>
          <NavigationTree selectedNodePath={navigationTree.selectedNodePath} />
        </div>
      </div>
      <div className={s.Content}>
        <div className={s.Children} style={{ overflow: props?.scrollMode === 'page-own' ? "hidden" : 'initial' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;
