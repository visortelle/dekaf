import * as pbn from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import React from "react";
import { BundleKey } from "../Overview";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import Select from "../../../ui/Select/Select";
import Checkbox from "../../../ui/Checkbox/Checkbox";
import * as BrokerConfig from "../../../app/contexts/BrokersConfig";
import s from "./SplitBundle.module.css";

export type SplitBundleProps = {
  namespaceFqn: string,
  bundleKey: BundleKey,
}

export type SplitParams = {
  splitAlgorithm: string;
  unloadSplitBundles: boolean;
}

const SplitBundle: React.FC<SplitBundleProps> = ({ namespaceFqn, bundleKey }) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const brokersConfig = BrokerConfig.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();
  const [splitParams, setSplitParams] = React.useState<SplitParams>({
    splitAlgorithm: brokersConfig.get("")?.value,
    unloadSplitBundles: false,
  } as SplitParams);


  const split = async () => {
    const req = new pbn.SplitNamespaceBundleRequest();
    req.setNamespace(namespaceFqn);
    req.setBundle(bundleKey);
    req.setSplitAlgorithm(splitParams.splitAlgorithm);
    req.setUnloadSplitBundles(splitParams.unloadSplitBundles);

    const res =
      await namespaceServiceClient.splitNamespaceBundle(req, null);

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(
        `Unable to split namespace bundle. ${res.getStatus()?.getMessage()}`
      );
      return;
    }

    notifySuccess('Namespace bundle successfully split', crypto.randomUUID());
    modals.pop();
  };

  const supportedAlgorithms =
    brokersConfig
      .get('supportedNamespaceBundleSplitAlgorithms')?.value
      .replace(/[\[\]\(\)\{\}]/g, '')
      .split(",") ?? []


  return (
    <ConfirmationDialog
      description={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>Split algorithm:</div>
          <Select<any>
            value={splitParams.splitAlgorithm}
            list={
              supportedAlgorithms.map(x => ({ type: 'item', value: x, title: x }))
            }
            onChange={v => setSplitParams({ splitAlgorithm: v, unloadSplitBundles: splitParams.unloadSplitBundles })}
          />
          <br />
          <div className={s.UnloadSplitBundlesCheckbox}>
            <Checkbox isInline id="unloadSplitBundles" checked={splitParams.unloadSplitBundles} onChange={() => setSplitParams({ ...splitParams, unloadSplitBundles: !splitParams.unloadSplitBundles })} />
            <div>Unload split bundles</div>
          </div>
          <br />
          <div>Splitting namespace bundles can lead to dynamic reassignment of topics to different brokers based on load conditions. While this is designed to optimize load distribution, it can result in performance implications if not managed properly. Ensure you understand the implications of bundle splitting, especially in environments with significant topic growth or varying load conditions.</div>
          <br />
        </div>
      }
      onConfirm={split}
      onCancel={modals.pop}
      type={'danger'}
    />
  );
}

export default SplitBundle;
