#!/usr/bin/env bun
/**
 * Release Helper Script
 * 
 * This script provides utilities for managing releases, including:
 * - Checking if a release is needed
 * - Validating the current state
 * - Providing release recommendations
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    throw error;
  }
}

function getCurrentVersion() {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    return packageJson.version;
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error.message}`);
  }
}

function getLatestTag() {
  return exec('git describe --tags --abbrev=0', { allowFailure: true });
}

function getCommitsSinceTag(tag) {
  if (!tag) {
    return exec('git rev-list --count HEAD');
  }
  return exec(`git rev-list --count ${tag}..HEAD`);
}

function getCommitMessagesSinceTag(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  return exec(`git log ${range} --oneline --grep="chore(release):" --invert-grep`);
}

function hasUncommittedChanges() {
  const status = exec('git status --porcelain');
  return status.length > 0;
}

function isOnMainBranch() {
  const branch = exec('git branch --show-current');
  return branch === 'main';
}

function checkReleaseNeeded() {
  log('\n🔍 Checking if a release is needed...', colors.cyan);
  
  // Check if we're on main branch
  if (!isOnMainBranch()) {
    log('❌ Not on main branch. Releases should only be created from main.', colors.red);
    return false;
  }
  
  // Check for uncommitted changes
  if (hasUncommittedChanges()) {
    log('❌ Uncommitted changes detected. Please commit or stash changes first.', colors.red);
    return false;
  }
  
  const currentVersion = getCurrentVersion();
  const latestTag = getLatestTag();
  const commitsSinceTag = getCommitsSinceTag(latestTag);
  
  log(`📦 Current version: ${currentVersion}`, colors.blue);
  log(`🏷️  Latest tag: ${latestTag || 'none'}`, colors.blue);
  log(`📝 Commits since last tag: ${commitsSinceTag}`, colors.blue);
  
  if (commitsSinceTag === '0') {
    log('✅ No new commits since last release. No release needed.', colors.green);
    return false;
  }
  
  // Show recent commits
  log('\n📋 Recent commits since last release:', colors.yellow);
  const recentCommits = getCommitMessagesSinceTag(latestTag);
  console.log(recentCommits);
  
  log('\n✅ Release is needed!', colors.green);
  return true;
}

function showReleaseOptions() {
  log('\n🚀 Release Options:', colors.magenta);
  log('1. Automatic release (recommended): bun run release:manual', colors.blue);
  log('2. Dry run first: bun run release:dry-run', colors.blue);
  log('3. Force patch release: bun run release:patch', colors.blue);
  log('4. Force minor release: bun run release:minor', colors.blue);
  log('5. Force major release: bun run release:major', colors.blue);
}

function validateEnvironment() {
  log('\n🔧 Validating environment...', colors.cyan);

  // Check if semantic-release is installed
  try {
    exec('npx semantic-release --version');
    log('✅ semantic-release is available', colors.green);
  } catch {
    log('❌ semantic-release not found. Run: bun install', colors.red);
    return false;
  }

  // Check if git is configured
  try {
    const userName = exec('git config user.name');
    const userEmail = exec('git config user.email');
    log(`✅ Git configured: ${userName} <${userEmail}>`, colors.green);
  } catch {
    log('❌ Git not configured. Set user.name and user.email', colors.red);

    // In CI environments, this might be expected
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      log('ℹ️  Running in CI environment - git config may not be required', colors.blue);
      return true; // Don't fail in CI for git config
    }
    return false;
  }

  // Check if we can access GitHub (optional in CI)
  try {
    exec('git ls-remote origin HEAD');
    log('✅ GitHub access verified', colors.green);
  } catch {
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      log('⚠️  GitHub access check skipped in CI environment', colors.yellow);
    } else {
      log('❌ Cannot access GitHub. Check authentication.', colors.red);
      return false;
    }
  }

  return true;
}

function main() {
  log('🎯 Release Helper', colors.magenta);
  log('================', colors.magenta);

  // Validate we're in the project root
  try {
    readFileSync('package.json', 'utf8');
  } catch {
    log('❌ Must be run from project root (package.json not found)', colors.red);
    process.exit(1);
  }

  if (!validateEnvironment()) {
    process.exit(1);
  }

  const releaseNeeded = checkReleaseNeeded();

  if (releaseNeeded) {
    showReleaseOptions();
  }

  log('\n📚 For more information, see: docs/release-process.md', colors.cyan);
}

if (import.meta.main) {
  main();
}
