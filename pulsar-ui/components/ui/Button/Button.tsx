import s from './Button.module.css';

export type ButtonProps = {
 onClick: () => void,
 title: string
 type: 'primary' | 'regular' | 'danger',
 disabled?: boolean
}
const Button: React.FC<ButtonProps> = (props) => {
  let className = '';
  switch(props.type) {
    case 'regular': className = s.Regular; break;
    case 'primary': className = s.Primary; break;
    case 'danger': className = s.Danger; break;
  }

  return (
    <button
      type="button"
      className={`${s.Button} ${props.disabled ? s.DisabledButton : ''} ${className}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.title}
    </button>
  );
}

export default Button;
