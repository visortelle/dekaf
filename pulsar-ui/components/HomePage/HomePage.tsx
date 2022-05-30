import React, { useEffect } from 'react';
import s from './HomePage.module.css'
import NavigationTree from '../NavigationTree/NavigationTree';

export type HomePageProps = {};

const HomePage: React.FC<HomePageProps> = (props) => {
  return (
    <div className={s.HomePage}>
      <div className={s.NavigationTree}>
        <NavigationTree pulsarInstance='Hello' />
      </div>
    </div>
  );
}

export default HomePage;
