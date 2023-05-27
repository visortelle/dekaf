import React from 'react';
import s from './Jwt.module.css'
import Input from '../../../../../../Input/Input';

export type JwtProps = {};

const Jwt: React.FC<JwtProps> = (props) => {
  console.log('jwt')
  return (
    <div className={s.Jwt}>
      <strong>Token</strong>
      <br />
      <Input onChange={() => {}} value={''} />
    </div>
  );
}

export default Jwt;

