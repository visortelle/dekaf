import React from 'react';
import s from './LibraryBrowserPanel.module.css'
import LibraryBrowserButtons from './LibraryBrowserButtons/LibraryBrowserButtons';
import { ManagedItem, ManagedItemType } from '../model/user-managed-items';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { help } from './help';
import { useHover } from '../../../app/hooks/use-hover';
import { LibraryContext } from '../model/library-context';
import SvgIcon from '../../SvgIcon/SvgIcon';
import referenceIcon from './icons/reference.svg';
import { tooltipId } from '../../Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Notifications from '../../../app/contexts/Notifications';
import MarkdownInput from '../../MarkdownInput/MarkdownInput';
import { cloneDeep } from 'lodash';
import LibraryItemName from './LibraryItemName/LibraryItemName';
import DeleteButton from '../../DeleteButton/DeleteButton';

export type HidableElement = 'save-button';

export type LibraryBrowserPanelProps = {
  itemType: ManagedItemType;
  value: ManagedItem;
  onSave: (item: ManagedItem) => void;
  onChange: (item: ManagedItem) => void;
  onPick: (item: ManagedItem) => void;
  libraryContext: LibraryContext;
  hiddenElements?: HidableElement[];
  isForceShowButtons?: boolean;
  managedItemReference?: {
    id: string;
    onConvertToValue: () => void;
  };
  extraElements?: {
    preItemType?: React.ReactElement,
    postItemType?: React.ReactElement,
  },
  isReadOnly?: boolean
};

const LibraryBrowserPanel: React.FC<LibraryBrowserPanelProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const { notifySuccess } = Notifications.useContext();

  return (
    <div className={s.LibraryBrowserPanel} ref={hoverRef}>
      <div style={{ display: 'inline-flex', position: 'relative' }}>
        <FormLabel
          content={(
            <div style={{ display: 'flex', gap: '8rem' }}>
              {props.extraElements?.preItemType}
              <strong>
                {props.itemType === 'consumer-session-config' && 'Consumer Session Config'}
                {props.itemType === 'message-filter' && 'Filter'}
                {props.itemType === 'message-filter-chain' && ' Filter Chain'}
                {props.itemType === 'consumer-session-start-from' && 'Start From'}
                {props.itemType === 'topic-selector' && 'Topic Selector'}
                {props.itemType === 'consumer-session-target' && 'Consumer Target'}
                {props.itemType === 'coloring-rule' && 'Coloring Rule'}
                {props.itemType === 'coloring-rule-chain' && 'Coloring Rule Chain'}
                {props.itemType === 'markdown-document' && 'Markdown Document'}
              </strong>
            </div>
          )}
          help={(
            <div>
              {props.itemType === 'consumer-session-config' && help.consumerSessionConfig}
              {props.itemType === 'message-filter' && help.messageFilter}
              {props.itemType === 'message-filter-chain' && help.messageFilterChain}
              {props.itemType === 'consumer-session-start-from' && help.consumerSessionStartFrom}
              {props.itemType === 'topic-selector' && help.topicSelector}
              {props.itemType === 'consumer-session-target' && help.consumerSessionTarget}
              {props.itemType === 'coloring-rule' && help.coloringRule}
              {props.itemType === 'coloring-rule-chain' && help.coloringRuleChain}
              {props.itemType === 'markdown-document' && help.markdownDocument}
            </div>
          )}
        />
        {props.managedItemReference && (
          <div
            className={s.ReferenceIcon}
            onClick={() => {
              if (props.isReadOnly) {
                return;
              }

              notifySuccess(<>The referenced library item were stored as a part of the parent item value.<br />You can now modify it without affecting other items that use it.</>);
              props.managedItemReference?.onConvertToValue()
            }}
            data-tooltip-id={tooltipId}
            data-tooltip-html={renderToStaticMarkup(<>
              <p>
                This is a reference to a library item with ID:
                <br />
                <strong>{props.managedItemReference.id}</strong>.
              </p>
              <p>
                That means that if you modify the item and save it, the changes will apply to all other items that use it.
                <br />
                This feature is particularly useful for reusing the same item across other items.
                <br />
              </p>
              <p>
                To modify the referenced item without affecting others, you should convert it to a value. Doing so will create a copy that is stored within the parent item.
                <br />
                <strong>Click on the icon to covert it to value.</strong>
              </p>
            </>)}
          >
            <SvgIcon svg={referenceIcon} />
          </div>
        )}
        {(!props.isReadOnly && (isHovered || props.isForceShowButtons)) && (
          <div className={s.Buttons}>
            <LibraryBrowserButtons
              itemType={props.itemType}
              value={props.value}
              onPick={props.onPick}
              onChange={props.onChange}
              onSave={props.onSave}
              libraryContext={props.libraryContext}
              isReadOnly={props.isReadOnly}
              hiddenElements={props.hiddenElements}
            />

            <div className={s.PostItemType}>
              {props.extraElements?.postItemType}
            </div>
          </div>
        )}
      </div>

      {(props.value.metadata.name.length !== 0 || props.value.metadata.descriptionMarkdown.length !== 0) && (
        <div className={s.ItemNameAndDescription}>
          {props.value.metadata.name.length !== 0 && (
            <div className={s.ItemName}>
              <LibraryItemName
                value={props.value.metadata.name}
                onChange={(v) => {
                  const newValue = cloneDeep(props.value);
                  newValue.metadata.name = v;

                  props.onChange(newValue);
                }}
                isReadOnly={props.isReadOnly}
              />
            </div>
          )}
          {props.value.metadata.descriptionMarkdown.length !== 0 && (
            <div className={s.ItemDescription}>
              <MarkdownInput
                value={props.value.metadata.descriptionMarkdown}
                onChange={(v) => {
                  const newValue = cloneDeep(props.value);
                  newValue.metadata.descriptionMarkdown = v;

                  props.onChange(newValue);
                }}
                maxHeight={160}
              />
              <div className={s.RemoveDescriptionButton}>
                <DeleteButton
                  appearance='borderless-semitransparent'
                  isHideText
                  onClick={() => {
                    const newValue = cloneDeep(props.value);
                    newValue.metadata.descriptionMarkdown = '';

                    props.onChange(newValue);
                  }}
                  title="Remove library item description"
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default LibraryBrowserPanel;
