import React from 'react'
import s from './SvgIcon.module.css'

export type SvgIconProps = React.HTMLAttributes<HTMLOrSVGElement> & {
  svg: string
}

const SvgIcon = (props: SvgIconProps) => {
  return <div className={`${s.SvgIcon} ${props.className}`} dangerouslySetInnerHTML={{ __html: props.svg }}></div>
}

export default SvgIcon
