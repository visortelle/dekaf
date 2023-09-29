import React from "react";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import SmallButton from "../../../ui/SmallButton/SmallButton";
import pasteIcon from "./icons/paste.svg";
import PastePoliciesDialog from "./PastePoliciesDialog";

type PastePoliciesButtonProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicType: 'persistent' | 'non-persistent',
  isGlobal: boolean,
  sessionId: string | null,
  setReloadKey: React.Dispatch<React.SetStateAction<number>>,
}

const PastePoliciesButton: React.FC<PastePoliciesButtonProps> = (props) => {
  const modals = Modals.useContext();

  const topicFqn = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`

  return (
    <SmallButton onClick={() => {
      modals.push({
        id: "paste-warning-dialog",
        title: `Paste clipboard policies`,
        content: (
          <PastePoliciesDialog
            topicFqn={topicFqn}
            tenant={props.tenant}
            namespace={props.namespace}
            topic={props.topic}
            topicType={props.topicType}
            sessionId={props.sessionId}
            setReloadKey={props.setReloadKey}
            isGlobal={props.isGlobal}
          />
        ),
        styleMode: "no-content-padding",
      });
    }} type={"regular"} text={"Paste"} svgIcon={pasteIcon} disabled={props.sessionId === null}/>
  );
}

export default PastePoliciesButton;