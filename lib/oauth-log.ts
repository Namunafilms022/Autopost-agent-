type LogEntry = {
  timestamp: string;
  stage: string;
  message: string;
  data?: unknown;
};

const logs: LogEntry[] = [];
const MAX_LOGS = 500;

export function addLog(stage: string, message: string, data?: unknown) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    stage,
    message,
    data: data !== undefined ? data : undefined,
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  console.log(`[OAuth:${stage}] ${message}`, data ?? '');
}

export function getLogs(): LogEntry[] {
  return [...logs];
}

export function clearLogs() {
  logs.length = 0;
}
