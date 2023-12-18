import React from 'react';
import s from './SearchEditor.module.css'
import ManagedItemTypePicker from './ManagedItemTypePicker/ManagedItemTypePicker';
import { ManagedItemType } from '../model/user-managed-items';
import FormItem from '../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { ResourceMatcher } from '../model/resource-matchers';
import { H3 } from '../../H/H';
import ResourceMatchersInput from './ResourceMatchersInput/ResourceMatchersInput';
import { LibraryContext } from '../model/library-context';

type SearchEditorMode = {
  type: 'edit';
  value: SearchEditorValue;
  onChange: (value: SearchEditorValue) => void;
} | {
  type: 'search';
  value: SearchEditorValue;
  onChange: (value: SearchEditorValue) => void;
}

export type SearchEditorValue = {
  itemType: ManagedItemType;
  resourceMatchers: ResourceMatcher[];
  tags: string[];
}

export type SearchEditorProps = {
  mode: SearchEditorMode;
  libraryContext: LibraryContext;
};

const SearchEditor: React.FC<SearchEditorProps> = (props) => {
  return (
    <div className={s.SearchEditor}>
      <div className={s.Content}>
        <FormItem>
          <FormLabel
            content={<H3>Type</H3>}
            help={"Library item type."}
          />
          <ManagedItemTypePicker
            value={props.mode.value.itemType}
            onChange={(v) => {
              if (props.mode.type === 'search') {
                return;
              }
              props.mode.onChange({ ...props.mode.value, itemType: v });
            }}
            readOnly={true}
          />
        </FormItem>

        <br />

        <FormItem>
          <FormLabel
            content={<H3>Pulsar Resources</H3>}
            help={
              <>
                Pulsar resources this item is available for.
                <br />
                <br />
                For example, a message filter may work well for topics <code>A</code> and <code>B</code>, but it may not make sense at all for topic <code>C</code> due to schema differences.
              </>
            }
          />
          <ResourceMatchersInput
            value={props.mode.value.resourceMatchers}
            onChange={(v) => {
              props.mode.onChange({ ...props.mode.value, resourceMatchers: v })
            }}
            libraryContext={props.libraryContext}
          />
        </FormItem>
      </div>
    </div>
  );
}

export default SearchEditor;
