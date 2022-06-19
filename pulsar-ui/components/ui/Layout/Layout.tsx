import React from 'react';
import s from './Layout.module.css'
import NavigationTree from '../../NavigationTree/NavigationTree';
import { TreePath } from '../../NavigationTree/TreeView';
import GlobalProgressIndicator from '../GlobalProgressIndicator/GlobalProgressIndicator';

export type LayoutProps = {
  children: React.ReactNode;
  navigationTree: {
    selectedNodePath: TreePath;
  }
};

const Layout: React.FC<LayoutProps> = (props) => {
  return (
    <div className={s.Layout}>
      <GlobalProgressIndicator />
      <div className={s.NavigationTree}>
        <NavigationTree selectedNodePath={props.navigationTree.selectedNodePath} />
      </div>
      <div className={s.Children}>
        {props.children}
      </div>
    </div>
  );
}

export default Layout;
