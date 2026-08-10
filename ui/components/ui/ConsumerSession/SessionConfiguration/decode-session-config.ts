import { ManagedConsumerSessionConfig, ManagedItemType } from '../../LibraryBrowser/model/user-managed-items';

/**
 * A RUNTIME shape decoder for a persisted consumer session config.
 *
 * `/consumer-session?id=` accepts the id of ANY persisted library item, and a persisted item is
 * JSON on disk: written by an older build, hand-edited, truncated, or saved by a build whose model
 * differed. TypeScript says nothing about it at runtime, so the editor needs an actual decoder
 * before it starts dereferencing.
 *
 * The check this replaced went one level deep - `targets` had to be an array and four wrappers had
 * to be objects - which let `{ targets: [{}] }` through to crash on `topic.val.metadata.id`, let a
 * `{}` chain sit in `useManagedItemValue` forever as neither a value nor a reference, and let an
 * unknown topic-selector kind reach an effect that throws outside React's reach. So this walks the
 * WHOLE document: every val-or-ref wrapper, every managed item's metadata and spec, every target,
 * and the chains, selector, deserializer, and projections inside each target.
 *
 * It reports the FIRST problem with a path in the document's own field names
 * (`spec.targets[1].val.spec.consumptionMode.mode.type`), the way the server reports
 * `targets[1]: consumption_mode: ...`. On a config with several targets and a chain inside each,
 * "something is wrong somewhere" is not an actionable answer.
 *
 * What it deliberately does NOT do: resolve references. A `{ type: 'reference', ref }` wrapper is
 * checked for a usable id and nothing more - the item behind it is fetched later, by the component
 * that needs it, and is that component's problem.
 */

/** Where the corruption is, in the saved document's own field names, and what is wrong with it. */
export type ConfigProblem = {
  path: string;
  problem: string;
};

export type ConfigDecodeResult =
  | { ok: true; item: ManagedConsumerSessionConfig }
  | { ok: false; problem: ConfigProblem };

/** The one-line rendering, e.g. `spec.targets[1].val.spec.isEnabled: expected true or false, found a string`. */
export function describeProblem(problem: ConfigProblem): string {
  return problem.path === '' ? problem.problem : `${problem.path}: ${problem.problem}`;
}

/** `undefined` means "no problem found here" - so checks compose with `??`, which short-circuits. */
type Problem = ConfigProblem | undefined;

type SpecCheck = (spec: Record<string, unknown>, path: string) => Problem;

const chainModes = ['all', 'any'] as const;
const dateTimeUnits = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'] as const;
const deliveryOrders = ['as-received', 'best-effort', 'guaranteed'] as const;
const deliveryOrderKeys = ['publish-time', 'broker-publish-time', 'event-time'] as const;
const regexSubscriptionModes = ['all-topics', 'persistent-only', 'non-persistent-only'] as const;
const consumptionModes = ['regular-consumption-mode', 'read-compacted-consumption-mode'] as const;
const deserializerKinds = ['use-latest-topic-schema', 'treat-bytes-as-json'] as const;
const filterKinds = ['BasicMessageFilter', 'JsMessageFilter'] as const;

const typeName = (v: unknown): string => {
  if (v === null) {
    return 'null';
  }
  if (Array.isArray(v)) {
    return 'a list';
  }
  if (v instanceof Date) {
    return 'a date';
  }
  return `a ${typeof v}`;
};

/** Short and readable in a message: a quoted string, or what kind of thing it is. */
const shown = (v: unknown): string => (typeof v === 'string' ? JSON.stringify(v) : typeName(v));

const at = (path: string, problem: string): ConfigProblem => ({ path, problem });

/** The root of the document has no name, so its fields must not be prefixed with a stray dot. */
const child = (path: string, field: string): string => (path === '' ? field : `${path}.${field}`);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

const recordAt = (v: unknown, path: string): Problem =>
  isRecord(v) ? undefined : at(path, `expected an object, found ${typeName(v)}`);

const stringAt = (v: unknown, path: string): Problem =>
  typeof v === 'string' ? undefined : at(path, `expected text, found ${typeName(v)}`);

const nonEmptyStringAt = (v: unknown, path: string): Problem =>
  typeof v === 'string' && v !== '' ? undefined : at(path, `expected non-empty text, found ${shown(v)}`);

const booleanAt = (v: unknown, path: string): Problem =>
  typeof v === 'boolean' ? undefined : at(path, `expected true or false, found ${typeName(v)}`);

const numberAt = (v: unknown, path: string): Problem =>
  typeof v === 'number' && Number.isFinite(v) ? undefined : at(path, `expected a number, found ${shown(v)}`);

const oneOfAt = (v: unknown, path: string, allowed: readonly string[]): Problem =>
  typeof v === 'string' && allowed.includes(v)
    ? undefined
    : at(path, `expected one of ${allowed.join(', ')}, found ${shown(v)}`);

const listAt = (v: unknown, path: string, checkItem: (item: unknown, itemPath: string) => Problem): Problem => {
  if (!Array.isArray(v)) {
    return at(path, `expected a list, found ${typeName(v)}`);
  }
  for (let i = 0; i < v.length; i += 1) {
    const problem = checkItem(v[i], `${path}[${i}]`);
    if (problem !== undefined) {
      return problem;
    }
  }
  return undefined;
};

/** An absent optional field is fine; a present one still has to be the right shape. */
const optionalAt = (v: unknown, check: () => Problem): Problem => (v === undefined ? undefined : check());

/**
 * A managed library item: metadata that identifies it, and a spec of the kind that metadata claims.
 *
 * `metadata.type` is checked against what the position expects, so a message filter saved into a
 * target slot is named as the wrong item rather than half-rendered.
 */
const managedItem = (v: unknown, path: string, itemType: ManagedItemType, checkSpec: SpecCheck): Problem => {
  const notAnItem = recordAt(v, path);
  if (notAnItem !== undefined) {
    return notAnItem;
  }
  const item = v as Record<string, unknown>;

  const metadataPath = child(path, 'metadata');
  const notMetadata = recordAt(item.metadata, metadataPath);
  if (notMetadata !== undefined) {
    return notMetadata;
  }
  const metadata = item.metadata as Record<string, unknown>;

  const badId = nonEmptyStringAt(metadata.id, `${metadataPath}.id`);
  if (badId !== undefined) {
    return badId;
  }
  if (metadata.type !== itemType) {
    return at(`${metadataPath}.type`, `expected a ${itemType}, found ${shown(metadata.type)}`);
  }

  const specPath = child(path, 'spec');
  return recordAt(item.spec, specPath) ?? checkSpec(item.spec as Record<string, unknown>, specPath);
};

/**
 * A val-or-ref wrapper: an inline value, or a reference to a library item by id.
 *
 * It must be DISCRIMINATED, not merely an object. A wrapper with no `type` resolves to neither a
 * value to render nor a reference to fetch, and the component holding it shows a spinner that
 * never ends. A `value` wrapper that also carries a `ref` says two contradictory things about
 * where the item lives, and nothing in the app produces one.
 *
 * A `reference` MAY carry a `val`: that is an edit made in the browser and not yet saved. If it is
 * there it has to be sound, because that is the copy the editor renders.
 */
const valOrRef = (v: unknown, path: string, itemType: ManagedItemType, checkSpec: SpecCheck): Problem => {
  const notAWrapper = recordAt(v, path);
  if (notAWrapper !== undefined) {
    return notAWrapper;
  }
  const wrapper = v as Record<string, unknown>;

  if (wrapper.type === 'value') {
    if (wrapper.ref !== undefined) {
      return at(path, 'a stored value also carries a library reference; it cannot be both');
    }
    return managedItem(wrapper.val, child(path, 'val'), itemType, checkSpec);
  }

  if (wrapper.type === 'reference') {
    return (
      nonEmptyStringAt(wrapper.ref, child(path, 'ref')) ??
      optionalAt(wrapper.val, () => managedItem(wrapper.val, child(path, 'val'), itemType, checkSpec))
    );
  }

  return at(child(path, 'type'), `expected "value" or "reference", found ${shown(wrapper.type)}`);
};

const messageIdSpec: SpecCheck = (spec, path) => stringAt(spec.hexString, `${path}.hexString`);

const dateTimeSpec: SpecCheck = (spec, path) =>
  spec.dateTime instanceof Date && Number.isFinite(spec.dateTime.getTime())
    ? undefined
    : at(`${path}.dateTime`, `expected a date, found ${typeName(spec.dateTime)}`);

const relativeDateTimeSpec: SpecCheck = (spec, path) =>
  numberAt(spec.value, `${path}.value`) ??
  oneOfAt(spec.unit, `${path}.unit`, dateTimeUnits) ??
  booleanAt(spec.isRoundedToUnitStart, `${path}.isRoundedToUnitStart`);

const startFromSpec: SpecCheck = (spec, path) => {
  const startFromPath = `${path}.startFrom`;
  const notAnObject = recordAt(spec.startFrom, startFromPath);
  if (notAnObject !== undefined) {
    return notAnObject;
  }
  const startFrom = spec.startFrom as Record<string, unknown>;

  switch (startFrom.type) {
    case 'earliestMessage':
    case 'latestMessage':
      return undefined;
    case 'nthMessageAfterEarliest':
    case 'nthMessageBeforeLatest':
      return numberAt(startFrom.n, `${startFromPath}.n`);
    case 'approximateEntryPosition':
    case 'approximatePublishTimePosition':
      return numberAt(startFrom.fraction, `${startFromPath}.fraction`);
    case 'messageId':
      return valOrRef(startFrom.messageId, `${startFromPath}.messageId`, 'message-id', messageIdSpec);
    case 'dateTime':
      return valOrRef(startFrom.dateTime, `${startFromPath}.dateTime`, 'date-time', dateTimeSpec);
    case 'relativeDateTime':
      return valOrRef(
        startFrom.relativeDateTime,
        `${startFromPath}.relativeDateTime`,
        'relative-date-time',
        relativeDateTimeSpec
      );
    default:
      return at(`${startFromPath}.type`, `expected a start position this build supports, found ${shown(startFrom.type)}`);
  }
};

/** The filter operator tree is its own editor's contract; here the kind of filter is the shape. */
const basicMessageFilterTargetSpec: SpecCheck = (spec, path) =>
  recordAt(spec.target, `${path}.target`) ??
  nonEmptyStringAt((spec.target as Record<string, unknown>).type, `${path}.target.type`);

const messageFilterSpec: SpecCheck = (spec, path) =>
  booleanAt(spec.isEnabled, `${path}.isEnabled`) ??
  booleanAt(spec.isNegated, `${path}.isNegated`) ??
  valOrRef(spec.targetField, `${path}.targetField`, 'basic-message-filter-target', basicMessageFilterTargetSpec) ??
  recordAt(spec.filter, `${path}.filter`) ??
  oneOfAt((spec.filter as Record<string, unknown>).type, `${path}.filter.type`, filterKinds);

const messageFilterChainSpec: SpecCheck = (spec, path) =>
  booleanAt(spec.isEnabled, `${path}.isEnabled`) ??
  booleanAt(spec.isNegated, `${path}.isNegated`) ??
  oneOfAt(spec.mode, `${path}.mode`, chainModes) ??
  listAt(spec.filters, `${path}.filters`, (filter, filterPath) =>
    valOrRef(filter, filterPath, 'message-filter', messageFilterSpec)
  );

const coloringRuleSpec: SpecCheck = (spec, path) =>
  booleanAt(spec.isEnabled, `${path}.isEnabled`) ??
  stringAt(spec.foregroundColor, `${path}.foregroundColor`) ??
  stringAt(spec.backgroundColor, `${path}.backgroundColor`) ??
  valOrRef(spec.messageFilterChain, `${path}.messageFilterChain`, 'message-filter-chain', messageFilterChainSpec);

const coloringRuleChainSpec: SpecCheck = (spec, path) =>
  booleanAt(spec.isEnabled, `${path}.isEnabled`) ??
  listAt(spec.coloringRules, `${path}.coloringRules`, (rule, rulePath) =>
    valOrRef(rule, rulePath, 'coloring-rule', coloringRuleSpec)
  );

const valueProjectionSpec: SpecCheck = (spec, path) =>
  booleanAt(spec.isEnabled, `${path}.isEnabled`) ??
  stringAt(spec.shortName, `${path}.shortName`) ??
  optionalAt(spec.width, () => numberAt(spec.width, `${path}.width`)) ??
  valOrRef(spec.target, `${path}.target`, 'basic-message-filter-target', basicMessageFilterTargetSpec);

const valueProjectionListSpec: SpecCheck = (spec, path) =>
  booleanAt(spec.isEnabled, `${path}.isEnabled`) ??
  listAt(spec.projections, `${path}.projections`, (projection, projectionPath) =>
    valOrRef(projection, projectionPath, 'value-projection', valueProjectionSpec)
  );

const consumerSessionEventSpec: SpecCheck = (spec, path) =>
  recordAt(spec.event, `${path}.event`) ??
  nonEmptyStringAt((spec.event as Record<string, unknown>).type, `${path}.event.type`);

const pauseTriggerChainSpec: SpecCheck = (spec, path) =>
  oneOfAt(spec.mode, `${path}.mode`, chainModes) ??
  listAt(spec.events, `${path}.events`, (event, eventPath) =>
    valOrRef(event, eventPath, 'consumer-session-event', consumerSessionEventSpec)
  );

const topicSelectorSpec: SpecCheck = (spec, path) => {
  const selectorPath = `${path}.topicSelector`;
  const notAnObject = recordAt(spec.topicSelector, selectorPath);
  if (notAnObject !== undefined) {
    return notAnObject;
  }
  const selector = spec.topicSelector as Record<string, unknown>;

  switch (selector.type) {
    case 'current-topic':
      return undefined;
    case 'multi-topic-selector':
      return listAt(selector.topicFqns, `${selectorPath}.topicFqns`, nonEmptyStringAt);
    case 'namespaced-regex-topic-selector':
      return (
        nonEmptyStringAt(selector.namespaceFqn, `${selectorPath}.namespaceFqn`) ??
        stringAt(selector.pattern, `${selectorPath}.pattern`) ??
        oneOfAt(selector.regexSubscriptionMode, `${selectorPath}.regexSubscriptionMode`, regexSubscriptionModes)
      );
    default:
      return at(`${selectorPath}.type`, `expected a topic selector this build supports, found ${shown(selector.type)}`);
  }
};

const deserializerSpec: SpecCheck = (spec, path) => {
  const deserializerPath = `${path}.deserializer`;
  const notAnObject = recordAt(spec.deserializer, deserializerPath);
  if (notAnObject !== undefined) {
    return notAnObject;
  }
  const deserializer = spec.deserializer as Record<string, unknown>;

  return (
    oneOfAt(deserializer.type, `${deserializerPath}.type`, ['deserializer']) ??
    recordAt(deserializer.deserializer, `${deserializerPath}.deserializer`) ??
    oneOfAt(
      (deserializer.deserializer as Record<string, unknown>).type,
      `${deserializerPath}.deserializer.type`,
      deserializerKinds
    )
  );
};

/** Not a library item of its own - the consumption mode is stored inline in the target spec. */
const consumptionModeAt = (v: unknown, path: string): Problem => {
  const notAnObject = recordAt(v, path);
  if (notAnObject !== undefined) {
    return notAnObject;
  }
  const mode = v as Record<string, unknown>;

  return (
    oneOfAt(mode.type, `${path}.type`, ['consumer-session-target-consumption-mode']) ??
    recordAt(mode.mode, `${path}.mode`) ??
    oneOfAt((mode.mode as Record<string, unknown>).type, `${path}.mode.type`, consumptionModes)
  );
};

const targetSpec: SpecCheck = (spec, path) =>
  booleanAt(spec.isEnabled, `${path}.isEnabled`) ??
  consumptionModeAt(spec.consumptionMode, `${path}.consumptionMode`) ??
  valOrRef(spec.messageValueDeserializer, `${path}.messageValueDeserializer`, 'deserializer', deserializerSpec) ??
  valOrRef(spec.topicSelector, `${path}.topicSelector`, 'topic-selector', topicSelectorSpec) ??
  valOrRef(spec.messageFilterChain, `${path}.messageFilterChain`, 'message-filter-chain', messageFilterChainSpec) ??
  valOrRef(spec.coloringRuleChain, `${path}.coloringRuleChain`, 'coloring-rule-chain', coloringRuleChainSpec) ??
  valOrRef(spec.valueProjectionList, `${path}.valueProjectionList`, 'value-projection-list', valueProjectionListSpec);

const configSpec: SpecCheck = (spec, path) => {
  const targetsPath = `${path}.targets`;

  return (
    listAt(spec.targets, targetsPath, (target, targetPath) =>
      valOrRef(target, targetPath, 'consumer-session-target', targetSpec)
    ) ??
    // A session with no target consumes from nothing. The server refuses it outright, so accepting
    // it here only buys a Play button that starts a session which can never deliver a message.
    ((spec.targets as unknown[]).length === 0
      ? at(targetsPath, 'expected at least one target; a session with no target has nothing to consume')
      : undefined) ??
    valOrRef(spec.startFrom, `${path}.startFrom`, 'consumer-session-start-from', startFromSpec) ??
    valOrRef(spec.messageFilterChain, `${path}.messageFilterChain`, 'message-filter-chain', messageFilterChainSpec) ??
    valOrRef(spec.coloringRuleChain, `${path}.coloringRuleChain`, 'coloring-rule-chain', coloringRuleChainSpec) ??
    valOrRef(spec.valueProjectionList, `${path}.valueProjectionList`, 'value-projection-list', valueProjectionListSpec) ??
    valOrRef(
      spec.pauseTriggerChain,
      `${path}.pauseTriggerChain`,
      'consumer-session-pause-trigger-chain',
      pauseTriggerChainSpec
    ) ??
    // The VALUE range is sanitized downstream by displayItemLimit - only a non-number is a shape
    // error here, because that is what no reader of this field can recover from.
    optionalAt(spec.numDisplayItems, () => numberAt(spec.numDisplayItems, `${path}.numDisplayItems`)) ??
    optionalAt(spec.messageDeliveryOrder, () =>
      oneOfAt(spec.messageDeliveryOrder, `${path}.messageDeliveryOrder`, deliveryOrders)
    ) ??
    optionalAt(spec.deliveryOrderKey, () => oneOfAt(spec.deliveryOrderKey, `${path}.deliveryOrderKey`, deliveryOrderKeys))
  );
};

/** Decode a saved library item as a consumer session configuration, or say exactly why it is not one. */
export function decodeConsumerSessionConfig(item: unknown): ConfigDecodeResult {
  const problem = managedItem(item, '', 'consumer-session-config', configSpec);

  return problem === undefined
    ? { ok: true, item: item as ManagedConsumerSessionConfig }
    : { ok: false, problem };
}
