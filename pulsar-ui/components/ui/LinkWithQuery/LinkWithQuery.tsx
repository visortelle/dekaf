import { Link, useLocation } from 'react-router-dom';

const paramsToPreserve = ['q', 'nt'];

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

  return (
    <Link {...props} to={`${props.to}?${p}`} />
  );
};

export default LinkWithQuery;
