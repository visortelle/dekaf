import { FC } from 'react';
import s from './Logo.module.css';
import logoImage from './logo.png';

const Logo: FC = () => {
  return (
    <div className={s.Logo} style={{ backgroundImage: `url(${logoImage})`}} />
  );
};

export default Logo;
