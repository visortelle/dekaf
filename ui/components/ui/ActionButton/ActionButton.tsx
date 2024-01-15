import React, { ReactElement } from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import s from './ActionButton.module.css'
import Link from '../Link/Link';

import editIcon from './edit.svg';
import closeIcon from './close.svg';
import { tooltipId } from '../Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

export type ActionButtonProps = {
  action: { type: 'predefined', action: 'edit' | 'close' }
  onClick: () => void;
  linkTo?: string;
  testId?: string;
  title?: string | ReactElement;
};

const ActionButton: React.FC<ActionButtonProps> = (props) => {
  let svgIcon;
  switch (props.action.action) {
    case 'edit': svgIcon = editIcon; break;
    case 'close': svgIcon = closeIcon; break;
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
    <button
      type="button"
      className={s.ActionButton}
      onClick={props.onClick}
      data-testid={props.testId}
      data-tooltip-id={tooltipId}
      data-tooltip-html={tooltipHtml}
    >
      <SvgIcon svg={svgIcon} />
    </button>
  );

  return props.linkTo ? (
    <Link to={props.linkTo}>
      {button}
    </Link>
  ) : button
}

export default ActionButton;
