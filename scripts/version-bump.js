#!/usr/bin/env bun

/**
 * Version Bump Script
 * 
 * This script updates the version in package.json and generates a CHANGELOG entry.
 * Usage: bun run scripts/version-bump.js [major|minor|patch] [--message "Your changelog message"]
 * 
 * Example: bun run scripts/version-bump.js minor --message "Added version management module"
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: Version bump type is required (major, minor, or patch)');
  process.exit(1);
}

const bumpType = args[0].toLowerCase();
if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Error: Version bump type must be one of: major, minor, patch');
  process.exit(1);
}

// Get changelog message
let changelogMessage = '';
const messageIndex = args.indexOf('--message');
if (messageIndex !== -1 && args.length > messageIndex + 1) {
  changelogMessage = args[messageIndex + 1];
} else {
  console.error('Error: Changelog message is required (--message "Your message")');
  process.exit(1);
}

// Read package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
let packageJson;
try {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(packageJsonContent);
} catch (error) {
  console.error('Error reading package.json:', error.message);
  process.exit(1);
}

// Parse current version
const currentVersion = packageJson.version || '1.0.0';
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Calculate new version
let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`Updated version in package.json: ${currentVersion} -> ${newVersion}`);

// Create CHANGELOG.md if it doesn't exist
const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
if (!fs.existsSync(changelogPath)) {
  const initialContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
  fs.writeFileSync(changelogPath, initialContent);
  console.log('Created CHANGELOG.md');
}

// Read current changelog
const changelog = fs.readFileSync(changelogPath, 'utf8');

// Get current date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

// Determine change type based on bump type
let changeType;
switch (bumpType) {
  case 'major':
    changeType = 'Changed';
    break;
  case 'minor':
    changeType = 'Added';
    break;
  case 'patch':
    changeType = 'Fixed';
    break;
}

// Create new changelog entry
const newEntry = `
## [${newVersion}] - ${today}

### ${changeType}
- ${changelogMessage}

`;

// Find position to insert new entry (after header)
const headerEndPos = changelog.indexOf('## [');
if (headerEndPos === -1) {
  // No existing entries, add after initial content
  const updatedChangelog = changelog + newEntry;
  fs.writeFileSync(changelogPath, updatedChangelog);
} else {
  // Insert before first entry
  const updatedChangelog = 
    changelog.substring(0, headerEndPos) + 
    newEntry + 
    changelog.substring(headerEndPos);
  fs.writeFileSync(changelogPath, updatedChangelog);
}

console.log(`Updated CHANGELOG.md with entry for version ${newVersion}`);

// Suggest git commands
console.log('\nNext steps:');
console.log('1. Review the changes:');
console.log('   git diff package.json CHANGELOG.md');
console.log('2. Commit the version bump:');
console.log(`   git commit -m "Bump version to ${newVersion}"`);
console.log('3. Create a git tag:');
console.log(`   git tag -a v${newVersion} -m "Version ${newVersion}"`);
console.log('4. Push changes and tags:');
console.log('   git push && git push --tags');
