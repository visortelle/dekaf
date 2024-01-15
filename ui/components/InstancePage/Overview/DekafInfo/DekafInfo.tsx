import React from "react";
import s from "./DekafInfo.module.css";
import * as AppContext from "../../../app/contexts/AppContext";
import sts from "../../../ui/SimpleTable/SimpleTable.module.css";
import * as I18n from '../../../app/contexts/I18n/I18n';

const DekafInfo: React.FC = () => {
  const { config } = AppContext.useContext();
  const i18n = I18n.useContext();

  return (
    <div className={s.Ui}>
      <table className={sts.Table}>
        <tbody>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Product</td>
            <td className={sts.Cell}>{config?.productName}</td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>License ID</td>
            <td className={sts.Cell}>{config?.licenseId}</td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Version</td>
            <td className={sts.Cell}>{config?.buildInfo.version}</td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Built At</td>
            <td className={sts.Cell}>{i18n.formatDateTime(new Date(config.buildInfo.builtAtMillis))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default DekafInfo;
