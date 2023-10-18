import React from "react";
import s from "./Ui.module.css";
import * as AppContext from "../../../app/contexts/AppContext";
import sts from "../../../ui/SimpleTable/SimpleTable.module.css";

const Ui: React.FC = (props) => {
  const { config } = AppContext.useContext();

  return (
    <div className={s.Ui}>
      <table className={sts.Table}>
        <tbody>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Dekaf Version</td>
            <td className={sts.Cell}>{config?.buildInfo.version}</td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Built At</td>
            <td className={sts.Cell}>{config.buildInfo.builtAtString}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Ui;
