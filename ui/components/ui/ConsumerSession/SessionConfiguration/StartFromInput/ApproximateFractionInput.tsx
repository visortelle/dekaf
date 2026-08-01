import React, { useEffect, useState } from 'react';
import s from './StartFromInput.module.css';
import Input from '../../../Input/Input';
import { fractionFromPercent, percentFromFraction } from './approximate-fraction';

export type ApproximateFractionInputProps = {
  /** The stored proportion, in [0, 1]. What it is a proportion OF is the mode's business, not this
   * control's - it edits a percentage either way. */
  fraction: number;
  onChange: (fraction: number) => void;
  /**
   * Test-id prefix identifying WHICH mode this instance is editing, e.g. `cs-start-from-data` ->
   * `cs-start-from-data-fraction`. Both modes render the same control, so one shared id would let a
   * test drive one and assert the other.
   */
  testIdPrefix: string;
  disabled?: boolean;
  isReadOnly?: boolean;
};

/**
 * Percentage editor shared by the two approximate start-from modes: a slider for the coarse move
 * and a number field for an exact value.
 *
 * The typed text is kept in local state rather than derived from `fraction` on every render, so an
 * in-progress or invalid entry stays on screen (and stays correctable) without ever being committed
 * to the session config.
 */
const ApproximateFractionInput: React.FC<ApproximateFractionInputProps> = (props) => {
  const [draft, setDraft] = useState<string>(() => percentFromFraction(props.fraction));

  // Adopt a fraction that changed elsewhere (the slider, or a library item that resolved), but leave
  // a draft that already means the same value alone - re-deriving it would eat a trailing '.' and
  // make "60.5" untypeable.
  useEffect(() => {
    if (fractionFromPercent(draft) !== props.fraction) {
      setDraft(percentFromFraction(props.fraction));
    }
  }, [props.fraction]);

  const onDraftChange = (v: string) => {
    setDraft(v);

    const fraction = fractionFromPercent(v);
    if (fraction !== undefined) {
      props.onChange(fraction);
    }
  };

  const isInvalid = fractionFromPercent(draft) === undefined;
  const sliderPercent = Number(percentFromFraction(props.fraction)) || 0;

  return (
    <div className={s.ApproximateFraction}>
      <input
        className={s.ApproximateFractionSlider}
        data-testid={`${props.testIdPrefix}-fraction-slider`}
        type="range"
        min={0}
        max={100}
        step={1}
        value={sliderPercent}
        disabled={props.disabled || props.isReadOnly}
        onChange={(e) => props.onChange(fractionFromPercent(e.target.value) ?? props.fraction)}
      />
      <div className={s.ApproximateFractionValue}>
        <Input
          testId={`${props.testIdPrefix}-fraction`}
          value={draft}
          type="number"
          onChange={onDraftChange}
          isError={isInvalid}
          inputProps={{ disabled: props.disabled, min: 0, max: 100, step: 'any' }}
          placeholder="0-100"
          isReadOnly={props.isReadOnly}
        />
        <div className={s.ApproximateFractionUnit}>%</div>
      </div>
      {isInvalid && (
        <div className={s.ApproximateFractionError} data-testid={`${props.testIdPrefix}-fraction-error`}>
          {/* A refused entry does not undo the last valid one, so Play would start from THAT while
              the box shows something else. Saying which percentage that is turns a silent
              difference into a visible one. */}
          Enter a percentage between 0 and 100. The session still uses {percentFromFraction(props.fraction)}%.
        </div>
      )}
    </div>
  );
};

export default ApproximateFractionInput;
