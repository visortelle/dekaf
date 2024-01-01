import { renderToStaticMarkup } from "react-dom/server";
import { tooltipId } from "../Tooltip/Tooltip";
import { Sort, SortKey } from "./sort";
import arrowDownIcon from '../../ui/ChildrenTable/arrow-down.svg';
import arrowUpIcon from '../../ui/ChildrenTable/arrow-up.svg';
import SvgIcon from '../SvgIcon/SvgIcon';
import { FC } from "react";
import s from './ConsumerSession.module.css'
import cts from "../../ui/ChildrenTable/ChildrenTable.module.css";

export type ThProps = {
  title: React.ReactNode,
  help: React.ReactElement,
  sort: Sort,
  setSort: (v: Sort) => void,
  sortKey?: SortKey,
  style?: React.CSSProperties
};

export const Th: FC<ThProps> = (props: ThProps) => {
  const handleColumnHeaderClick = () => {
    if (props.sortKey === undefined) {
      return;
    }

    if (props.sort.key === props.sortKey) {
      props.setSort({ key: props.sortKey, direction: props.sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      props.setSort({ key: props.sortKey, direction: 'asc' });
    }
  }

  return (
    <th className={`${cts.Th} ${s.Th}`} style={props.style} onClick={handleColumnHeaderClick}>
      <div
        className={props.sortKey === undefined ? '' : cts.SortableTh}
        data-tooltip-id={tooltipId}
        data-tooltip-html={renderToStaticMarkup(props.help)}
      >
        {props.title}

        {props.sort.key === props.sortKey && (
          <div className={cts.SortableThIcon}>
            <SvgIcon svg={props.sort.direction === 'asc' ? arrowUpIcon : arrowDownIcon} />
          </div>
        )}
      </div>
    </th>
  );
};

