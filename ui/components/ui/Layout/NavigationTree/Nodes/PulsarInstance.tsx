import React from "react";
import * as AppContext from "../../../../app/contexts/AppContext";
import Link from "../../../Link/Link";
import {routes} from "../../../../routes";
import s from "../NavigationTree.module.css";

export type PulsarInstanceProps = {
  forceReloadKey: number;
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
  customRender?: (props: PulsarInstanceProps) => React.ReactElement;
}
export const PulsarInstance: React.FC<PulsarInstanceProps> = (props) => {
  const { config } = AppContext.useContext();

  return props.customRender?.(props) || (
    <Link
      to={routes.instance.overview._.get()}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{config.pulsarInstance.name || 'Pulsar Instance'}</span>
    </Link>
  );
}
