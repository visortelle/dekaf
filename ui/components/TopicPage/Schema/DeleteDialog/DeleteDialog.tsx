import * as Notifications from "../../../app/contexts/Notifications";
import * as PulsarGrpcClient from "../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient";
import * as Modals from "../../../app/contexts/Modals/Modals";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import { DeleteSchemaRequest } from "../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import { routes } from "../../../routes";
import { useNavigate } from "react-router";

export type Props = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
  refetchData: () => void;
};

const DeleteDialog = (props: Props) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { schemaServiceClient } = PulsarGrpcClient.useContext();
  const navigate = useNavigate();

  const deleteSchema = async () => {
    const req = new DeleteSchemaRequest();
    req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
    const res = await schemaServiceClient.deleteSchema(req, {}).catch((err) => notifyError(err));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() === Code.OK) {
      notifySuccess("Successfully deleted the topic schema");
    } else {
      notifyError(res.getStatus()?.getMessage());
    }

    await props.refetchData();

    navigate(routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema._.get({
      tenant: props.tenant,
      namespace: props.namespace,
      topic: props.topic,
      topicType: props.topicType,
    }));

    modals.pop();
  };

  return (
    <ConfirmationDialog
      description={
        <div>
          <div>
            This action <strong>cannot</strong> be undone.
          </div>
          <br />
          <div>All schema versions will be permanently deleted.</div>
        </div>
      }
      onConfirm={deleteSchema}
      onCancel={modals.pop}
    />
  );
};

export default DeleteDialog;
