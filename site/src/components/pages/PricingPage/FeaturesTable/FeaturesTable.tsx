import React, { ReactNode } from 'react';
import Button from '@site/src/components/ui/Button/Button';
import FeatureBoolValue from './FeatureBoolValue/FeatureBoolValue';

import style from './FeaturesTable.module.css';

export type ProductTier = 'free' | 'se' | 'ee';

export type FeatureSupport =
  | { type: 'boolean'; value: boolean }
  | { type: 'html'; value: ReactNode };

export type Feature = {
  href?: string;
  name: ReactNode;
  tiers: Record<ProductTier, FeatureSupport>;
  description?: ReactNode;
};

export type FeatureGroup = {
  name: ReactNode;
  features: Feature[];
};

// -----------------------------------------------------------------------------
type FeatureRowProps = {
  feature: Feature;
};

// -----------------------------------------------------------------------------
const FeatureRow: React.FC<FeatureRowProps> = ({ feature }) => {
  const { name, tiers, href, description } = feature;

  return (
    <div className={style.tableRow}>
      <div className={style.cellName}>{name}</div>

      {Object.keys(tiers).map((tier) => {
        return (
          <div className={style.cellValue}>
            {tiers[tier].type === 'html' ? (
              tiers[tier].value
            ) : (
              <FeatureBoolValue value={tiers[tier].value} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// -----------------------------------------------------------------------------
export type FeatureTableProps = {
  groups: FeatureGroup[];
};

const FeaturesTable: React.FC<FeatureTableProps> = ({ groups }) => {
  return (
    <div className={style.featureTableContainer}>
      <div className={style.tableHeader}>
        <div className={style.headerPadCell} />
        <div className={style.headerCell}>
          <span>Developer box</span>
          <Button size="small" title="Get started - free" />
        </div>

        <div className={style.headerCell}>
          <span>Standard edition</span>
          <Button size="small" title="Get started - free" />
        </div>

        <div className={style.headerCell}>
          <span>Enterprise edition</span>
          <Button size="small" title="Contact us" />
        </div>
      </div>

      {groups.map((group) => {
        return (
          <div className={style.groupContainer}>
            <div className={style.groupNameRow}>{group.name}</div>

            {group.features.map((feature) => (
              <FeatureRow feature={feature} />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default FeaturesTable;
