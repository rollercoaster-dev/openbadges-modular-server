#!/usr/bin/env bun

/**
 * This script runs ESLint and TypeScript type checking on staged files
 * but always exits with code 0 to prevent blocking commits.
 * It will still show errors in the console for awareness.
 */

import { spawn } from 'child_process';
import { join } from 'path';

// Get the list of files passed from lint-staged
const files = process.argv.slice(2);

if (files.length === 0) {
  console.log('No TypeScript files to check');
  process.exit(0);
}

/**
 * Run a command and return its output, but never fail
 */
async function runCommand(command, args) {
  console.log(`🔍 Running ${command}...`);
  
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
      console.log(`✅ ${command} check passed!`);
      return { success: true, output: stdout };
    } else {
      console.error(`⚠️ ${command} found issues:`);
      console.error(stderr || stdout);
      console.log(`\n⚠️ Commit will proceed despite ${command} errors. Please fix them when possible.`);
      return { success: false, output: stderr || stdout };
    }
  } catch (error) {
    console.error(`⚠️ Failed to run ${command}:`, error.message);
    console.log(`\n⚠️ Commit will proceed. Please fix any issues when possible.`);
    return { success: false, output: error.message };
  }
}

// Run ESLint with auto-fix
await runCommand('eslint', ['--fix', ...files]);

// Run TypeScript type checking
console.log(''); // Empty line for better readability
await runCommand('tsc-files', ['--noEmit', '--skipLibCheck', ...files]);

// Always exit with success
process.exit(0);
