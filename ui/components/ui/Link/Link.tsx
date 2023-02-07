import { Link as _Link, useLocation } from "react-router-dom";
import s from "./Link.module.css";

const paramsToPreserve = ["q"];

export type LinkProps = Parameters<typeof _Link>[0] & { isNormalizeStyle?: boolean };

// Link preserving global search query and other global query params.
const Link: React.FC<LinkProps> = (props) => {
  const { to, isNormalizeStyle, className, ...restProps } = props;
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const p = paramsToPreserve
    .map((param) => {
      const value = queryParams.get(param);
      if (value === null) {
        return undefined;
      }
      return `${param}=${value}`;
    })
    .filter((p) => p !== undefined)
    .join("&");

  const pathname = `${typeof props.to === "object" ? props.to.pathname : props.to}?${p}`;

  return (
    <_Link
      className={`${isNormalizeStyle ? s.LinkWithNormalizedStyle : ""} ${className || ""}`}
      to={typeof props.to === "object" ? { ...props.to, pathname } : pathname}
      {...restProps}
    />
  );
};

export default Link;
