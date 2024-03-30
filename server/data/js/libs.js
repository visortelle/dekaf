import _safeStableStringify from 'safe-stable-stringify';
import _lodash from 'lodash';
import _dayjs from 'dayjs/esm';
import _inspect from 'node-inspect-extracted';
import * as _simpleStatistics from 'simple-statistics';
import _BigNumber from 'bignumber.js';
import { faker as _faker } from '@faker-js/faker';

export const _ = _lodash;
export const lodash = _lodash;
export const dayjs = _dayjs;
export const simpleStatistics = _simpleStatistics;
export const faker = _faker;
export const BigNumber = _BigNumber;

export const stringify = _safeStableStringify.stringify;
export const pretty = (val) => stringify(val, null, 4);
export const inspect = _inspect.inspect;
