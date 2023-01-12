import { divide } from 'lodash';
import React from 'react';
import A from '../../../../../ui/A/A';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Input from '../../../../../ui/Input/Input';
import Select from '../../../../../ui/Select/Select';
import { CsvConfig } from '../types';
import s from './CsvConfigInput.module.css'

export type CsvConfigInputProps = {
  value: CsvConfig,
  onChange: (v: CsvConfig) => void,
};

const badDelimiters = [`\r`, `\n`, `"`, `\ufeff`];

const CsvConfigInput: React.FC<CsvConfigInputProps> = (props) => {
  return (
    <div className={s.CsvConfigInput}>
      <FormItem>
        <FormLabel content="Quotes" help={(
          <div>
            If <code>True</code>, forces all fields to be enclosed in quotes.
            Note that this option is ignored for undefined, null and date-object values.
            The option <strong>Escape formula expression</strong> also takes precedence over this.
          </div>
        )}
        />
        <Select<'true' | 'false'>
          list={[
            { type: 'item', value: 'true', title: 'True' },
            { type: 'item', value: 'false', title: 'False' },
          ]}
          onChange={(v) => props.onChange({ ...props.value, quotes: v === 'true' })}
          value={props.value.quotes ? 'true' : 'false'}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="Quote char" help="The character used to quote fields." />
        <Input
          value={props.value.quoteChar}
          onChange={(v) => props.onChange({ ...props.value, quoteChar: v[0] })}
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Escape char"
          help={(<div>The character used to escape <strong>Quota char</strong> inside field values.</div>)}
        />
        <Input
          value={props.value.escapeChar}
          onChange={(v) => props.onChange({ ...props.value, escapeChar: v[0] })}
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Delimiter"
          help={(
            <>
              <div>The delimiting character. Multi-character delimiters are supported.</div>
              <div>Can't contain the following characters: {badDelimiters.map(d => <code>{d}</code>)}</div>
            </>
          )}
        />
        <Input
          value={props.value.delimiter}
          onChange={(v) => {
            props.onChange({ ...props.value, delimiter: v.split('').filter(d => !badDelimiters.includes(d)).join('') });
          }}
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Header"
          help="Add header row to CSV output."
        />
        <Select
          list={[
            { type: 'item', value: 'true', title: 'True' },
            { type: 'item', value: 'false', title: 'False' },
          ]}
          value={props.value.header ? 'true' : 'false'}
          onChange={(v) => props.onChange({ ...props.value, header: v === 'true' })}
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="New line"
          help="The character used to determine newline sequence."
        />
        <Input value={props.value.newline} onChange={(v) => props.onChange({ ...props.value, newline: v })} />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Escape formula expression"
          help={(
            <div>
              If true, field values that begin with <code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>, <code>\t</code>,
              or <code>\r</code>, will be prepended with a <code>'</code> to defend against <A isExternalLink href="https://owasp.org/www-community/attacks/CSV_Injection">injection attacks</A>,
              because Excel and LibreOffice will automatically parse such cells as formulae.
              You can override those values by setting this option to a regular expression.
            </div>
          )}
        />
        <FormItem>
          <Select<CsvConfig['escapeFormulae']['type']>
            list={[
              { type: 'item', value: 'true', title: 'True' },
              { type: 'item', value: 'false', title: 'False' },
              { type: 'item', value: 'regex', title: 'Regex' },
            ]}
            onChange={(v) => {
              if (v === 'regex') {
                props.onChange({ ...props.value, escapeFormulae: { type: v, regex: '^[=+\-@\t\r].*$' } });
                return;
              }

              props.onChange({ ...props.value, escapeFormulae: { type: v } })
            }}
            value={props.value.escapeFormulae.type}
          />
        </FormItem>
        <FormItem>
          {props.value.escapeFormulae.type === 'regex' && (
            <Input
              value={props.value.escapeFormulae.regex}
              onChange={(v) => props.onChange({ ...props.value, escapeFormulae: { type: 'regex', regex: v } })}
            />
          )}
        </FormItem>
      </FormItem>
    </div>
  );
}

export default CsvConfigInput;
