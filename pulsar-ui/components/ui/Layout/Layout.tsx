import React from 'react';
import s from './Layout.module.css'
import NavigationTree from '../../NavigationTree/NavigationTree';
import { TreePath } from '../../NavigationTree/TreeView';

export type LayoutProps = {
  children: React.ReactNode;
  navigationTree: {
    expandedPath: TreePath;
  }
};

const Layout: React.FC<LayoutProps> = (props) => {
  return (
    <div className={s.Layout}>
      <div className={s.NavigationTree}>
        <NavigationTree expandedPath={props.navigationTree.expandedPath} />
      </div>
      <div className={s.Children}>
        {props.children}
      </div>
    </div>
  );
}

export default Layout;
