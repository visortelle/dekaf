import React, { useEffect, useState } from 'react';
import s from './SessionConfiguration.module.css';
import Input from '../../Input/Input';
import { numDisplayItemsFromText } from './display-items';

export type NumDisplayItemsInputProps = {
  /** The committed limit - how many messages a session started right now would keep on screen. */
  value: number;
  onChange: (value: number) => void;
  isReadOnly?: boolean;
};

/**
 * How many messages the session keeps on screen.
 *
 * The typed text is kept in local state rather than derived from the committed limit on every
 * render, so an in-progress or refused entry stays on screen (and stays correctable) without ever
 * becoming the limit. Clearing the field to retype it is the ordinary case, and it used to commit
 * `Number('')` - zero - which turns the retention `slice(-limit)` into "keep everything" and leaves
 * the buffer growing until the tab dies.
 */
const NumDisplayItemsInput: React.FC<NumDisplayItemsInputProps> = (props) => {
  const [draft, setDraft] = useState<string>(() => String(props.value));

  // Adopt a limit that changed elsewhere (the toggle, a library item that resolved), but leave a
  // draft that already means the same number alone.
  useEffect(() => {
    if (numDisplayItemsFromText(draft) !== props.value) {
      setDraft(String(props.value));
    }
  }, [props.value]);

  const onDraftChange = (v: string) => {
    setDraft(v);

    const value = numDisplayItemsFromText(v);
    if (value !== undefined) {
      props.onChange(value);
    }
  };

  const isInvalid = numDisplayItemsFromText(draft) === undefined;

  return (
    <div>
      <Input
        testId="cs-num-display-items"
        type="number"
        value={draft}
        size='small'
        onChange={onDraftChange}
        isError={isInvalid}
        inputProps={{ min: 1, step: 1 }}
        isReadOnly={props.isReadOnly}
      />
      {isInvalid && (
        <div className={s.FieldError} data-testid="cs-num-display-items-error">
          {/* A refused entry does not undo the last valid one, so the session still keeps THAT
              many - saying which turns a silent difference into a visible one. */}
          Enter a whole number of messages, 1 or more. The session still keeps {props.value}.
        </div>
      )}
    </div>
  );
};

export default NumDisplayItemsInput;
