#!/bin/bash

# Setup script for using Kimi (Moonshot AI) with Claude Code
# This configures Claude Code CLI to use Kimi as an alternative provider

echo "🌙 Setting up Kimi (Moonshot AI) for Claude Code CLI"
echo "=================================================="

# Set the Kimi API key
export KIMI_API_KEY="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"

echo "✅ KIMI_API_KEY configured: ${KIMI_API_KEY:0:20}..."

# Create the kimi() function for easy switching
echo ""
echo "📝 Creating kimi() function for Claude Code..."

# Function definition
cat << 'EOF' > ~/.kimi-claude-config
# Kimi (Moonshot AI) configuration for Claude Code
kimi() {
    echo "🌙 Switching Claude Code to use Kimi (Moonshot AI)..."
    export ANTHROPIC_BASE_URL="https://api.moonshot.ai/anthropic"
    export ANTHROPIC_AUTH_TOKEN="$KIMI_API_KEY"
    echo "✅ Claude Code now configured to use Kimi API"
    echo "🚀 You can now use 'claude' commands normally - they'll route to Kimi"
    
    # Optional: Run claude command if provided
    if [ $# -gt 0 ]; then
        claude "$@"
    fi
}

# Function to switch back to regular Claude
claude_anthropic() {
    echo "🤖 Switching Claude Code back to Anthropic..."
    unset ANTHROPIC_BASE_URL
    unset ANTHROPIC_AUTH_TOKEN
    echo "✅ Claude Code now configured to use Anthropic API"
}

# Function to check current configuration
claude_status() {
    echo "📊 Current Claude Code Configuration:"
    if [ -n "$ANTHROPIC_BASE_URL" ]; then
        echo "🌙 Provider: Kimi (Moonshot AI)"
        echo "🔗 Base URL: $ANTHROPIC_BASE_URL"
        echo "🔑 Auth Token: ${ANTHROPIC_AUTH_TOKEN:0:20}..."
    else
        echo "🤖 Provider: Anthropic (Default)"
        echo "🔗 Base URL: Default (api.anthropic.com)"
    fi
}
EOF

echo "✅ Configuration functions created in ~/.kimi-claude-config"

# Add to shell profile if not already present
if ! grep -q "source ~/.kimi-claude-config" ~/.zshrc 2>/dev/null; then
    echo ""
    echo "📝 Adding to ~/.zshrc..."
    echo "# Kimi Claude Code configuration" >> ~/.zshrc
    echo "export KIMI_API_KEY=\"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\"" >> ~/.zshrc
    echo "source ~/.kimi-claude-config" >> ~/.zshrc
    echo "✅ Added to ~/.zshrc"
else
    echo "📝 Already configured in ~/.zshrc"
fi

# Also check ~/.bash_profile for bash users
if [ -f ~/.bash_profile ] && ! grep -q "source ~/.kimi-claude-config" ~/.bash_profile; then
    echo ""
    echo "📝 Adding to ~/.bash_profile..."
    echo "# Kimi Claude Code configuration" >> ~/.bash_profile
    echo "export KIMI_API_KEY=\"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\"" >> ~/.bash_profile
    echo "source ~/.kimi-claude-config" >> ~/.bash_profile
    echo "✅ Added to ~/.bash_profile"
fi

echo ""
echo "🎉 Kimi configuration complete!"
echo ""
echo "📋 Available Commands:"
echo "   kimi                  - Switch Claude Code to use Kimi API"
echo "   kimi 'your prompt'    - Switch to Kimi and run a prompt"
echo "   claude_anthropic      - Switch back to Anthropic Claude"
echo "   claude_status         - Check current provider configuration"
echo ""
echo "🔄 To activate now, run:"
echo "   source ~/.kimi-claude-config"
echo "   kimi"
echo ""
echo "🌟 After activation, all 'claude' commands will use Kimi until you run 'claude_anthropic'"