import * as pbn from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import React from "react";
import {BundleKey} from "../Overview";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import Select from "../../../ui/Select/Select";
import Checkbox from "../../../ui/Checkbox/Checkbox";

export type SplitBundleProps = {
  namespaceFqn: string,
  bundleKey: BundleKey,
}

export type SplitParams = {
  splitAlgorithm: string;
  unloadSplitBundles: boolean;
}

const SplitBundle: React.FC<SplitBundleProps> = ({namespaceFqn, bundleKey}) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();
  const [ splitParams, setSplitParams ] = React.useState<SplitParams>({
    splitAlgorithm: 'range_equally_divide',
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

    notifySuccess('Namespace bundle successfully split');
    modals.pop();
  };

  return (
    <ConfirmationDialog
      description={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>Split algorithm:</div>
          <Select<'range_equally_divide' | 'topic_count_equally_divide'>
            value={splitParams.splitAlgorithm}
            list={[
              { type: 'item', value: 'range_equally_divide', title: 'Range equally divide' },
              { type: 'item', value: 'topic_count_equally_divide', title: 'Topic count equally divide' },
            ]}
            onChange={v => setSplitParams({ splitAlgorithm: v, unloadSplitBundles: splitParams.unloadSplitBundles })}
          />
          <br />
          <div style={{display: "flex", gap: "12rem"}}>
            <Checkbox isInline id="unloadSplitBundles" checked={splitParams.unloadSplitBundles} onChange={() => setSplitParams({...splitParams, unloadSplitBundles: !splitParams.unloadSplitBundles})} />
            <div>Unload split bundles</div>
          </div>
          <br />
          <div>This will split the bundle to the reassign them to different brokers to lower the and could lead to severe consequences.</div>
          <br />
        </div>
      }
      onConfirm={split}
      onCancel={modals.pop}
      type='danger'
    />
  );
}

export default SplitBundle;
