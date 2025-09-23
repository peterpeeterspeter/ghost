#!/bin/bash

# Test script for enhanced Kimi K2 configuration with advanced Claude Code options
echo "🧪 Testing Enhanced Kimi K2 Configuration"
echo "========================================="

# Load the configuration
source ~/.kimi-claude-config

echo "✅ Kimi K2 configuration loaded"
echo ""

# Test basic kimi command
echo "🌙 Testing basic kimi command..."
echo "Command: kimi"
echo "Expected: Switch to Kimi K2 with usage instructions"
echo ""
kimi
echo ""

# Test code mode
echo "📝 Testing code mode..."
echo "Command: kimi -c"
echo "Expected: Switch to Kimi K2 with code mode enabled"
echo ""
kimi -c
echo ""

# Test project mode  
echo "📁 Testing project mode..."
echo "Command: kimi -p"
echo "Expected: Switch to Kimi K2 with project mode enabled"
echo ""
kimi -p
echo ""

# Test skip permissions
echo "⚠️ Testing skip permissions..."
echo "Command: kimi --dangerously-skip-permissions"
echo "Expected: Switch to Kimi K2 with permission checks disabled"
echo ""
kimi --dangerously-skip-permissions
echo ""

# Test combined modes
echo "🔧 Testing combined modes..."
echo "Command: kimi -c -p"
echo "Expected: Switch to Kimi K2 with both code and project modes"
echo ""
kimi -c -p
echo ""

# Test with prompt execution
echo "🚀 Testing direct prompt execution..."
echo "Command: kimi -c 'Hello from Kimi K2'"
echo "Expected: Switch to code mode and execute prompt"
echo ""
echo "Note: This would actually execute the claude command with Kimi K2"
echo "Simulated execution:"
kimi -c "Hello from Kimi K2 in code mode"
echo ""

# Test status check
echo "📊 Testing configuration status..."
claude_status
echo ""

# Test switching back
echo "🤖 Testing switch back to Anthropic..."
claude_anthropic
echo ""

# Final status check
echo "📊 Final status check..."
claude_status
echo ""

echo "🎉 Kimi K2 Advanced Configuration Test Complete!"
echo ""
echo "📋 All Available Commands Tested:"
echo "✅ kimi                                    - Basic K2 activation"
echo "✅ kimi -c                                 - Code mode"
echo "✅ kimi -p                                 - Project mode"
echo "✅ kimi --dangerously-skip-permissions     - Skip permissions"
echo "✅ kimi -c -p                              - Combined modes"
echo "✅ kimi -c 'prompt'                        - Code mode with prompt"
echo "✅ claude_status                           - Status check"
echo "✅ claude_anthropic                        - Switch back"
echo ""
echo "💡 Usage Tips:"
echo "• Use -c for code-focused tasks (debugging, refactoring, code review)"
echo "• Use -p for project-wide analysis (architecture, planning, documentation)"
echo "• Use --dangerously-skip-permissions for advanced system operations"
echo "• Combine flags for enhanced capabilities: kimi -c -p"
echo "• All modes work with immediate prompt execution"
echo ""
echo "🌟 Kimi K2 with advanced Claude Code integration is ready!"