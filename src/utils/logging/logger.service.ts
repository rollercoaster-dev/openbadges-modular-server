import chalk from 'chalk';

// A simple, neuro-friendly logger with spaced entries, icons, and colored levels
export type LogLevel = 'info' | 'warn' | 'error';

const levelColors: Record<LogLevel, (text: string) => string> = {
  info: chalk.green,
  warn: chalk.yellow,
  error: chalk.red
};

export function neuroLog(
  level: LogLevel,
  message: string,
  context: Record<string, string> = {}
): void {
  const icons: Record<LogLevel, string> = {
    info: '🟢',
    warn: '🟡',
    error: '🔴'
  };
  const icon = icons[level];
  const timestamp = chalk.gray(new Date().toISOString());

  console.log();
  console.log(`${icon}  ${levelColors[level](level.toUpperCase())}  ${timestamp}`);
  console.log(`  ➤ ${chalk.whiteBright(message)}`);

  if (Object.keys(context).length) {
    for (const [key, value] of Object.entries(context)) {
      console.log(`    • ${chalk.gray(key)}: ${chalk.cyan(value)}`);
    }
  }

  console.log(chalk.dim('────────────────────────────────────'));
}

// Convenience wrappers
export const logger = {
  info: (msg: string, ctx?: Record<string, string>) => neuroLog('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, string>) => neuroLog('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, string>) => neuroLog('error', msg, ctx)
}; 