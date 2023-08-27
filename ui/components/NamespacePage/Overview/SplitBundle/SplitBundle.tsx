import * as pbn from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import React from "react";
import { BundleKey } from "../Overview";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import Select, {List, ListItem} from "../../../ui/Select/Select";
import Checkbox from "../../../ui/Checkbox/Checkbox";
import * as BrokerConfig from "../../../app/contexts/BrokersConfig";
import s from "./SplitBundle.module.css";
import Input from "../../../ui/Input/Input";

export type SplitBundleProps = {
  namespaceFqn: string,
  bundleKey: BundleKey,
}

export type SplitParams = {
  splitAlgorithm: string;
  unloadSplitBundles: boolean;
}


const getDefaultAlgorithm = (brokersConfig: BrokerConfig.Value): string => {
  const defaultAlgorithm = brokersConfig
    .get('defaultNamespaceBundleSplitAlgorithm')?.value
    .replace(/[^a-zA-Z0-9_,]/g, '')

  return defaultAlgorithm ?? ''
}

const getSupportedAlgorithms = (brokersConfig: BrokerConfig.Value): string[] => {
  const supportedAlgorithmsCleaned = brokersConfig
    .get('supportedNamespaceBundleSplitAlgorithms')?.value
    .replace(/[^a-zA-Z0-9_,]/g, '')

  return supportedAlgorithmsCleaned ?
    supportedAlgorithmsCleaned.split(",") :
    []
}

const SplitBundle: React.FC<SplitBundleProps> = ({ namespaceFqn, bundleKey }) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const brokersConfig = BrokerConfig.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();

  const defaultAlgorithm = getDefaultAlgorithm(brokersConfig)
  const supportedAlgorithms = getSupportedAlgorithms(brokersConfig)

  const [customAlgorithmInput, setCustomAlgorithmInput] = React.useState<string>('');
  const [splitParams, setSplitParams] = React.useState<SplitParams>({
    splitAlgorithm: "default-algorithm",
    unloadSplitBundles: false,
  } as SplitParams);


  const list: List<string> =  [
    {type: 'item', value: "default-algorithm", title: `Default algorithm (${defaultAlgorithm})`},
    {type: 'item', value: "custom-algorithm", title: "Custom algorithm"},
    {type: 'group', title: "Supported algorithms", items: [
        ...supportedAlgorithms.map(x => ({type: 'item', value: x, title: x} as ListItem<string>))
      ]
    },
  ]

  const split = async () => {
    let splitAlgorithm: string;

    switch (splitParams.splitAlgorithm) {
      case "default-algorithm":
        splitAlgorithm = defaultAlgorithm
        break;
      case "custom-algorithm":
        splitAlgorithm = customAlgorithmInput
        break;
      default:
        splitAlgorithm = splitParams.splitAlgorithm
        break;
    }

    if (!splitAlgorithm) {
      notifyError(
        `Unable to split namespace bundle. Split algorithm is not selected`
      );
      return;
    }

    const req = new pbn.SplitNamespaceBundleRequest();
    req.setNamespace(namespaceFqn);
    req.setBundle(bundleKey);
    req.setSplitAlgorithm(splitAlgorithm);
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

  return (
    <ConfirmationDialog
      description={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>Split algorithm:</div>
          <Select
            value={splitParams.splitAlgorithm}
            list={list}
            onChange={v => setSplitParams(prevState => {
              return {...prevState, splitAlgorithm: v}
            })}
          />
          {splitParams.splitAlgorithm === "custom-algorithm" && (
            <Input
              value={customAlgorithmInput}
              placeholder="range_equally_divide"
              onChange={(v) => setCustomAlgorithmInput(v)}
            />
          )
          }
          <br/>
          <div className={s.UnloadSplitBundlesCheckbox}>
            <Checkbox
              isInline
              id="unloadSplitBundles"
              checked={splitParams.unloadSplitBundles}
              onChange={() => setSplitParams(prevState => {
                return {...prevState, unloadSplitBundles: !splitParams.unloadSplitBundles}
              })}
            />
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
