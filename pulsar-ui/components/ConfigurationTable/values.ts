import * as Either from 'fp-ts/Either';

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
  getId: (value: T) => string;
  onRemove?: (id: ReturnType<ListValue<T>['getId']>) => void;
  onCreate?: (value: T) => void;
  isValid?: (value: T) => Either.Either<Error, void>;
  options?: T[];
};

export type OneOfValue = {
  type: "oneOf";
  value: Value;
  options: Value[];
};

export type Value =
  | BooleanValue
  | StringValue
  | NumberValue
  | ListValue<any>
  | OneOfValue;

export type ConfigurationField<V extends Value> = {
  id: string,
  title: string,
  description: string,
  value: V;
}

