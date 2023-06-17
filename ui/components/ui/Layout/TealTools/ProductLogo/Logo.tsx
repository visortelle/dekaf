import s from './Logo.module.css';

const Logo = (props: { fontSize: string, isDark?: boolean, isCompact?: boolean }) => {
  return (
    <div>
      <div
        className={s.Logo}
        style={{
          fontSize: props.fontSize,
          color: props.isDark ? '#fff' : 'var(--text-color)'
        }}
      >
        <span style={{ color: 'var(--accent-color-blue)' }}>{props.isCompact ? 'g' : 'Gamma'}</span><span>{props.isCompact ? 's' : 'Scope'}</span>
      </div>
      <div>
        the UI for Apache Pulsar
      </div>
    </div>
  );
};

export default Logo;
