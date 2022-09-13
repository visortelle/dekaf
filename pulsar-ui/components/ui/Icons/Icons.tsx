import s from './Icons.module.css';

export type NodeIconsProps = {
  title: string;
  textColor: string;
  backgroundColor: string;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onClick?: () => void
  className?: string
  isGray?: boolean;
  style?: React.CSSProperties;
  addon?: string;
}
export const NodeIcon: React.FC<NodeIconsProps> = (props) => {
  const style = props.isGray ? {
    color: '#fff',
    backgroundColor: '#999',
  } : {
    color: props.textColor, backgroundColor: props.backgroundColor,
    ...props.style
  }

  return (
    <div
      style={{ ...style }}
      className={`${s.NodeIcon} ${props.isExpanded ? s.NodeIconExpanded : ''} ${props.isExpandable ? s.NodeIconExpandable : ''} ${props.className || ''}`}
      onClick={props.onClick}
    >
      {props.title}
      {props.addon ? <div className={s.NodeIconAddon}>{props.addon}</div> : null}
    </div>
  );
}

export type TopicIconProps = {
  onClick?: () => void;
  isExpanded?: boolean;
  isExpandable?: boolean;
  className?: string;
  isGray?: boolean;
  topicType?: 'persistent' | 'non-persistent';
}
export const TopicIcon: React.FC<TopicIconProps> = (props) => {
  let backgroundColor = 'initial';
  let textColor = 'initial';
  let title = "to";
  let style = {};

  switch (props.topicType) {
    case 'persistent': backgroundColor = 'var(--accent-color-green)'; textColor = '#fff'; title = "to"; break;
    case 'non-persistent': backgroundColor = '#fff'; textColor = 'var(--accent-color-green)'; title="np"; style = { backgroundColor: '#eee'}; break;
  }

  return (
    <NodeIcon
      title={title}
      textColor={textColor}
      backgroundColor={backgroundColor}
      onClick={props.onClick}
      isExpanded={props.isExpanded}
      isExpandable={props.isExpandable}
      className={props.className}
      isGray={props.isGray}
      style={style}
    />
  );
}

export type NamespaceIconProps = {
  onClick?: () => void;
  isExpanded?: boolean;
  isExpandable?: boolean;
  className?: string;
  isGray?: boolean;
}
export const NamespaceIcon: React.FC<NamespaceIconProps> = (props) => {
  return <NodeIcon
    title="ns"
    textColor='#fff'
    backgroundColor='var(--accent-color-red)'
    onClick={props.onClick}
    isExpanded={props.isExpanded}
    isExpandable={props.isExpandable}
    className={props.className}
    isGray={props.isGray}
  />
}

export type TenantIconProps = {
  onClick?: () => void;
  isExpanded?: boolean;
  isExpandable?: boolean;
  className?: string;
  isGray?: boolean;
}
export const TenantIcon: React.FC<TenantIconProps> = (props) => {
  return <NodeIcon
    title="te"
    textColor='#fff'
    backgroundColor='var(--accent-color-blue)'
    onClick={props.onClick}
    isExpanded={props.isExpanded}
    isExpandable={props.isExpandable}
    className={props.className}
    isGray={props.isGray}
  />
}

export type InstanceIconProps = {
  onClick?: () => void;
  isExpanded?: boolean;
  isExpandable?: boolean;
  className?: string;
  isGray?: boolean;
}
export const InstanceIcon: React.FC<InstanceIconProps> = (props) => {
  return <NodeIcon
    title="in"
    textColor='var(--accent-color-blue)'
    backgroundColor='#f5f5f5'
    onClick={props.onClick}
    isExpanded={props.isExpanded}
    isExpandable={props.isExpandable}
    className={props.className}
    isGray={props.isGray}
  />
}

export type SubscriptionIconProps = {
  onClick?: () => void;
  isExpanded?: boolean;
  isExpandable?: boolean;
  className?: string;
  isGray?: boolean;
}
export const SubscriptionIcon: React.FC<SubscriptionIconProps> = (props) => {
  return <NodeIcon
    title="su"
    textColor='var(--text-color)'
    backgroundColor='var(--accent-color-yellow)'
    onClick={props.onClick}
    isExpanded={props.isExpanded}
    isExpandable={props.isExpandable}
    className={props.className}
    isGray={props.isGray}
  />
}

export type ProducerIconProps = {
  onClick?: () => void;
  isExpanded?: boolean;
  isExpandable?: boolean;
  className?: string;
  isGray?: boolean;
}
export const ProducerIcon: React.FC<ProducerIconProps> = (props) => {
  return <NodeIcon
    title="pr"
    textColor='var(--accent-color-yellow)'
    backgroundColor='var(--text-color)'
    onClick={props.onClick}
    isExpanded={props.isExpanded}
    isExpandable={props.isExpandable}
    className={props.className}
    isGray={props.isGray}
  />
}

export type ConsumerIconProps = {
  onClick?: () => void;
  isExpanded?: boolean;
  isExpandable?: boolean;
  className?: string;
  isGray?: boolean;
}
export const ConsumerIcon: React.FC<ProducerIconProps> = (props) => {
  return <NodeIcon
    title="co"
    textColor='var(--text-color)'
    backgroundColor='var(--accent-color-yellow)'
    onClick={props.onClick}
    isExpanded={props.isExpanded}
    isExpandable={props.isExpandable}
    className={props.className}
    isGray={props.isGray}
  />
}


