import s from './Button.module.css';

export type ButtonProps = {
 onClick: () => void,
 title: string
}
const Button: React.FC<ButtonProps> = ({ onClick, title }) => {
  return (
    <div className={s.Button} onClick={onClick}>
      {title}
    </div>
  );
}
