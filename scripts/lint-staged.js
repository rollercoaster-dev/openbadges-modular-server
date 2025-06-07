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
 * Run a command and return its output, failing if there are errors
 */
async function runCommand(command, args) {
  logger.info(`🔍 Running ${command}...`);

  try {
    const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const exitCode = await new Promise((resolve) => {
      proc.on('close', resolve);
    });

    if (exitCode === 0) {
      logger.info(`✅ ${command} check passed!`);
      return { success: true, output: stdout };
    } else {
      logger.error(`❌ ${command} found issues:`);
      logger.error(stderr || stdout);
      logger.error(`\n❌ Commit blocked due to ${command} errors. Please fix them before committing.`);
      return { success: false, output: stderr || stdout };
    }
  } catch (error) {
    logger.error(`❌ Failed to run ${command}: ${error.message}`);
    logger.error(`\n❌ Commit blocked. Please fix any issues before committing.`);
    return { success: false, output: error.message };
  }
}

// Track overall success
let hasErrors = false;

// Run ESLint with auto-fix
const eslintResult = await runCommand('bun', ['run', 'eslint', '--fix', ...files]);
if (!eslintResult.success) {
  hasErrors = true;
}

// Run TypeScript type checking
logger.info(''); // Empty line for better readability
const tscResult = await runCommand('bun', ['run', 'tsc-files', '--noEmit', '--skipLibCheck', ...files]);
if (!tscResult.success) {
  hasErrors = true;
}

// Exit with appropriate code
if (hasErrors) {
  logger.error('\n❌ Quality gates failed. Please fix all errors before committing.');
  process.exit(1);
} else {
  logger.info('\n✅ All quality gates passed!');
  process.exit(0);
}
