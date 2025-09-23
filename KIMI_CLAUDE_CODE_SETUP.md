# Kimi (Moonshot AI) Configuration for Claude Code

This guide explains how to configure Claude Code CLI to use Kimi (Moonshot AI) as an alternative AI provider, useful for avoiding rate limits or accessing different model capabilities.

## 🌙 Quick Setup

The setup has been completed automatically. Here's what was configured:

### API Key Configuration
```bash
export KIMI_API_KEY="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"
```

### Available Commands

After running the setup, you have these enhanced commands available:

```bash
# Basic Kimi K2 activation
kimi

# Advanced modes with latest Kimi K2 model
kimi -c                                 # Code mode
kimi -p                                 # Project mode
kimi --dangerously-skip-permissions     # Skip permission checks

# Combined modes
kimi -c -p                              # Code + Project modes
kimi -c "Review this function"          # Code mode with immediate prompt
kimi -p "Analyze project architecture"  # Project mode with prompt
kimi --dangerously-skip-permissions "Advanced task"  # Skip permissions with prompt

# Management commands
claude_anthropic                        # Switch back to Anthropic Claude
claude_status                          # Check current provider configuration
```

## 🚀 Usage Instructions

### 1. Basic Kimi K2 Activation
```bash
kimi
```
This configures Claude Code to route all requests to Kimi K2's API endpoint.

### 2. Advanced Mode Usage

#### Code Mode (-c)
Optimized for code-focused tasks:
```bash
kimi -c
claude "Review this function for bugs"
claude "Refactor this component"
```

#### Project Mode (-p)  
Optimized for project-wide analysis:
```bash
kimi -p
claude "Analyze the architecture of this codebase"
claude "Create a development roadmap"
```

#### Skip Permissions (--dangerously-skip-permissions)
For advanced operations that bypass safety checks:
```bash
kimi --dangerously-skip-permissions
claude "Perform system-level analysis"
```

#### Combined Modes
Use multiple modes together:
```bash
kimi -c -p
claude "Refactor this entire project with best practices"
```

### 3. Direct Prompt Execution
Execute prompts immediately with mode switching:
```bash
kimi -c "Debug this function and suggest improvements"
kimi -p "What's the overall quality of this codebase?"
kimi --dangerously-skip-permissions "Analyze system dependencies"
```

### 4. Check Current Provider
```bash
claude_status
```

Example output when using Kimi K2:
```
📊 Current Claude Code Configuration:
🌙 Provider: Kimi K2 (Moonshot AI)
🔗 Base URL: https://api.moonshot.ai/anthropic
🔑 Auth Token: sk-or-v1-4a9e2313ff0...
```

### 5. Switch Back to Anthropic
```bash
claude_anthropic
```

## 🔧 Technical Details

### How It Works
When you run `kimi`, it sets these environment variables:
```bash
export ANTHROPIC_BASE_URL="https://api.moonshot.ai/anthropic"
export ANTHROPIC_AUTH_TOKEN="$KIMI_API_KEY"
```

Claude Code respects these environment variables and routes requests to the specified endpoint with the provided authentication.

### API Endpoints
- **Kimi**: `https://api.moonshot.ai/anthropic`
- **Anthropic**: `https://api.anthropic.com` (default)

### Configuration Files
- **Functions**: `~/.kimi-claude-config` - Contains the kimi(), claude_anthropic(), and claude_status() functions
- **Shell Integration**: Added to `~/.zshrc` and `~/.bash_profile` for automatic loading

## 🎯 Use Cases

### Rate Limit Avoidance
If you hit rate limits with Anthropic:
```bash
kimi  # Switch to Kimi
claude "Continue your work here"
```

### Model Comparison
Compare responses between providers:
```bash
# Get response from Anthropic
claude "Explain quantum computing"

# Switch to Kimi and ask the same question
kimi "Explain quantum computing"

# Switch back
claude_anthropic
```

### Development vs Production
Use different providers for different environments:
```bash
# Development with Kimi
kimi
claude "Help debug this function"

# Production analysis with Anthropic
claude_anthropic
claude "Review this production code"
```

## 🔄 Automatic Loading

The configuration is automatically loaded when you start a new terminal session. If you need to reload manually:

```bash
source ~/.kimi-claude-config
```

## 🧪 Testing

Run the test script to verify configuration:
```bash
./test-kimi-claude-code.sh
```

## ⚠️ Important Notes

1. **API Compatibility**: Kimi uses Anthropic-compatible API endpoints, so Claude Code commands work seamlessly
2. **Rate Limits**: Each provider has different rate limits - monitor usage accordingly
3. **Model Differences**: Responses may vary between Kimi and Anthropic models
4. **Persistence**: Provider settings persist until you switch providers or restart your terminal

## 🎉 Benefits

- **No Rate Limit Interruptions**: Switch providers when hitting limits
- **Cost Optimization**: Use different providers based on cost considerations
- **Model Diversity**: Access different AI model strengths
- **Seamless Integration**: No changes needed to existing Claude Code workflows
- **Instant Switching**: Change providers with a single command

## 📋 Quick Reference

| Command | Purpose |
|---------|---------|
| `kimi` | Switch to Kimi (Moonshot AI) |
| `claude_anthropic` | Switch to Anthropic |
| `claude_status` | Check current provider |
| `claude "prompt"` | Use current provider |

The setup is complete and ready to use! 🚀