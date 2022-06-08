import * as Either from "fp-ts/Either";
import React from "react";

export type BooleanValue = {
  type: "boolean";
  value: boolean;
};

export type StringValue = {
  type: "string";
  value: string;
};

export type NumberValue = {
  type: "number";
  value: number;
};

export type ListValue<T> = {
  type: "list";
  value: T[];
  render: (value: T) => React.ReactElement;
  editor?: {
    render: (v: T, onChange: (v: T) => void) => React.ReactElement;
    initialValue: T;
  };
  getId: (value: T) => string;
  isValid: (value: T) => Either.Either<Error, void>;
  onRemove?: (id: ReturnType<ListValue<T>["getId"]>) => void;
  onAdd?: (value: T) => void;
};

export type Value =
  | BooleanValue
  | StringValue
  | NumberValue
  | ListValue<any>

export type ConfigurationField<V extends Value> = {
  id: string;
  title: string;
  description: string;
  value: V;
};
