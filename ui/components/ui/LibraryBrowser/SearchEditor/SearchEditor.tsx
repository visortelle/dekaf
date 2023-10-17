import React from 'react';
import s from './SearchEditor.module.css'
import UserManagedItemTypePicker from './UserManagedItemTypePicker/UserManagedItemTypePicker';
import { UserManagedItemType } from '../model/user-managed-items';
import FormItem from '../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { ResourceMatcher } from '../model/resource-matchers';
import { H3 } from '../../H/H';
import TagsPicker from './TagsPicker/TagsPicker';
import ResourceMatchersInput from './ResourceMatchersInput/ResourceMatchersInput';
import { LibraryContext } from '../model/library-context';

type SearchEditorMode = {
  type: 'edit';
  value: SearchEditorValue;
  onChange: (value: SearchEditorValue) => void;
} | {
  type: 'readonly';
  value: SearchEditorValue;
}

export type SearchEditorValue = {
  itemType: UserManagedItemType;
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
          <UserManagedItemTypePicker
            value={props.mode.value.itemType}
            onChange={(v) => {
              if (props.mode.type === 'readonly') {
                return;
              }
              props.mode.onChange({ ...props.mode.value, itemType: v });
            }}
            readOnly={props.mode.type === 'readonly'}
          />
        </FormItem>

        <br />

        <FormItem>
          <FormLabel
            content={<H3>Tags</H3>}
            help={(
              <>
                Each library item can be tagged with one or more tags. Tags are used to organize library items into different groups.
                <br />
                <br />
                Examples:
                <ul>
                  <li><code>PROJ-X Infographic</code></li>
                  <li><code>PROJ-X Debug</code></li>
                  <li><code>Test</code></li>
                  <li><code>Elon Musk's Personal Collection</code></li>
                </ul>
              </>
            )}
          />

          <TagsPicker
            mode='edit'
            onChange={(v) => {
              if (props.mode.type === 'readonly') {
                return;
              }

              props.mode.onChange({ ...props.mode.value, tags: v });
            }}
            value={props.mode.value.tags}
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
              if (props.mode.type === 'readonly') {
                return;
              }

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
