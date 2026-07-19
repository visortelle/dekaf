// jsdom lacks these Node globals that react-dom/server touches on import.
const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

// The esbuild-jest transform emits classic React.createElement but strips the (seemingly-unused)
// React import - and jest hoists jest.mock() factories above imports anyway. A global React makes
// both the test bodies and the mock factories resolve without an in-scope import.
global.React = require('react');
