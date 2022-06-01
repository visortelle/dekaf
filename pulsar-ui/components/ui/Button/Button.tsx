import s from './Button.module.css';

export type ButtonProps = {
 onClick: () => void,
 title: string
 type: 'primary' | 'regular' | 'danger',
}
const Button: React.FC<ButtonProps> = ({ onClick, title, type }) => {
  let className = '';
  switch(type) {
    case 'regular': className = s.Regular; break;
    case 'primary': className = s.Primary; break;
    case 'danger': className = s.Danger; break;
  }

  return (
    <div
      className={`${s.Button} ${className}`}
      onClick={onClick}
    >
      {title}
    </div>
  );
}

export default Button;
