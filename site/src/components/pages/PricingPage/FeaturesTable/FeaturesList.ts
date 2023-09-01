import { FeatureGroup } from './FeaturesTable';

export const featuresList: FeatureGroup[] = [
  {
    name: 'Security',
    features: [
      {
        href: 'https://',
        name: 'Traffic encryption',
        tiers: {
          free: { type: 'boolean', value: true },
          se: { type: 'boolean', value: true },
          ee: { type: 'boolean', value: true },
        },
        description: '',
      },
      {
        href: 'https://',
        name: 'Manage access',
        tiers: {
          free: { type: 'boolean', value: true },
          se: { type: 'boolean', value: true },
          ee: { type: 'boolean', value: true },
        },
        description: '',
      },
      {
        href: 'https://',
        name: 'JWT',
        tiers: {
          free: { type: 'boolean', value: true },
          se: { type: 'boolean', value: true },
          ee: { type: 'boolean', value: true },
        },
        description: '',
      },
      {
        href: 'https://',
        name: 'OAuth2',
        tiers: {
          free: { type: 'boolean', value: true },
          se: { type: 'boolean', value: true },
          ee: { type: 'boolean', value: true },
        },
        description: '',
      },
      {
        href: 'https://',
        name: 'Data masking',
        tiers: {
          free: { type: 'boolean', value: true },
          se: { type: 'boolean', value: true },
          ee: { type: 'boolean', value: true },
        },
        description: '',
      },
    ],
  },
  {
    name: 'Schema',
    features: [],
  },
  {
    name: 'Support',
    features: [],
  },
];
