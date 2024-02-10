import { ConsumerSessionConfig, MessageDescriptor } from "./types";
import { colorsByName } from "./SessionConfiguration/ColoringRulesInput/ColoringRuleInput/ColorPickerButton/ColorPicker/color-palette";

export type Coloring = {
  foregroundColor: string,
  backgroundColor: string
} | undefined;

export function getColoring(sessionConfig: ConsumerSessionConfig, message: MessageDescriptor): Coloring {
  const targetChain = message.sessionTargetIndex === null ?
    undefined :
    sessionConfig.targets[message.sessionTargetIndex].coloringRuleChain;

  const targetChainColoringRules = targetChain?.coloringRules.filter(f => f.isEnabled) || [];
  if (targetChainColoringRules.length !== 0) {
    const okRuleIndex = (message.sessionTargetColorRuleChainTestResults || []).findIndex(cr => cr.isOk);

    if (okRuleIndex !== -1) {
      const rule = targetChainColoringRules[okRuleIndex];
      return {
        foregroundColor: colorsByName[rule.foregroundColor],
        backgroundColor: colorsByName[rule.backgroundColor]
      };
    }
  }

  const sessionChain = sessionConfig.coloringRuleChain;

  const okRuleIndex = (message.sessionColorRuleChainTestResults || []).findIndex(cr => cr.isOk);

  if (okRuleIndex !== -1) {
    const rule = sessionChain.coloringRules.filter(f => f.isEnabled)[okRuleIndex];
    return {
      foregroundColor: colorsByName[rule.foregroundColor],
      backgroundColor: colorsByName[rule.backgroundColor]
    };
  }

  return undefined;
}
