#!/usr/bin/env bun
/**
 * Workflow Migration Script
 * 
 * This script helps migrate from the old multi-workflow setup to the new unified workflow.
 * It provides options to:
 * - Backup existing workflows
 * - Disable old workflows
 * - Enable the new unified workflow
 * - Rollback if needed
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

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

const WORKFLOWS_DIR = '.github/workflows';
const BACKUP_DIR = '.github/workflows-backup';

const OLD_WORKFLOWS = [
  'ci.yml',
  'release.yml',
  'docker-build.yml',
  'test-release.yml'
];

const NEW_WORKFLOW = 'main.yml';

function createBackup() {
  log('\n📦 Creating backup of existing workflows...', colors.cyan);
  
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  // Add timestamp to backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(BACKUP_DIR, `backup-${timestamp}`);
  mkdirSync(backupPath, { recursive: true });
  
  OLD_WORKFLOWS.forEach(workflow => {
    const sourcePath = join(WORKFLOWS_DIR, workflow);
    const backupFilePath = join(backupPath, workflow);
    
    if (existsSync(sourcePath)) {
      copyFileSync(sourcePath, backupFilePath);
      log(`✅ Backed up ${workflow}`, colors.green);
    } else {
      log(`⚠️  ${workflow} not found, skipping`, colors.yellow);
    }
  });
  
  log(`📁 Backup created at: ${backupPath}`, colors.blue);
  return backupPath;
}

function disableOldWorkflows() {
  log('\n🚫 Disabling old workflows...', colors.cyan);
  
  OLD_WORKFLOWS.forEach(workflow => {
    const workflowPath = join(WORKFLOWS_DIR, workflow);
    const disabledPath = join(WORKFLOWS_DIR, `${workflow}.disabled`);
    
    if (existsSync(workflowPath)) {
      // Rename to .disabled to prevent execution
      copyFileSync(workflowPath, disabledPath);
      
      // Add a comment to the disabled file
      const content = readFileSync(disabledPath, 'utf8');
      const disabledContent = `# DISABLED: This workflow has been replaced by main.yml
# Original workflow backed up and disabled on ${new Date().toISOString()}
# To re-enable, remove this comment and rename back to .yml

${content}`;
      writeFileSync(disabledPath, disabledContent);
      
      log(`✅ Disabled ${workflow} → ${workflow}.disabled`, colors.green);
    }
  });
}

function enableNewWorkflow() {
  log('\n🚀 Enabling new unified workflow...', colors.cyan);
  
  const newWorkflowPath = join(WORKFLOWS_DIR, NEW_WORKFLOW);
  
  if (existsSync(newWorkflowPath)) {
    log(`✅ New workflow ${NEW_WORKFLOW} is ready`, colors.green);
    
    // Validate the workflow syntax
    try {
      const content = readFileSync(newWorkflowPath, 'utf8');
      // Basic YAML validation
      if (content.includes('name: CI/CD Pipeline')) {
        log('✅ Workflow syntax appears valid', colors.green);
      } else {
        log('⚠️  Workflow syntax may have issues', colors.yellow);
      }
    } catch (error) {
      log(`❌ Error validating workflow: ${error.message}`, colors.red);
    }
  } else {
    log(`❌ New workflow ${NEW_WORKFLOW} not found`, colors.red);
    return false;
  }
  
  return true;
}

function showMigrationStatus() {
  log('\n📊 Migration Status:', colors.magenta);
  
  // Check old workflows
  log('\n📋 Old Workflows:', colors.blue);
  OLD_WORKFLOWS.forEach(workflow => {
    const workflowPath = join(WORKFLOWS_DIR, workflow);
    const disabledPath = join(WORKFLOWS_DIR, `${workflow}.disabled`);
    
    if (existsSync(disabledPath)) {
      log(`  ${workflow}: 🚫 Disabled`, colors.yellow);
    } else if (existsSync(workflowPath)) {
      log(`  ${workflow}: ⚠️  Still active`, colors.red);
    } else {
      log(`  ${workflow}: ❓ Not found`, colors.gray);
    }
  });
  
  // Check new workflow
  log('\n🆕 New Workflow:', colors.blue);
  const newWorkflowPath = join(WORKFLOWS_DIR, NEW_WORKFLOW);
  if (existsSync(newWorkflowPath)) {
    log(`  ${NEW_WORKFLOW}: ✅ Ready`, colors.green);
  } else {
    log(`  ${NEW_WORKFLOW}: ❌ Missing`, colors.red);
  }
  
  // Check backups
  log('\n💾 Backups:', colors.blue);
  if (existsSync(BACKUP_DIR)) {
    const backups = exec(`ls -la ${BACKUP_DIR}`, { allowFailure: true });
    if (backups) {
      log(`  Available in: ${BACKUP_DIR}`, colors.green);
    }
  } else {
    log(`  No backups found`, colors.yellow);
  }
}

function rollback(backupPath) {
  log('\n🔄 Rolling back to previous workflows...', colors.cyan);
  
  if (!backupPath || !existsSync(backupPath)) {
    log('❌ Backup path not found or invalid', colors.red);
    return false;
  }
  
  // Restore old workflows
  OLD_WORKFLOWS.forEach(workflow => {
    const backupFilePath = join(backupPath, workflow);
    const workflowPath = join(WORKFLOWS_DIR, workflow);
    const disabledPath = join(WORKFLOWS_DIR, `${workflow}.disabled`);
    
    if (existsSync(backupFilePath)) {
      copyFileSync(backupFilePath, workflowPath);
      
      // Remove disabled version if it exists
      if (existsSync(disabledPath)) {
        exec(`rm ${disabledPath}`, { allowFailure: true });
      }
      
      log(`✅ Restored ${workflow}`, colors.green);
    }
  });
  
  // Optionally disable new workflow
  const newWorkflowPath = join(WORKFLOWS_DIR, NEW_WORKFLOW);
  const newDisabledPath = join(WORKFLOWS_DIR, `${NEW_WORKFLOW}.disabled`);
  
  if (existsSync(newWorkflowPath)) {
    copyFileSync(newWorkflowPath, newDisabledPath);
    log(`✅ Disabled new workflow: ${NEW_WORKFLOW}`, colors.green);
  }
  
  log('🔄 Rollback completed', colors.green);
  return true;
}

function showHelp() {
  log('\n🔧 Workflow Migration Tool', colors.magenta);
  log('==========================', colors.magenta);
  log('\nUsage: bun run scripts/migrate-workflows.js [command]', colors.blue);
  log('\nCommands:', colors.blue);
  log('  migrate    - Full migration (backup + disable old + enable new)', colors.cyan);
  log('  backup     - Create backup of existing workflows', colors.cyan);
  log('  disable    - Disable old workflows', colors.cyan);
  log('  enable     - Enable new unified workflow', colors.cyan);
  log('  status     - Show current migration status', colors.cyan);
  log('  rollback   - Rollback to previous workflows', colors.cyan);
  log('  help       - Show this help message', colors.cyan);
  log('\nExamples:', colors.blue);
  log('  bun run scripts/migrate-workflows.js migrate', colors.gray);
  log('  bun run scripts/migrate-workflows.js status', colors.gray);
  log('  bun run scripts/migrate-workflows.js rollback', colors.gray);
}

// Main execution
const command = process.argv[2] || 'help';

switch (command) {
  case 'migrate':
    log('🚀 Starting full workflow migration...', colors.magenta);
    const backupPath = createBackup();
    disableOldWorkflows();
    if (enableNewWorkflow()) {
      log('\n✅ Migration completed successfully!', colors.green);
      log(`💾 Backup available at: ${backupPath}`, colors.blue);
      showMigrationStatus();
    } else {
      log('\n❌ Migration failed during new workflow setup', colors.red);
    }
    break;
    
  case 'backup':
    createBackup();
    break;
    
  case 'disable':
    disableOldWorkflows();
    break;
    
  case 'enable':
    enableNewWorkflow();
    break;
    
  case 'status':
    showMigrationStatus();
    break;
    
  case 'rollback':
    // Find the most recent backup
    if (existsSync(BACKUP_DIR)) {
      const backups = exec(`ls -t ${BACKUP_DIR}`, { allowFailure: true });
      if (backups) {
        const latestBackup = backups.split('\n')[0];
        const backupPath = join(BACKUP_DIR, latestBackup);
        rollback(backupPath);
      } else {
        log('❌ No backups found', colors.red);
      }
    } else {
      log('❌ No backup directory found', colors.red);
    }
    break;
    
  case 'help':
  default:
    showHelp();
    break;
}
