import React from 'react';
import s from './Footer.module.css'
import TealTools from './TealTools/TealTools';

export type FooterProps = {};

const Footer: React.FC<FooterProps> = (props) => {
  return (
    <div className={s.Footer}>
      <TealTools />
    </div>
  );
}

export default Footer;
