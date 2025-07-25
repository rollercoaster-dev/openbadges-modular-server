#!/usr/bin/env bun
/**
 * Version Management Script
 * 
 * This script helps manage version transitions, including:
 * - Setting beta/prerelease versions
 * - Cleaning up failed releases
 * - Managing version rollbacks
 * - Preparing for new release cycles
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { confirm, select, input } from '@inquirer/prompts';

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
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function setVersion(newVersion) {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  packageJson.version = newVersion;
  writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  log(`✅ Updated package.json version to ${newVersion}`, colors.green);
}

function getLatestTag() {
  return exec('git describe --tags --abbrev=0', { allowFailure: true });
}

function getAllTags() {
  const tags = exec('git tag -l', { allowFailure: true });
  return tags ? tags.split('\n').filter(tag => tag.trim()) : [];
}

function tagExists(tag) {
  const tags = getAllTags();
  return tags.includes(tag);
}

function deleteLocalTag(tag) {
  try {
    exec(`git tag -d ${tag}`);
    log(`✅ Deleted local tag: ${tag}`, colors.green);
    return true;
  } catch (error) {
    log(`❌ Failed to delete local tag ${tag}: ${error.message}`, colors.red);
    return false;
  }
}

function deleteRemoteTag(tag) {
  try {
    exec(`git push origin :refs/tags/${tag}`);
    log(`✅ Deleted remote tag: ${tag}`, colors.green);
    return true;
  } catch (error) {
    log(`❌ Failed to delete remote tag ${tag}: ${error.message}`, colors.red);
    return false;
  }
}

function generateBetaVersion(baseVersion, betaNumber = 1) {
  // Parse version (e.g., "1.0.9" -> {major: 1, minor: 0, patch: 9})
  const [major, minor, patch] = baseVersion.split('.').map(Number);
  
  // For beta, we typically increment the patch version
  const nextPatch = patch + 1;
  return `${major}.${minor}.${nextPatch}-beta.${betaNumber}`;
}

function generateNextVersion(currentVersion, releaseType = 'patch') {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (releaseType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

async function cleanupFailedRelease() {
  log('\n🧹 Cleanup Failed Release', colors.cyan);
  log('================================', colors.cyan);
  
  const currentVersion = getCurrentVersion();
  const latestTag = getLatestTag();
  
  log(`📦 Current package.json version: ${currentVersion}`, colors.blue);
  log(`🏷️  Latest git tag: ${latestTag || 'none'}`, colors.blue);
  
  // Check if there's a mismatch (indicating a failed release)
  const expectedTag = `v${currentVersion}`;
  const hasFailedRelease = !tagExists(expectedTag) && currentVersion !== latestTag?.replace('v', '');
  
  if (hasFailedRelease) {
    log(`⚠️  Detected potential failed release: ${expectedTag}`, colors.yellow);
    
    const shouldCleanup = await confirm({
      message: 'Do you want to reset the version to match the latest successful release?',
      default: true
    });
    
    if (shouldCleanup && latestTag) {
      const latestVersion = latestTag.replace('v', '');
      setVersion(latestVersion);
      log(`✅ Reset version to ${latestVersion}`, colors.green);
    }
  } else {
    log('✅ No failed release detected', colors.green);
  }
}

async function setBetaVersion() {
  log('\n🧪 Set Beta Version', colors.cyan);
  log('====================', colors.cyan);
  
  const currentVersion = getCurrentVersion();
  const suggestedBeta = generateBetaVersion(currentVersion);
  
  const betaVersion = await input({
    message: 'Enter beta version:',
    default: suggestedBeta,
    validate: (input) => {
      if (!/^\d+\.\d+\.\d+-(alpha|beta|rc)\.\d+$/.test(input)) {
        return 'Version must follow semver prerelease format (e.g., 1.0.0-beta.1)';
      }
      return true;
    }
  });
  
  setVersion(betaVersion);
  
  const shouldCommit = await confirm({
    message: 'Commit the version change?',
    default: true
  });
  
  if (shouldCommit) {
    exec('git add package.json');
    exec(`git commit -m "chore: set version to ${betaVersion} for development"`);
    log(`✅ Committed version change to ${betaVersion}`, colors.green);
  }
}

async function manageReleases() {
  log('\n📋 Release Management', colors.cyan);
  log('=====================', colors.cyan);
  
  const action = await select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Set beta/prerelease version', value: 'beta' },
      { name: 'Cleanup failed release', value: 'cleanup' },
      { name: 'Show version status', value: 'status' },
      { name: 'Delete a tag (local and remote)', value: 'delete-tag' },
      { name: 'Prepare for next release', value: 'prepare' },
      { name: 'Exit', value: 'exit' }
    ]
  });
  
  switch (action) {
    case 'beta':
      await setBetaVersion();
      break;
      
    case 'cleanup':
      await cleanupFailedRelease();
      break;
      
    case 'status':
      await showVersionStatus();
      break;
      
    case 'delete-tag':
      await deleteTag();
      break;
      
    case 'prepare':
      await prepareNextRelease();
      break;
      
    case 'exit':
      log('👋 Goodbye!', colors.cyan);
      return;
  }
  
  // Ask if they want to do something else
  const continueWork = await confirm({
    message: 'Do you want to perform another action?',
    default: false
  });
  
  if (continueWork) {
    await manageReleases();
  }
}

async function showVersionStatus() {
  log('\n📊 Version Status', colors.cyan);
  log('=================', colors.cyan);
  
  const currentVersion = getCurrentVersion();
  const latestTag = getLatestTag();
  const allTags = getAllTags().slice(-5); // Last 5 tags
  
  log(`📦 Current package.json: ${currentVersion}`, colors.blue);
  log(`🏷️  Latest tag: ${latestTag || 'none'}`, colors.blue);
  log(`📋 Recent tags: ${allTags.join(', ') || 'none'}`, colors.blue);
  
  // Check for unreleased commits
  if (latestTag) {
    const commitsSinceTag = exec(`git rev-list --count ${latestTag}..HEAD`);
    log(`📝 Commits since ${latestTag}: ${commitsSinceTag}`, colors.blue);
  }
  
  // Check branch status
  const currentBranch = exec('git branch --show-current');
  log(`🌿 Current branch: ${currentBranch}`, colors.blue);
  
  // Check for uncommitted changes
  const hasChanges = exec('git status --porcelain').length > 0;
  log(`💾 Uncommitted changes: ${hasChanges ? 'Yes' : 'No'}`, hasChanges ? colors.yellow : colors.green);
}

async function deleteTag() {
  const allTags = getAllTags();
  
  if (allTags.length === 0) {
    log('❌ No tags found', colors.red);
    return;
  }
  
  const tagToDelete = await select({
    message: 'Select tag to delete:',
    choices: allTags.map(tag => ({ name: tag, value: tag }))
  });
  
  const confirmDelete = await confirm({
    message: `Are you sure you want to delete tag "${tagToDelete}" (local and remote)?`,
    default: false
  });
  
  if (confirmDelete) {
    deleteLocalTag(tagToDelete);
    deleteRemoteTag(tagToDelete);
  }
}

async function prepareNextRelease() {
  log('\n🚀 Prepare Next Release', colors.cyan);
  log('========================', colors.cyan);
  
  const currentVersion = getCurrentVersion();
  
  const releaseType = await select({
    message: 'What type of release?',
    choices: [
      { name: 'Patch (bug fixes)', value: 'patch' },
      { name: 'Minor (new features)', value: 'minor' },
      { name: 'Major (breaking changes)', value: 'major' },
      { name: 'Beta/Prerelease', value: 'beta' }
    ]
  });
  
  let nextVersion;
  if (releaseType === 'beta') {
    nextVersion = generateBetaVersion(currentVersion);
  } else {
    nextVersion = generateNextVersion(currentVersion, releaseType);
  }
  
  log(`📦 Current version: ${currentVersion}`, colors.blue);
  log(`🎯 Next version: ${nextVersion}`, colors.green);
  
  const shouldUpdate = await confirm({
    message: 'Update package.json to this version?',
    default: true
  });
  
  if (shouldUpdate) {
    setVersion(nextVersion);
    
    const shouldCommit = await confirm({
      message: 'Commit the version change?',
      default: true
    });
    
    if (shouldCommit) {
      exec('git add package.json');
      exec(`git commit -m "chore: prepare for ${nextVersion} release"`);
      log(`✅ Committed version change`, colors.green);
    }
  }
}

async function main() {
  log('🎯 Version Management Tool', colors.magenta);
  log('==========================', colors.magenta);
  
  try {
    await manageReleases();
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
