import React from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import s from './A.module.css'
import externalLinkIcon from '!!raw-loader!./external-link.svg';

export type AProps = React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & {
  isExternalLink?: boolean;
};

const A: React.FC<AProps> = (props) => {
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
