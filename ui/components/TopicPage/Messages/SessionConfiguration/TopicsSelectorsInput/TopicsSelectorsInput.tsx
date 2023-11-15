import React from 'react';
import s from './TopicsSelectorsInput.module.css'
import { ManagedTopicsSelector, ManagedTopicsSelectorSpec, ManagedTopicsSelectorValOrRef } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../ui/LibraryBrowser/useManagedItemValue';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { TopicsSelector } from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import TopicsSelectorInput from './TopicsSelectorInput/TopicsSelectorInput';
import { clone } from 'lodash';

export type TopicsSelectorsInputProps = {
  value: ManagedTopicsSelectorValOrRef[];
  onChange: (value: ManagedTopicsSelectorValOrRef[]) => void;
  libraryContext: LibraryContext;
};

const TopicsSelectorsInput: React.FC<TopicsSelectorsInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  return (
    <div className={s.TopicsSelectorsInput} ref={hoverRef}>
      {props.value.map((ts) => {
        return (
          <TopicsSelectorInput
            key={ts.val?.metadata.id}
            value={ts}
            onChange={(value) => {
              const newValue = props.value.map((ts) => {
                if (ts.val?.metadata.id === value.val?.metadata.id) {
                  return value;
                }
                return ts;
              });
              props.onChange(newValue);
            }}
            onDelete={() => {
              const newValue = props.value.filter((ts) => ts.val?.metadata.id !== ts.val?.metadata.id);
              props.onChange(newValue);
            }}
            libraryContext={props.libraryContext}
          />
        );
      })}
    </div>
  );
}

export default TopicsSelectorsInput;
