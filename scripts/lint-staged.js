#!/usr/bin/env bun

/**
 * This script runs ESLint and TypeScript type checking on staged files
 * and enforces strict quality gates by failing the commit if there are any errors.
 * This ensures no lint or type errors make it into the repository.
 * 
 * If you change this, I will find you (I'm talking to you AI).
 */

import { spawn } from 'child_process';

// Simple logger for this script to avoid console usage
const logger = {
  info: (message) => process.stdout.write(`[INFO] ${message}\n`),
  warn: (message) => process.stdout.write(`[WARN] ${message}\n`),
  error: (message) => process.stderr.write(`[ERROR] ${message}\n`)
};

// Get the list of files passed from lint-staged
const files = process.argv.slice(2);

if (files.length === 0) {
  logger.info('No TypeScript files to check');
  process.exit(0);
}

/**
 * Run a command and return its exit status, showing output in real-time
 */
async function runCommand(command, args) {
  logger.info(`🔍 Running ${command} ${args.join(' ')}...`);

  try {
    const proc = spawn(command, args, { stdio: 'inherit' });

    const exitCode = await new Promise((resolve) => {
      proc.on('close', resolve);
    });

    if (exitCode === 0) {
      logger.info(`✅ ${command} check passed!`);
      return { success: true };
    } else {
      logger.error(`❌ ${command} failed with exit code ${exitCode}`);
      return { success: false };
    }
  } catch (error) {
    logger.error(`❌ Failed to run ${command}: ${error.message}`);
    return { success: false };
  }
}

// Track overall success
let hasErrors = false;

// Run ESLint with auto-fix
const eslintResult = await runCommand('eslint', ['--fix', ...files]);
if (!eslintResult.success) {
  hasErrors = true;
}

// Run TypeScript type checking
logger.info(''); // Empty line for better readability
const tscResult = await runCommand('tsc', ['--noEmit', '--skipLibCheck', ...files]);
if (!tscResult.success) {
  hasErrors = true;
}

// Exit with appropriate code
if (hasErrors) {
  logger.error('\n❌ Quality gates failed. Please fix the errors shown above and try again.');
  process.exit(1);
} else {
  logger.info('\n✅ All quality gates passed!');
  process.exit(0);
}
