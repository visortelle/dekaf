import React, { useState } from "react";
import s from "./CreateSubscription.module.css";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../../app/contexts/Notifications";
import Input from "../../../ui/Input/Input";
import Button from "../../../ui/Button/Button";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import { useNavigate } from "react-router-dom";
import { routes } from "../../../routes";
import { H2 } from "../../../ui/H/H";
import ConfigurationTable from "../../../ui/ConfigurationTable/ConfigurationTable";
import {CreateSubscriptionRequest} from "../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb";
import KeyValueEditor, {recordFromIndexedKv, recordToIndexedKv} from "../../../ui/KeyValueEditor/KeyValueEditor";
import Select, {List} from "../../../ui/Select/Select";
import {PulsarTopicPersistency} from "../../../pulsar/pulsar-resources";
import Toggle from "../../../ui/Toggle/Toggle";
import {help} from "../help";
import {EarliestMessage, LatestMessage, MessageId} from "../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import {hexStringToByteArray} from "../../../conversions/conversions";

export type CreateSubscriptionProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
};

type Properties = {
  [key: string]: string;
}

type InitialCursorPosition = "earliestMessage" | "latestMessage" | "messageId";

const CreateSubscription: React.FC<CreateSubscriptionProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();
  const [subscriptionName, setSubscriptionName] = useState<string>("");
  const [initialCursorPosition, setInitialCursorPosition] = useState<InitialCursorPosition>("earliestMessage");
  const [messageId, setMessageId] = useState<string | undefined>();
  const [isReplicated, setIsReplicated] = useState<boolean>(false);
  const [properties, setProperties] = useState<Properties>({});
  const navigate = useNavigate();

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const createSubscription = async () => {
    const req = new CreateSubscriptionRequest();
    req.setTopicFqn(topicFqn);
    req.setSubscriptionName(subscriptionName);

    req.setEarliestMessage(new EarliestMessage());

    if (initialCursorPosition === "earliestMessage") {
      req.setEarliestMessage(new EarliestMessage());
    }
    if (initialCursorPosition === "latestMessage") {
      req.setLatestMessage(new LatestMessage());
    }
    if (initialCursorPosition === "messageId" && messageId !== undefined && messageIdRegexp.test(messageId)) {
      const messageIdPb = new MessageId();
      req.setMessageId(messageIdPb.setMessageId(hexStringToByteArray(messageId)));
    }

    req.setIsReplicated(isReplicated);

    Object.entries(properties).map(([key, value]) => {
      req.getPropertiesMap().set(key, value)
    })

    const res = await topicServiceClient
      .createSubscription(req, null)
      .catch((err) => {
        `Unable to create subscription: ${err}`;
      });

    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(
        `Unable to create subscription: ${res.getStatus()?.getMessage()}`
      );
      return;
    }

    navigate(
      routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions._.get(
      { tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicPersistency: props.topicPersistency }
      )
    );
  };

  const subscriptionNameInput = (
    <Input
      value={subscriptionName}
      onChange={setSubscriptionName}
      placeholder="subscription-1"
      focusOnMount
    />
  );

  const list: List<InitialCursorPosition> = [
    { type: 'item', title: 'Earliest message', value: 'earliestMessage' },
    { type: 'item', title: 'Latest message', value: 'latestMessage' },
    {
      type: 'item',
      title: 'Message with specific ID',
      value: 'messageId'
    },
  ];

  const messageIdRegexp = /^[a-f0-9]{18}$/;

  const messageIdInput = (
    <div className={s.MessageIdBlock}>
      <Select<InitialCursorPosition>
        list={list}
        value={initialCursorPosition}
        onChange={setInitialCursorPosition}
      />

      {initialCursorPosition === "messageId" && (
        <Input
          value={messageId ?? ""}
          onChange={setMessageId}
          isError={!messageIdRegexp.test(messageId ?? "")}
          placeholder="08ee09100018003000"
        />
      )}
    </div>
  )

  const isReplicatedSubscriptionInput = (
    <Toggle
      value={isReplicated}
      onChange={setIsReplicated}
    />
  );

  const propertiesEditorInput = (
    <KeyValueEditor
      value={recordToIndexedKv(properties)}
      onChange={v => setProperties(recordFromIndexedKv(v))}
      height="300rem"
      testId="properties"
    />
  );

  const isFormValid =
    subscriptionName.length > 0 && (messageId !== "messageId" ||
      (initialCursorPosition === "messageId" && messageId !== undefined && messageIdRegexp.test(messageId))
    );

  return (
    <form className={s.CreateSubscription} onSubmit={(e) => e.preventDefault()}>
      <div className={s.Title}>
        <H2>New Subscription</H2>
      </div>

      <ConfigurationTable
        fields={[
          {
            id: "subscriptionName",
            title: "Subscription name",
            description: help["subscriptionName"],
            input: subscriptionNameInput,
            isRequired: true,
          },
          {
            id: "initialCursorPosition",
            title: "Initial cursor position",
            description: (
              <span>The message Id from the subscription should start from</span>
            ),
            input: messageIdInput,
            isRequired: true
          },
          {
            id: "isReplicated",
            title: "Is replicated",
            description: help["isReplicated"],
            input: isReplicatedSubscriptionInput,
          },
          {
            id: "properties",
            title: "Properties",
            description: help["subscriptionProperties"],
            input: propertiesEditorInput,
          }
        ]}
      />
      <Button
        onClick={createSubscription}
        type="primary"
        text="Create"
        disabled={!isFormValid}
        buttonProps={{
          type: "submit",
        }}
      />
    </form>
  );
};

export default CreateSubscription;
