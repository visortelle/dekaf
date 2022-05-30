import React from 'react'
import s from './SvgIcon.module.css'

export type SvgIconProps = {
  svg: string
}

const SvgIcon = (props: SvgIconProps) => {
  return <div className={s.SvgIcon} dangerouslySetInnerHTML={{ __html: props.svg }}></div>
}

export default SvgIcon
