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
      </div>
    </div>
  );
}

export default SearchEditor;
