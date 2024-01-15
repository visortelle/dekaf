export const logLevels = ["LOG", "ERROR", "WARN", "INFO", "DEBUG", "UNKNOWN"] as const;
export type LogLevel = typeof logLevels[number];

/* Takes log line. Returns log level and log message. */
export function parseLogLine(line: string): [LogLevel, string] {
  let logLevel: LogLevel = 'UNKNOWN';
  let logMessage = '';

  if (line.startsWith('[LOG]')) {
    logLevel = 'LOG';
    logMessage = line.replace(/^\[LOG\] /, '');
  } else if (line.startsWith('[INFO]')) {
    logLevel = 'INFO';
    logMessage = line.replace(/^\[INFO\] /, '');
  } else if (line.startsWith('[WARN]')) {
    logLevel = 'WARN';
    logMessage = line.replace(/^\[WARN\] /, '');
  } else if (line.startsWith('[ERROR]')) {
    logLevel = 'ERROR';
    logMessage = line.replace(/^\[ERROR\] /, '');
  } else if (line.startsWith('[DEBUG]')) {
    logLevel = 'DEBUG';
    logMessage = line.replace(/^\[DEBUG\] /, '');
  } else {
    logMessage = line;
  }

  return [logLevel, logMessage];
}

export function getLogColor(logLevel: LogLevel) {
  switch (logLevel) {
    case "LOG":
      return "inherit";
    case "ERROR":
      return "var(--accent-color-red)";
    case "WARN":
      return "var(--accent-color-yellow)";
    case "INFO":
      return "var(--accent-color-blue)";
    case "DEBUG":
      return "inherit";
    case "UNKNOWN":
      return "inherit";
  }
}
