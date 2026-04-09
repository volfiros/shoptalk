type LogLevel = "debug" | "info" | "warn" | "error";

type Logger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

const isProduction = () => {
  return typeof process !== "undefined" && process.env.NODE_ENV === "production";
};

const noop = () => {};

const createLogMethod = (namespace: string, level: LogLevel) => {
  if (level === "debug" && isProduction()) {
    return noop;
  }

  const prefix = `[${namespace}]`;
  const consoleMethod = console[level] as (...args: unknown[]) => void;

  return (...args: unknown[]) => {
    consoleMethod(prefix, ...args);
  };
};

export const createLogger = (namespace: string): Logger => {
  return {
    debug: createLogMethod(namespace, "debug"),
    info: createLogMethod(namespace, "info"),
    warn: createLogMethod(namespace, "warn"),
    error: createLogMethod(namespace, "error")
  };
};
