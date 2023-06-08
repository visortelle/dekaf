import React from "react";
import InternalConfig from "./InternalConfig/InternalConfig";
import HealthCheck from "./HealthCheck/HealthCheck";
import Metrics from "./Metrics/Metrics";
import Clusters from "./Clusters/Clusters";
import s from "./Overview.module.css";
import Ui from "./Ui/Ui";

const Overview: React.FC = () => {
  return (
    <div className={s.Overview}>
      <div className={s.Section}>
        <div className={s.SectionTitle}>UI</div>
        <Ui />
      </div>
      <div className={s.Section}>
        <div className={s.SectionTitle}>Health check</div>
        <HealthCheck />
      </div>
      <div className={s.Section} style={{ marginRight: "48rem" }}>
        <div className={s.SectionTitle}>Internal configuration</div>
        <InternalConfig />
      </div>
      <div className={s.Section}>
        <div className={s.SectionTitle}>Clusters</div>
        <Clusters />
      </div>
      <div className={s.Section}>
        <div className={s.SectionTitle}>Metrics</div>
        <Metrics />
      </div>
    </div>
  );
};

export default Overview;
