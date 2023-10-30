import React from 'react';
import s from './TopicsSelectorsInput.module.css'
import { UserManagedTopicsSelector, UserManagedTopicsSelectorSpec, UserManagedTopicsSelectorValueOrReference } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseUserManagedItemValueSpinner, useUserManagedItemValue } from '../../../../ui/LibraryBrowser/useUserManagedItemValue';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { TopicsSelector } from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import TopicsSelectorInput from './TopicsSelectorInput/TopicsSelectorInput';
import { clone } from 'lodash';

export type TopicsSelectorsInputProps = {
  value: UserManagedTopicsSelectorValueOrReference[];
  onChange: (value: UserManagedTopicsSelectorValueOrReference[]) => void;
  libraryContext: LibraryContext;
};

const TopicsSelectorsInput: React.FC<TopicsSelectorsInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  return (
    <div className={s.TopicsSelectorsInput} ref={hoverRef}>
      {props.value.map((ts) => {
        return (
          <TopicsSelectorInput
            key={ts.value?.metadata.id}
            value={ts}
            onChange={(value) => {
              const newValue = props.value.map((ts) => {
                if (ts.value?.metadata.id === value.value?.metadata.id) {
                  return value;
                }
                return ts;
              });
              props.onChange(newValue);
            }}
            onDelete={() => {
              const newValue = props.value.filter((ts) => ts.value?.metadata.id !== ts.value?.metadata.id);
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
