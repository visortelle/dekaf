import React from 'react';
import s from './LibraryItemEditor.module.css'
import Input from '../../Input/Input';
import FormItem from '../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';

export type LibraryItemViewerProps = {
  name: string;
  descriptionMarkdown: string;
  tags: string[];
  viewer: React.ReactNode;
  onNameChange: (name: string) => void;
  onDescriptionMarkdownChange: (descriptionMarkdown: string) => void;
  mode: 'editor' | 'viewer';
};

const LibraryItemViewer: React.FC<LibraryItemViewerProps> = (props) => {
  return (
    <div className={s.LibraryItemEditor}>
      <div className={s.Viewer}>
        {props.viewer}
      </div>

      <div className={s.Info}>
        <FormItem>
          <FormLabel content="Name" />
          {props.mode === 'editor' && (<Input value={props.name} onChange={props.onNameChange} />)}
          {props.mode === 'viewer' && (<div>{props.name}</div>)}
        </FormItem>

        <FormItem>
          <FormLabel content="Description" />
          {props.mode === 'editor' && (<Input value={props.descriptionMarkdown} onChange={props.onDescriptionMarkdownChange} />)}
          {props.mode === 'viewer' && (<div>{props.descriptionMarkdown}</div>)}
        </FormItem>

        {props.mode === 'viewer' && (
          <FormItem>
            <FormLabel content="Tags" />
            <div>
              {props.tags.map((tag) => (
                <div key={tag}>{tag}</div>
              ))}
            </div>
          </FormItem>
        )}
      </div>
    </div>
  );
}

export default LibraryItemViewer;
