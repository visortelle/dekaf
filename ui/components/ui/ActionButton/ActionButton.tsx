import React, { ReactElement } from 'react';
import s from './ActionButton.module.css'
import Link from '../Link/Link';

import editIcon from './edit.svg';
import closeIcon from './close.svg';
import viewIcon from './view.svg';
import refreshIcon from './refresh.svg';
import { tooltipId } from '../Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';
import SmallButton, { SmallButtonProps } from '../SmallButton/SmallButton';

export type ActionButtonProps = {
  action: { type: 'predefined', action: 'edit' | 'close' | 'view' | 'refresh' | 'without-icon' };
  onClick: () => void;
  linkTo?: string;
  testId?: string;
  title?: string | ReactElement;
  buttonProps?: Partial<SmallButtonProps>;
};

const ActionButton: React.FC<ActionButtonProps> = (props) => {
  let svgIcon;
  switch (props.action.action) {
    case 'edit': svgIcon = editIcon; break;
    case 'close': svgIcon = closeIcon; break;
    case 'view': svgIcon = viewIcon; break;
    case 'refresh': svgIcon = refreshIcon; break;
    case 'without-icon': svgIcon = undefined; break;
  }

  let tooltipHtml: undefined | string | ReactElement;
  if (props.title === undefined) {
    tooltipHtml = undefined;
  } else if (typeof props.title === 'string') {
    tooltipHtml = props.title;
  } else {
    tooltipHtml = renderToStaticMarkup(props.title);
  }

  const button = (
    <SmallButton
      type='regular'
      className={s.ActionButton}
      onClick={props.onClick}
      data-testid={props.testId}
      data-tooltip-id={tooltipId}
      data-tooltip-html={tooltipHtml}
      svgIcon={svgIcon}
      title={props.title}
      {...props.buttonProps}
    />
  );

  return props.linkTo ? (
    <Link to={props.linkTo}>
      {button}
    </Link>
  ) : button
}

export default ActionButton;
