export const longRunningTest = (process.env.LONG_RUNNING_TESTS ? it : it.skip);
