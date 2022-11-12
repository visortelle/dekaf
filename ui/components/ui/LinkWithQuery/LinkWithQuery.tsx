import { Link, useLocation } from 'react-router-dom';

const paramsToPreserve = ['q'];

// Link preserving global search query and other global query params.
const LinkWithQuery = (props: Parameters<typeof Link>[0]) => {
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
    <Link
      {...props}
      to={typeof props.to === 'object' ? { ...props.to, pathname } : pathname}
    />
  );
};

export default LinkWithQuery;
