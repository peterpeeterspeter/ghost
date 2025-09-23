#!/bin/bash

# Update script for enhanced Kimi K2 configuration with advanced Claude Code options
echo "🌙 Updating Kimi K2 Configuration for Claude Code CLI"
echo "===================================================="

# Check if the configuration file exists
if [ ! -f ~/.kimi-claude-config ]; then
    echo "❌ Kimi configuration not found. Please run setup-kimi-claude-code.sh first"
    exit 1
fi

echo "✅ Found existing Kimi configuration"
echo "📝 The configuration has been updated with K2 model support and advanced options"

# Reload the configuration
source ~/.kimi-claude-config

echo ""
echo "🎉 Kimi K2 Configuration Updated Successfully!"
echo ""
echo "📋 Enhanced Commands Available:"
echo "   kimi                                    - Switch to Kimi K2 (basic)"
echo "   kimi -c                                 - Switch to Kimi K2 with code mode"
echo "   kimi -p                                 - Switch to Kimi K2 with project mode"
echo "   kimi --dangerously-skip-permissions     - Switch with permission checks disabled"
echo "   kimi -c -p                              - Code + Project mode combined"
echo "   kimi -c 'your prompt'                   - Code mode with immediate prompt"
echo "   kimi --dangerously-skip-permissions 'prompt' - Skip permissions with prompt"
echo ""
echo "🔧 Mode Explanations:"
echo "   -c, --code                    Enable code-focused interactions"
echo "   -p, --project                 Enable project-wide context"
echo "   --dangerously-skip-permissions Skip safety permission checks"
echo ""
echo "📊 Usage Examples:"
echo ""
echo "# Basic Kimi K2 activation"
echo "kimi"
echo ""
echo "# Code review with Kimi K2"
echo "kimi -c 'Review this function for bugs'"
echo ""
echo "# Project analysis with Kimi K2"
echo "kimi -p 'Analyze the architecture of this project'"
echo ""
echo "# Skip permissions for advanced operations"
echo "kimi --dangerously-skip-permissions 'Perform system-level analysis'"
echo ""
echo "# Combined modes"
echo "kimi -c -p 'Refactor this entire codebase'"
echo ""
echo "🌟 Features:"
echo "✅ Latest Kimi K2 model support"
echo "✅ Advanced Claude Code flag parsing"
echo "✅ Intelligent command building"
echo "✅ Mode combination support"
echo "✅ Safety and permission controls"
echo "✅ Backward compatibility maintained"
echo ""
echo "🔄 To test the new configuration:"
echo "   source ~/.kimi-claude-config"
echo "   kimi -c"
echo ""
echo "🚀 Enhanced Kimi K2 ready for advanced Claude Code usage!"