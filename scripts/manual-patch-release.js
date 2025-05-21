#!/usr/bin/env bun

/**
 * Manual patch release script
 * This script:
 * 1. Increments the patch version in package.json
 * 2. Creates a git tag for the new version
 * 3. Optionally pushes the changes to the remote repository
 *
 * If the current version already has a tag, it will increment to the next patch version.
 */

import fs from 'fs';
import { execSync } from 'child_process';

// Read the current package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const currentVersion = packageJson.version;

console.log(`Current version: ${currentVersion}`);

// Parse the version components
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Increment the patch version
const newPatchVersion = patch + 1;
const newVersion = `${major}.${minor}.${newPatchVersion}`;

console.log(`New version: ${newVersion}`);

// Check if the current version tag exists
let currentVersionTagExists = false;
try {
  const tagCheck = execSync(`git tag -l v${currentVersion}`).toString().trim();
  currentVersionTagExists = tagCheck.split('\n').includes(`v${currentVersion}`);
} catch (error) {
  // Tag doesn't exist
}

if (currentVersionTagExists) {
  console.log(`Tag v${currentVersion} already exists, proceeding with new version ${newVersion}`);
} else {
  console.log(`Warning: Tag v${currentVersion} does not exist. Consider using this version first.`);
  console.log(`Proceeding with new version ${newVersion} anyway.`);
}

// Update the version in package.json
packageJson.version = newVersion;
fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Updated package.json with new version: ${newVersion}`);

// Commit the changes
// Check for uncommitted changes first
try {
  const status = execSync('git status --porcelain').toString().trim();
  if (status && !status.includes('package.json')) {
    console.error('There are uncommitted changes in the working directory:');
    console.error(status);
    console.error('Please commit or stash them before running this script, or use --force to ignore.');
    
    if (!process.argv.includes('--force')) {
      process.exit(1);
    }
  }
} catch (error) {
  console.error('Error checking git status:', error.message);
  process.exit(1);
}

execSync('git add package.json');
execSync(`git commit -m "chore(release): ${newVersion} [skip ci]"`);

// Check if the tag already exists
let tagExists = false;
try {
  const tagCheck = execSync(`git tag -l v${newVersion}`).toString().trim();
  tagExists = tagCheck === `v${newVersion}`;
} catch (error) {
  // Tag doesn't exist
}

if (tagExists) {
  console.log(`Tag v${newVersion} already exists, skipping tag creation`);
} else {
  // Create a git tag
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
  console.log(`Created git tag: v${newVersion}`);
}

// Ask if the user wants to push the changes
const args = process.argv.slice(2);
const shouldPush = args.includes('--push');

if (shouldPush) {
  console.log('Pushing changes to remote...');
  execSync('git push origin HEAD');
  execSync('git push origin --tags');
  console.log('Changes pushed to remote');
} else {
  console.log('');
  console.log('Changes committed locally. To push to remote, run:');
  console.log('  git push origin HEAD');
  console.log('  git push origin --tags');
  console.log('');
  console.log('Or run this script with the --push flag:');
  console.log('  bun run scripts/manual-patch-release.js --push');
}
