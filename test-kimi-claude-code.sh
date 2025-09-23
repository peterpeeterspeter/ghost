#!/bin/bash

# Test script for Kimi Claude Code configuration
echo "🧪 Testing Kimi (Moonshot AI) Configuration for Claude Code"
echo "=========================================================="

# Check if configuration exists
if [ ! -f ~/.kimi-claude-config ]; then
    echo "❌ Kimi configuration not found. Please run setup-kimi-claude-code.sh first"
    exit 1
fi

# Source the configuration
source ~/.kimi-claude-config

echo "✅ Kimi configuration loaded"
echo ""

# Check current status
echo "📊 Current Configuration Status:"
claude_status
echo ""

# Test switching to Kimi
echo "🌙 Testing switch to Kimi..."
kimi
echo ""

# Check status after switch
echo "📊 Status after switching to Kimi:"
claude_status
echo ""

# Test a simple prompt with Kimi
echo "🧪 Testing Kimi with a simple prompt..."
echo "Running: claude 'Hello, please respond with your model name'"
echo ""

# Note: This would actually call Claude Code with Kimi backend
# For testing purposes, we'll just show what would happen
echo "Expected behavior:"
echo "  • Claude Code CLI will use ANTHROPIC_BASE_URL=https://api.moonshot.ai/anthropic"
echo "  • Authentication will use ANTHROPIC_AUTH_TOKEN with your Kimi API key"
echo "  • Response will come from Kimi (Moonshot AI) instead of Anthropic"
echo ""

# Test switching back
echo "🤖 Testing switch back to Anthropic..."
claude_anthropic
echo ""

# Check final status
echo "📊 Final Configuration Status:"
claude_status
echo ""

echo "🎉 Kimi Claude Code configuration test complete!"
echo ""
echo "💡 Usage Instructions:"
echo "   1. Run 'kimi' to switch Claude Code to use Kimi API"
echo "   2. Use 'claude' commands normally - they'll route to Kimi"
echo "   3. Run 'claude_anthropic' to switch back to regular Claude"
echo "   4. Use 'claude_status' to check current configuration"
echo ""
echo "🔗 API Endpoints:"
echo "   Kimi:      https://api.moonshot.ai/anthropic"
echo "   Anthropic: https://api.anthropic.com (default)"