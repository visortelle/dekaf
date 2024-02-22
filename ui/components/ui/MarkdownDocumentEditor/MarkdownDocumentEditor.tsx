import React, { useEffect } from 'react';
import s from './MarkdownDocumentEditor.module.css'
import { ManagedMarkdownDocument, ManagedMarkdownDocumentSpec, ManagedMarkdownDocumentValOrRef } from '../LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../LibraryBrowser/model/library-context';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../LibraryBrowser/useManagedItemValue';
import MarkdownInput from '../MarkdownInput/MarkdownInput';

export type MarkdownDocumentEditorProps = {
  value: ManagedMarkdownDocumentValOrRef,
  onChange: (v: ManagedMarkdownDocumentValOrRef) => void,
  libraryContext: LibraryContext,
  isReadOnly?: boolean,
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const MarkdownDocumentEditor: React.FC<MarkdownDocumentEditorProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedMarkdownDocument>(props.value);

  useEffect(() => {
    if (props.value.val === undefined && resolveResult.type === 'success') {
      props.onChange({ ...props.value, val: resolveResult.value });
    }
  }, [resolveResult]);

  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedMarkdownDocumentSpec) => {
    const newValue: ManagedMarkdownDocumentValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedMarkdownDocumentValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.MarkdownDocumentEditor}>
      <div ref={hoverRef} style={{ borderBottom: '1px solid var(--border-color)' }}>
        <LibraryBrowserPanel
          itemType='consumer-session-target'
          value={item}
          onPick={(item) => props.onChange({
            type: 'value',
            val: item as ManagedMarkdownDocument
          })}
          onSave={(item) => props.onChange({
            type: 'value',
            val: item as ManagedMarkdownDocument
          })}
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedMarkdownDocument
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          isReadOnly={props.isReadOnly}
          {...props.libraryBrowserPanel}
        />
      </div>

      <MarkdownInput
        value={itemSpec.markdown}
        onChange={(v) => onSpecChange({ markdown: v })}
        maxHeight={480}
        isReadOnly={props.isReadOnly}
      />
    </div>
  );
}

export default MarkdownDocumentEditor;
