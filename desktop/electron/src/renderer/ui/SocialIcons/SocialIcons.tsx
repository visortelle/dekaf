import React, { FC } from 'react';
import s from './SocialIcons.module.css'
import SvgIcon from '../SvgIcon/SvgIcon';
import linkedinIcon from './icons/linkedin.svg';
import xIcon from './icons/x.svg';

export type SocialIconsProps = {
  fill: string
};

const SocialIcons: React.FC<SocialIconsProps> = (props) => {
  return (
    <div className={s.SocialIcons}>
      <Icon
        iconSvg={linkedinIcon}
        href="https://www.linkedin.com/company/tealtools"
        fill={props.fill}
      />
      <Icon
        iconSvg={xIcon}
        href="https://x.com/dekaf_io"
        fill={props.fill}
      />
    </div>
  );
}

type IconProps = {
  iconSvg: string,
  href: string,
  fill: string
};

const Icon: FC<IconProps> = (props) => {
  return (
    <a
      target="_blank"
      href={props.href}
      style={{ fill: props.fill }}
      className={s.Icon}
    >
      <SvgIcon svg={props.iconSvg} />
    </a >
  );
}

export default SocialIcons;
