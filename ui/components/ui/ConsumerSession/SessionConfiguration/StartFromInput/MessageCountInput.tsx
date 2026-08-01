import React, { useEffect, useState } from 'react';
import s from './StartFromInput.module.css';
import Input from '../../../Input/Input';
import { messageCountFromText } from './message-count';

export type MessageCountInputProps = {
  /** The committed count - what a session started right now would use. */
  n: number;
  onChange: (n: number) => void;
  /** The largest count THIS mode's server side can answer, where it has one. */
  max?: number;
  disabled?: boolean;
  isReadOnly?: boolean;
};

/**
 * The message count shared by "Skip first n messages" and "Latest n messages".
 *
 * The typed text is kept in local state rather than derived from `n` on every render, so an
 * in-progress or invalid entry stays on screen (and stays correctable) without ever being committed
 * to the session config - clearing the field to retype it is the ordinary case, and it used to
 * commit NaN on the way through.
 */
const MessageCountInput: React.FC<MessageCountInputProps> = (props) => {
  const [draft, setDraft] = useState<string>(() => String(props.n));

  // Adopt a count that changed elsewhere (a library item that resolved, a mode switch), but leave a
  // draft that already means the same number alone.
  useEffect(() => {
    if (messageCountFromText(draft, props.max) !== props.n) {
      setDraft(String(props.n));
    }
  }, [props.n]);

  const onDraftChange = (v: string) => {
    setDraft(v);

    const count = messageCountFromText(v, props.max);
    if (count !== undefined) {
      props.onChange(count);
    }
  };

  const isInvalid = messageCountFromText(draft, props.max) === undefined;

  return (
    <div className={s.MessageCount}>
      <Input
        testId="cs-start-from-n"
        value={draft}
        type="number"
        onChange={onDraftChange}
        isError={isInvalid}
        inputProps={{ disabled: props.disabled, min: 0, max: props.max, step: 1 }}
        placeholder="n"
        isReadOnly={props.isReadOnly}
      />
      {isInvalid && (
        <div className={s.ApproximateFractionError} data-testid="cs-start-from-n-error">
          {/* A refused entry does not undo the last valid one, so Play would start from THAT. Saying
              which number that is turns a silent difference into a visible one - and where the mode
              has a ceiling, saying what it is turns "wrong" into something correctable. */}
          {props.max === undefined
            ? <>Enter a whole number of messages, 0 or more. The session still uses {props.n}.</>
            : <>Enter a whole number of messages from 0 to {props.max}. The session still uses {props.n}.</>}
        </div>
      )}
    </div>
  );
};

export default MessageCountInput;
