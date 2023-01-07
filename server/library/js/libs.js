import _safeStableStringify from 'safe-stable-stringify';
import _lodash from 'lodash';
import _dayjs from 'dayjs/esm';
import * as _simpleStatistics from 'simple-statistics';

export const _ = _lodash;
export const dayjs = _dayjs;
export const statistics = _simpleStatistics;

export const stringify = _safeStableStringify.stringify;
export const pretty = (val) => _safeStableStringify.stringify(val, null, 4);
