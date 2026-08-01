/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The two approximate start-from modes - "about % through the data" and "about % through the time
 * range" - each have to survive four separate hand-written mappings: the library spec <-> protobuf
 * pair (persisted saved sessions), the managed-item -> runtime conversion, and the runtime ->
 * protobuf conversion that actually reaches the server. Each one is a `switch` over the mode union;
 * a missing branch there is either a thrown "Unknown ..." at runtime or a setting that is silently
 * dropped on the way to Pulsar, so all four are pinned here for both modes.
 *
 * THE TRAP THIS FILE EXISTS FOR, now that there are two of them: their payloads are identical - one
 * double - so a branch that reaches for the other mode's oneof case still produces a valid-looking
 * fraction. Every assertion below therefore names the WIRE FIELD as well as the value; a test that
 * only checked the fraction would pass while the server positioned the session by the wrong rule.
 *
 * jsdom + the mocks below: these conversions sit in a module graph that reaches components, and from
 * there the ESM-only mermaid/nanoid, which jest does not transform. Neither is exercised.
 */
jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: () => undefined } }));
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/library/v1/managed_items_pb';
import * as consumerPb from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import {
  managedConsumerSessionStartFromSpecFromPb,
  managedConsumerSessionStartFromSpecToPb,
} from './user-managed-items-conversions-pb';
import { consumerSessionStartFromFromValOrRef } from './resolved-items-conversions';
import { startFromFromPb, startFromToPb } from '../../ConsumerSession/conversions/conversions';

type Mode = 'approximateDataPosition' | 'approximateTimePosition';

const managedSpec = (type: Mode, fraction: number) => ({ startFrom: { type, fraction } as const });

// NOTE: nothing in this file may put an imported binding in a TYPE position - esbuild-jest runs it
// through babel, which refuses that outright ("Cannot transform the imported binding ... since it's
// also used in a type annotation"). Hence the plain value tables below and the inline getters, in
// place of the helper functions that would otherwise need the pb message types by name.

/** The library oneof case each mode must occupy. */
const managedExpectedCase = {
  approximateDataPosition: pb.ManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_APPROXIMATE_DATA_POSITION,
  approximateTimePosition: pb.ManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_APPROXIMATE_TIME_POSITION,
} satisfies Record<Mode, unknown>;

/** The same, for the runtime start-from that reaches the server. */
const runtimeExpectedCase = {
  approximateDataPosition: consumerPb.ConsumerSessionStartFrom.StartFromCase.START_FROM_APPROXIMATE_DATA_POSITION,
  approximateTimePosition: consumerPb.ConsumerSessionStartFrom.StartFromCase.START_FROM_APPROXIMATE_TIME_POSITION,
} satisfies Record<Mode, unknown>;

const modes: Mode[] = ['approximateDataPosition', 'approximateTimePosition'];

describe.each(modes)('%s: library spec <-> protobuf', (mode) => {
  it('round-trips through the persisted library representation, in its OWN oneof case', () => {
    const specPb = managedConsumerSessionStartFromSpecToPb(managedSpec(mode, 0.6));

    // The oneof must actually be set to this mode's case - an unset oneof would serialize to nothing
    // and read back as "Unknown ManagedConsumerSessionStartFromSpec", and the OTHER mode's case
    // would read back as the wrong mode with the right number.
    expect(specPb.getStartFromCase()).toBe(managedExpectedCase[mode]);
    const fraction = mode === 'approximateDataPosition'
      ? specPb.getStartFromApproximateDataPosition()?.getFraction()
      : specPb.getStartFromApproximateTimePosition()?.getFraction();
    expect(fraction).toBe(0.6);

    expect(managedConsumerSessionStartFromSpecFromPb(specPb)).toEqual(managedSpec(mode, 0.6));
  });

  it('round-trips through a real serialize/deserialize cycle, like a saved session does', () => {
    const bytes = managedConsumerSessionStartFromSpecToPb(managedSpec(mode, 0.125)).serializeBinary();
    const decoded = pb.ManagedConsumerSessionStartFromSpec.deserializeBinary(bytes);

    expect(managedConsumerSessionStartFromSpecFromPb(decoded)).toEqual(managedSpec(mode, 0.125));
  });

  it('keeps the boundary values distinguishable from an unset field', () => {
    // 0.0 is the earliest retained message and is a legal, meaningful value - but it is also the
    // protobuf default for a double, so it only survives because the WRAPPER message is set.
    const zeroPb = managedConsumerSessionStartFromSpecToPb(managedSpec(mode, 0));
    const zeroDecoded = pb.ManagedConsumerSessionStartFromSpec.deserializeBinary(zeroPb.serializeBinary());
    expect(managedConsumerSessionStartFromSpecFromPb(zeroDecoded)).toEqual(managedSpec(mode, 0));

    const onePb = managedConsumerSessionStartFromSpecToPb(managedSpec(mode, 1));
    expect(managedConsumerSessionStartFromSpecFromPb(onePb)).toEqual(managedSpec(mode, 1));
  });
});

describe.each(modes)('%s: managed item -> runtime start-from', (mode) => {
  it('resolves to the runtime mode instead of falling off the switch', () => {
    const valOrRef = {
      type: 'value' as const,
      val: {
        metadata: { id: 'x', name: '', descriptionMarkdown: '', type: 'consumer-session-start-from' as const },
        spec: managedSpec(mode, 0.42),
      },
    };

    expect(consumerSessionStartFromFromValOrRef(valOrRef)).toEqual({ type: mode, fraction: 0.42 });
  });
});

describe.each(modes)('%s: runtime start-from <-> protobuf', (mode) => {
  it('reaches the server in its own oneof case', () => {
    const startFromPb = startFromToPb({ type: mode, fraction: 0.6 });

    expect(startFromPb.getStartFromCase()).toBe(runtimeExpectedCase[mode]);
    const fraction = mode === 'approximateDataPosition'
      ? startFromPb.getStartFromApproximateDataPosition()?.getFraction()
      : startFromPb.getStartFromApproximateTimePosition()?.getFraction();
    expect(fraction).toBe(0.6);
  });

  it('reads back from the wire', () => {
    const bytes = startFromToPb({ type: mode, fraction: 0.75 }).serializeBinary();
    const decoded = consumerPb.ConsumerSessionStartFrom.deserializeBinary(bytes);

    expect(startFromFromPb(decoded)).toEqual({ type: mode, fraction: 0.75 });
  });
});

describe('the two modes are not interchangeable', () => {
  it('sets a different wire field for each, at both layers', () => {
    // Stated as an inequality as well, so that a future edit which points both mappings at one field
    // fails here even if each mode's own round trip is self-consistent.
    expect(runtimeExpectedCase.approximateDataPosition).not.toBe(runtimeExpectedCase.approximateTimePosition);
    expect(managedExpectedCase.approximateDataPosition).not.toBe(managedExpectedCase.approximateTimePosition);

    const dataPb = startFromToPb({ type: 'approximateDataPosition', fraction: 0.6 });
    const timePb = startFromToPb({ type: 'approximateTimePosition', fraction: 0.6 });
    expect(dataPb.getStartFromCase()).not.toBe(timePb.getStartFromCase());
    // ...and neither one leaves a value in the other's field.
    expect(dataPb.getStartFromApproximateTimePosition()).toBeUndefined();
    expect(timePb.getStartFromApproximateDataPosition()).toBeUndefined();
  });
});
