import s from './H.module.css';

export type HProps = {
  children: React.ReactNode;
}

export const H1: React.FC<HProps> = (props) => {
  return <h1 className={s.H1}>{props.children}</h1>
}

export const H2: React.FC<HProps> = (props) => {
  return <h2 className={s.H2}>{props.children}</h2>
}

export const H3: React.FC<HProps> = (props) => {
  return <h3 className={s.H3}>{props.children}</h3>
}

