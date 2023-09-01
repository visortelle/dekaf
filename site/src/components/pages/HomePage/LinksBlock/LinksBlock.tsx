import React from 'react';
import Link from '../../../ui/Link/Link';
import Button from '../../../ui/Button/Button';

import style from './LinksBlock.module.css';

const LinksBlock: React.FC = () => {
  return (
    <div className={style.linksBlock}>
      <div className={style.linksButtonContainer}>
        <Button variant="primary" href="as" title="Get started - free" />
        <Button variant="secondary" href="asd" title="Try online" />
      </div>

      <Link href="" align="center">
        {'Get free Docker image for educational and non-commercial use ->'}
      </Link>
    </div>
  );
};

export default LinksBlock;
