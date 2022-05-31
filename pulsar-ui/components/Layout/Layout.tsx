import React from 'react';
import s from './Layout.module.css'
import NavigationTree from '../NavigationTree/NavigationTree';

export type LayoutProps = {
  children: React.ReactNode;
};

const Layout: React.FC<LayoutProps> = (props) => {
  return (
    <div className={s.Layout}>
      <div className={s.NavigationTree}>
        <NavigationTree />
      </div>
      <div className={s.Children}>
        {props.children}
      </div>
    </div>
  );
}

export default Layout;
