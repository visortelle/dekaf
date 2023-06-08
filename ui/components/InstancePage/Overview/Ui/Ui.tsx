import React from "react";
import s from "./Ui.module.css";
import * as AppContext from "../../../app/contexts/AppContext";
import sts from "../../../ui/SimpleTable/SimpleTable.module.css";

const Ui: React.FC = (props) => {
  const { config } = AppContext.useContext();

  return (
    <div className={s.Ui}>
      <div>Build info</div>
      <div>
        <table className={sts.Table}>
          <tbody>
            <tr className={sts.Row}>
              <td className={sts.Cell}>App version</td>
              <td className={sts.Cell}>{config?.buildInfo.version}</td>
            </tr>
            <tr className={sts.Row}>
              <td className={sts.Cell}>Built at</td>
              <td className={sts.Cell}>{config.buildInfo.builtAtString}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>Pulsar Instance</div>
      <div>
        <table className={sts.Table}>
          <tbody>
            <tr className={sts.Row}>
              <td className={sts.Cell}>Name</td>
              <td className={sts.Cell}>{config?.pulsarInstance.name}</td>
            </tr>
            <tr className={sts.Row}>
              <td className={sts.Cell}>Color</td>
              <td className={sts.Cell}>{config.pulsarInstance.color}</td>
            </tr>
            <tr className={sts.Row}>
              <td className={sts.Cell}>Broker service URL</td>
              <td className={sts.Cell}>
                {config.pulsarInstance.brokerServiceUrl}
              </td>
            </tr>
            <tr className={sts.Row}>
              <td className={sts.Cell}>Web service URL</td>
              <td className={sts.Cell}>
                {config.pulsarInstance.webServiceUrl}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Ui;
