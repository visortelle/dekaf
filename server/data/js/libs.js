import _safeStableStringify from 'safe-stable-stringify';
import _lodash from 'lodash';
import _dayjs from 'dayjs/esm';
import _inspect from 'node-inspect-extracted';
import * as _simpleStatistics from 'simple-statistics';
import { JSONSchemaFaker as _JSONSchemaFaker} from 'json-schema-faker';

export const _ = _lodash;
export const dayjs = _dayjs;
export const statistics = _simpleStatistics;

export const safeStableStringify = _safeStableStringify;
export const stringify = safeStableStringify.stringify;
export const pretty = (val) => safeStableStringify.stringify(val, null, 4);
export const inspect = _inspect.inspect;

export const JSONSchemaFaker = _JSONSchemaFaker;
