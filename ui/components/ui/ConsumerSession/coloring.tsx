import { ConsumerSessionConfig, MessageDescriptor } from "./types";
import { colorsByName } from "./SessionConfiguration/ColoringRulesInput/ColoringRuleInput/ColorPickerButton/ColorPicker/color-palette";

export type Coloring = {
  foregroundColor: string,
  backgroundColor: string
} | undefined;

export function getColoring(sessionConfig: ConsumerSessionConfig, message: MessageDescriptor): Coloring {
  const sessionTargetChain = message.sessionTargetIndex === null ?
    undefined :
    sessionConfig.targets[message.sessionTargetIndex].coloringRuleChain;

  if (sessionTargetChain !== undefined && sessionTargetChain.coloringRules.length !== 0) {
    const ruleIndex = message.sessionTargetColorRuleChainTestResults.findIndex(cr => cr.isOk);

    if (ruleIndex !== -1) {
      const rule = sessionTargetChain.coloringRules[ruleIndex];
      return {
        foregroundColor: colorsByName[rule.foregroundColor],
        backgroundColor: colorsByName[rule.backgroundColor]
      };
    }
  }

  const sessionChain = sessionConfig.coloringRuleChain;
  const ruleIndex = message.sessionColorRuleChainTestResults.findIndex(cr => cr.isOk);
  if (ruleIndex !== -1) {
    const rule = sessionChain.coloringRules[ruleIndex];
    return {
      foregroundColor: colorsByName[rule.foregroundColor],
      backgroundColor: colorsByName[rule.backgroundColor]
    };
  }

  return undefined;
}
