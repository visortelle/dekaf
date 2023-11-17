import React from 'react';
import s from './ColoringRuleChainInput.module.css'
import ColorPicker from './ColoringRuleInput/ColorPicker/ColorPicker';
import { ColoringRule } from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import ColoringRuleInput from './ColoringRuleInput/ColoringRuleInput';
import { ManagedColoringRuleChain, ManagedColoringRuleChainSpec, ManagedColoringRuleChainValOrRef, ManagedColoringRuleValOrRef } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../ui/LibraryBrowser/useManagedItemValue';
import ListInput from '../../../../ui/ConfigurationTable/ListInput/ListInput';
import { v4 as uuid } from 'uuid';
import { colorPalette, colorsByName, themeBackgroundColorName, themeForegroundColorName } from './ColoringRuleInput/ColorPicker/color-palette';

export type ColoringRuleChainInputProps = {
  value: ManagedColoringRuleChainValOrRef,
  onChange: (value: ManagedColoringRuleChainValOrRef) => void,
};

const ColoringRuleChainInput: React.FC<ColoringRuleChainInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedColoringRuleChain>(props.value);

  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedColoringRuleChainSpec) => {
    const newValue: ManagedColoringRuleChainValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedColoringRuleChainValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.ColoringRuleChainInput}>
      <ListInput<ManagedColoringRuleValOrRef>
        value={itemSpec.coloringRules}
        getId={(item) => item.type === 'reference' ? item.ref : item.val.metadata.id}
        renderItem={(rule, i) => {
          return (
            <ColoringRuleInput
              value={rule}
              onChange={(v) => {
                const newRules = [...itemSpec.coloringRules];
                newRules[i] = v;
                onSpecChange({ ...itemSpec, coloringRules: newRules });
              }}
            />
          )
        }}
        itemName='Coloring Rule'
        onAdd={() => {
          const newRule: ManagedColoringRuleValOrRef = {
            type: 'value',
            val: {
              metadata: {
                id: uuid(),
                name: 'New Rule',
                descriptionMarkdown: '',
                type: 'coloring-rule',
              },
              spec: {
                backgroundColor: themeBackgroundColorName,
                foregroundColor: themeForegroundColorName,
                messageFilterChain: {
                  type: 'value',
                  val: {
                    metadata: {
                      id: uuid(),
                      name: 'New Filter Chain',
                      descriptionMarkdown: '',
                      type: 'message-filter-chain',
                    },
                    spec: {
                      isEnabled: true,
                      isNegated: false,
                      filters: [],
                      mode: 'all'
                    }
                  }
                }
              }
            }
          };
          const newRules = itemSpec.coloringRules.concat([newRule]);
          onSpecChange({ ...itemSpec, coloringRules: newRules });
        }}
        onRemove={(id) => {
          const newRules = itemSpec.coloringRules.filter((rule) => rule.type === 'reference' ? rule.ref !== id : rule.val.metadata.id !== id);
          onSpecChange({ ...itemSpec, coloringRules: newRules });
        }}
      />
    </div>
  );
}

export default ColoringRuleChainInput;
