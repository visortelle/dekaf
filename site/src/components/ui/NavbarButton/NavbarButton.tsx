import React from 'react';
import LoginIcon from '/img/icon_login.svg';
import SearchIcon from '/img/icon_search.svg';

import style from './NavbarButton.module.css';

type NavbarButtonProps = {
  variant: 'search' | 'login';
};

const NavbarButton: React.FC<NavbarButtonProps> = ({ variant }) => {
  return (
    <button className={style.button}>
      {variant === 'search' ? <SearchIcon /> : <LoginIcon />}
    </button>
  );
};

export default NavbarButton;
