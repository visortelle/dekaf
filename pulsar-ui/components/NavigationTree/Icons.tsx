import s from './Icons.module.css';

export type NodeIconsProps = {
  title: string;
  textColor: string;
  backgroundColor: string;
  isExpandable: boolean;
  isExpanded: boolean;
  onClick: () => void
  className?: string
  isGray?: boolean;
}
export const NodeIcon: React.FC<NodeIconsProps> = (props) => {
  const style = props.isGray ? {
    color: '#fff',
    backgroundColor: '#999',
  } : {
    color: props.textColor, backgroundColor: props.backgroundColor
  }
  return (
    <div
      style={style}
      className={`${s.NodeIcon} ${props.isExpanded ? s.NodeIconExpanded : ''} ${props.isExpandable ? s.NodeIconExpandable : ''} ${props.className || ''}`}
      onClick={props.onClick}
    >
      {props.title}
    </div>
  );
}

export type TopicIconProps = {
  onClick: () => void;
  isExpanded: boolean;
  isExpandable: boolean;
  className?: string;
  isGray?: boolean;
}
export const TopicIcon: React.FC<TopicIconProps> = (props) => {
  return <NodeIcon
    title="to"
    textColor='#fff'
    backgroundColor='#00ab28'
    onClick={props.onClick}
    isExpanded={props.isExpanded}
    isExpandable={props.isExpandable}
    className={props.className}
    isGray={props.isGray}
  />
}

export type NamespaceIconProps = {
  onClick: () => void;
  isExpanded: boolean;
  className?: string;
  isGray?: boolean;
}
export const NamespaceIcon: React.FC<NamespaceIconProps> = (props) => {
  return <NodeIcon
    title="ns"
    textColor='#fff'
    backgroundColor='#fe6e6e'
    onClick={props.onClick}
    isExpanded={props.isExpanded}
    isExpandable={true}
    className={props.className}
    isGray={props.isGray}
  />

}

export type TenantIconProps = {
  onClick: () => void;
  isExpanded: boolean;
  className?: string;
  isGray?: boolean;
}
export const TenantIcon: React.FC<TenantIconProps> = (props) => {
  return <NodeIcon
    title="te"
    textColor='#fff'
    backgroundColor='#276ff4'
    onClick={props.onClick}
    isExpanded={props.isExpanded}
    isExpandable={true}
    className={props.className}
    isGray={props.isGray}
  />
}
