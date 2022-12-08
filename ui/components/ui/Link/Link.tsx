import { Link as _Link, useLocation } from 'react-router-dom';

const paramsToPreserve = ['q'];

export type LinkProps = Parameters<typeof _Link>[0];

// Link preserving global search query and other global query params.
const Link: React.FC<LinkProps> = (props) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const p = paramsToPreserve
    .map(param => {
      const value = queryParams.get(param);
      if (value === null) {
        return undefined;
      }
      return `${param}=${value}`;
    })
    .filter(p => p !== undefined)
    .join('&');

  const pathname = `${typeof props.to === 'object' ? props.to.pathname : props.to}?${p}`;

  return (
    <_Link
      {...props}
      to={typeof props.to === 'object' ? { ...props.to, pathname } : pathname}
    />
  );
};

export default Link;
