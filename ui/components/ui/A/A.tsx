import React from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import s from './A.module.css'
import externalLinkIcon from './external-link.svg';
import * as Modals from '../../app/contexts/Modals/Modals';

export type AProps = React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & {
  isExternalLink?: boolean;
};

const A: React.FC<AProps> = (props) => {
  const modals = Modals.useContext();

  const {
    isExternalLink,
    className,
    children,
    target,
    ...restProps
  } = props;

  return (
    <a
      className={`${s.A} ${className || ''}`}
      target={isExternalLink ? '_blank' : target}
      onClick={isExternalLink ? undefined : () => modals.clear()}
      {...restProps}
    >
      {children}
      {isExternalLink && (
        <div className={s.ExternalLinkIcon}>
          <SvgIcon svg={externalLinkIcon} />
        </div>
      )}
    </a>
  );
}

export default A;
