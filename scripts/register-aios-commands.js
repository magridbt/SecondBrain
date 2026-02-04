#!/usr/bin/env node

/**
 * AIOS Agent Command Registration Script
 * Registers all AIOS agents as slash commands in Claude Code
 * 
 * Usage: node scripts/register-aios-commands.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_CONFIG_PATH = path.join(os.homedir(), '.claude.json');
const AGENTS = [
  { id: 'dev', name: 'Dev', description: 'Developer Agent for code implementation' },
  { id: 'pm', name: 'PM (Morgan)', description: 'Product Manager for strategy' },
  { id: 'po', name: 'PO (Pax)', description: 'Product Owner for prioritization' },
  { id: 'architect', name: 'Architect (Aria)', description: 'System design and architecture' },
  { id: 'qa', name: 'QA', description: 'QA Agent for testing' },
  { id: 'sm', name: 'SM (River)', description: 'Scrum Master for agile management' },
  { id: 'analyst', name: 'Analyst (Atlas)', description: 'Analyst for research' },
  { id: 'aios-master', name: 'AIOS Master (Orion)', description: 'Master Orchestrator' }
];

function registerCommands() {
  try {
    console.log('📋 Registering AIOS Agent Commands...\n');
    
    // Read existing Claude config
    let config = {};
    if (fs.existsSync(CLAUDE_CONFIG_PATH)) {
      const content = fs.readFileSync(CLAUDE_CONFIG_PATH, 'utf-8');
      config = JSON.parse(content);
    }
    
    // Initialize custom commands section
    if (!config.customCommands) {
      config.customCommands = {};
    }
    
    // Register each agent as a command
    AGENTS.forEach(agent => {
      config.customCommands[`AIOS:agents:${agent.id}`] = {
        name: agent.name,
        description: agent.description,
        agent: agent.id,
        action: 'activate-agent'
      };
      console.log(`✅ Registered: /AIOS:agents:${agent.id} (${agent.name})`);
    });
    
    // Write updated config
    fs.writeFileSync(CLAUDE_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    
    console.log('\n✅ All AIOS agents registered successfully!');
    console.log('\nYou can now use: /AIOS:agents:dev, /AIOS:agents:pm, etc.');
    
  } catch (error) {
    console.error('❌ Error registering commands:', error.message);
    process.exit(1);
  }
}

registerCommands();
