import React from 'react';
import s from './SearchEditor.module.css'
import LibraryItemTypePicker from './LibraryItemTypePicker/LibraryItemTypePicker';
import { LibraryItemType } from '../types';
import FormItem from '../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import ResourceMatcher, { ResourceMatcherValue } from './ResourceMatcher/ResourceMatcher';
import { H2, H3 } from '../../H/H';

type SearchEditorMode = {
  type: 'edit';
  value: SearchEditorValue;
  onChange: (value: SearchEditorValue) => void;
} | {
  type: 'readonly';
  value: SearchEditorValue;
}

export type SearchEditorValue = {
  itemType: LibraryItemType;
  resourceMatcher: ResourceMatcherValue;
}

export type MatchEditorProps = {
  mode: SearchEditorMode;
};

const MatchEditor: React.FC<MatchEditorProps> = (props) => {
  return (
    <div className={s.SearchEditor}>
      <H2>Search</H2>
      <br />

      <div>
        <div className={s.LeftColumn}>
          <FormItem>
            <FormLabel content={<H3>Library Item Type</H3>} />
            <LibraryItemTypePicker
              value={props.mode.value.itemType}
              onChange={(v) => {
                if (props.mode.type === 'readonly') {
                  return;
                }
                props.mode.onChange({ ...props.mode.value, itemType: v });
              }}
              disabled={props.mode.type === 'readonly'}
            />
          </FormItem>

          <br />

          <FormItem>
            <FormLabel content={<H3>Pulsar Resources</H3>} />
            <ResourceMatcher
              value={props.mode.value.resourceMatcher}
              onChange={(v) => {
                if (props.mode.type === 'readonly') {
                  return;
                }
                props.mode.onChange({ ...props.mode.value, resourceMatcher: v })
              }}
            />
          </FormItem>
        </div>
        <div className={s.RightColumn}>

        </div>
      </div>
    </div>
  );
}

export default MatchEditor;
