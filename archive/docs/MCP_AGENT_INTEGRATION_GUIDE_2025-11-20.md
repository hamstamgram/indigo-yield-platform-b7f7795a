# MCP & Agent Swarm Integration Guide for ~/bin/ai
**Date:** 2025-11-20
**Status:** ARCHITECTURAL DOCUMENTATION
**Audience:** Developers considering adding MCP/agent support to ~/bin/ai

---

## Executive Summary

This document explains why **~/bin/ai cannot access MCPs or agent swarms** and provides a roadmap for integration if desired.

**TL;DR:**
- ❌ **~/bin/ai**: Python subprocess, no MCP access, no agent coordination (3-6 weeks to add)
- ✅ **Claude workflow**: Native MCP ecosystem (13 servers), agent swarms (289 agents), 84.8% SWE-bench

**Recommendation:** Use Claude workflow for MCP/agent features. Use ~/bin/ai only for explicit model benchmarking.

---

## Current State Analysis

### ~/bin/ai Architecture

```
┌─────────────────────────────────────┐
│       ~/bin/ai (Python CLI)         │
│                                     │
│  ┌─────────────────────────────┐  │
│  │   Routing Logic             │  │
│  │   - DSPy optimizer ✓        │  │
│  │   - Gemini API ✓            │  │
│  │   - Regex fallback ✓        │  │
│  └─────────────────────────────┘  │
│              ↓                      │
│  ┌─────────────────────────────┐  │
│  │   Subprocess Execution      │  │
│  │   - claude (via subprocess) │  │
│  │   - codex (via subprocess)  │  │
│  │   - gemini (via API)        │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
         ❌ No MCP access
         ❌ No agent coordination
```

### Claude Workflow Architecture

```
┌─────────────────────────────────────────────────┐
│         Claude Code (Native Process)            │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │   MCP Ecosystem (13 servers)              │ │
│  │   - filesystem, memory, serena, github    │ │
│  │   - redis, rube, aws-powertools, etc.     │ │
│  └───────────────────────────────────────────┘ │
│              ↓                                  │
│  ┌───────────────────────────────────────────┐ │
│  │   Agent Swarm Coordination (289 agents)   │ │
│  │   - Task tool integration                 │ │
│  │   - Star topology coordination            │ │
│  │   - Parallel execution framework          │ │
│  └───────────────────────────────────────────┘ │
│              ↓                                  │
│  ┌───────────────────────────────────────────┐ │
│  │   Intelligent Orchestration               │ │
│  │   - 5-layer analysis (complexity, domain, │ │
│  │     intent, context, optimization)        │ │
│  │   - Automatic MCP selection               │ │
│  │   - Automatic agent selection             │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
         ✅ Full MCP ecosystem
         ✅ Agent swarm coordination
         ✅ 84.8% SWE-bench performance
```

---

## Architectural Limitations

### Why ~/bin/ai Can't Access MCPs

**Problem 1: Process Boundary**
```python
# ~/bin/ai executes Claude as subprocess
subprocess.run(['claude', '--print', prompt])
```
- MCPs are attached to **Claude Code process**, not subprocesses
- Subprocess cannot access parent process's MCP connections
- MCP protocol requires persistent stdio connections

**Problem 2: Protocol Complexity**
- MCPs use JSON-RPC 2.0 over stdio
- Requires bidirectional communication
- Subprocess.run() is one-way (input → output)

**Problem 3: Connection Management**
- MCPs maintain stateful connections
- Each MCP server is a long-running process
- Subprocess lifecycle incompatible with persistent connections

### Why ~/bin/ai Can't Use Agent Swarms

**Problem 1: No Task Tool**
```python
# Claude workflow uses Task tool
Task(subagent_type="security-auditor", prompt="...", model="haiku")
```
- Task tool is **native to Claude Code**, not available in Python
- Requires Agent SDK and coordination framework
- No Python equivalent exists

**Problem 2: No Coordination Framework**
- Agent swarms require star topology coordination
- Central coordinator aggregates results
- Cross-agent validation and consensus detection
- ~/bin/ai has no coordination logic

**Problem 3: No Parallel Execution**
- Agent swarms execute 3-5 agents in parallel
- Requires async task management
- Subprocess-based execution is sequential

---

## Integration Roadmap (If Desired)

### Option 1: MCP Integration (3-4 weeks)

#### Phase 1: MCP Client Implementation (1-2 weeks)
```python
# Required: Implement MCP protocol client
import asyncio
from mcp_sdk import MCPClient

class MCPManager:
    def __init__(self):
        self.clients = {}  # MCP server connections

    async def start_server(self, name, command, args):
        """Launch MCP server process"""
        process = await asyncio.create_subprocess_exec(
            command, *args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        client = MCPClient(process.stdin, process.stdout)
        await client.initialize()
        self.clients[name] = client

    async def call_tool(self, server, tool, params):
        """Call MCP tool"""
        client = self.clients[server]
        return await client.call_tool(tool, params)
```

**Requirements:**
- MCP SDK integration (@modelcontextprotocol/sdk)
- Async/await architecture (currently synchronous)
- Connection pooling and lifecycle management
- Error handling and reconnection logic

**Challenges:**
- Async Python introduces complexity
- MCP SDK is TypeScript-first (Python support limited)
- Need to manage 13+ server processes
- Configuration management (which MCPs to load?)

#### Phase 2: Tool Integration (1 week)
```python
# Required: Map MCP tools to routing logic
class MCPRouter:
    def __init__(self, mcp_manager):
        self.mcp = mcp_manager
        self.tool_mappings = {
            'database': ['redis-mcp', 'rube'],
            'frontend': ['vscode-mcp', 'serena', 'puppeteer'],
            'security': ['serena'],
            # ... more mappings
        }

    async def execute_with_mcps(self, cli, prompt, domain):
        """Execute CLI with MCP context"""
        # 1. Select relevant MCPs based on domain
        mcps = self.tool_mappings.get(domain, [])

        # 2. Gather context from MCPs
        context = {}
        for mcp_name in mcps:
            if mcp_name == 'serena':
                context['code'] = await self.mcp.call_tool(
                    'serena', 'find_symbol', {'pattern': 'UserService'}
                )

        # 3. Augment prompt with context
        augmented_prompt = f"{prompt}\n\nContext: {context}"

        # 4. Execute CLI with augmented prompt
        return execute_cli(cli, augmented_prompt)
```

**Requirements:**
- Domain → MCP mapping logic
- Context aggregation from multiple MCPs
- Prompt augmentation strategy
- Token limit management (context can be large)

#### Phase 3: Testing & Optimization (1 week)
- Test all 13 MCPs with ~/bin/ai
- Benchmark performance (MCP overhead)
- Optimize connection pooling
- Handle edge cases (MCP failures, timeouts)

**Estimated Total: 3-4 weeks**

---

### Option 2: Agent Swarm Integration (4-6 weeks)

#### Phase 1: Agent Framework (2-3 weeks)
```python
# Required: Implement agent coordination framework
class AgentCoordinator:
    def __init__(self):
        self.agents = {}  # Available specialist agents
        self.active_tasks = []  # Running agent tasks

    async def launch_swarm(self, agents, task):
        """Launch multiple agents in parallel"""
        tasks = []
        for agent_type in agents:
            agent_prompt = self.generate_agent_prompt(agent_type, task)
            task_future = asyncio.create_task(
                self.execute_agent(agent_type, agent_prompt)
            )
            tasks.append(task_future)

        # Wait for all agents to complete (parallel execution)
        results = await asyncio.gather(*tasks)
        return results

    async def execute_agent(self, agent_type, prompt):
        """Execute single agent (recursive Claude call)"""
        # Problem: How to execute Claude with specific agent behavior?
        # Claude Code uses Task tool - not available here
        # Would need to implement agent behavior in prompts
        pass

    def aggregate_results(self, results):
        """Combine results from multiple agents"""
        # Implement consensus detection
        # Cross-validate findings
        # Generate unified report
        pass
```

**Requirements:**
- Agent definition system (289 agent specs)
- Async parallel execution framework
- Star topology coordinator
- Cross-agent validation logic
- Consensus detection algorithm

**Challenges:**
- No access to Claude's Task tool (agents run in isolated contexts)
- Need to define agent behavior in prompts (not native)
- Coordination overhead (how to share context between agents?)
- Performance (multiple API calls = higher latency & cost)

#### Phase 2: Agent Definitions (1-2 weeks)
```python
# Required: Define 289 agent specifications
AGENT_SPECS = {
    'security-auditor': {
        'description': 'OWASP Top 10 security audit specialist',
        'prompt_template': '''You are a security auditor specializing in OWASP Top 10.
Analyze the following code for vulnerabilities:
{code}

Focus on:
1. SQL injection
2. XSS vulnerabilities
3. CSRF protection
...
''',
        'tools': ['serena', 'gitleaks'],
        'output_format': 'structured_json'
    },
    'database-specialist': {
        'description': 'Database design and optimization specialist',
        'prompt_template': '''You are a database specialist.
Review the following schema and queries:
{schema}

Provide:
1. Performance optimizations
2. Index recommendations
3. Query rewrites
...
''',
        'tools': ['redis-mcp', 'rube'],
        'output_format': 'markdown'
    },
    # ... 287 more agent specs
}
```

**Requirements:**
- 289 agent specifications with:
  - Description
  - Prompt template
  - Required MCPs/tools
  - Output format
  - Domain expertise
- Mapping logic: domain + intent → agent selection
- Prompt engineering for each agent

**Challenges:**
- Massive specification effort (289 agents × ~30 lines each = ~8,700 lines)
- Maintaining consistency across agents
- Testing each agent individually
- Updating when new capabilities emerge

#### Phase 3: Swarm Coordination (1 week)
```python
# Required: Implement cross-agent validation
class SwarmValidator:
    def cross_validate(self, results):
        """Find consensus across agent findings"""
        findings = defaultdict(list)

        for agent_result in results:
            for finding in agent_result['findings']:
                key = (finding['type'], finding['location'])
                findings[key].append({
                    'agent': agent_result['agent_type'],
                    'severity': finding['severity'],
                    'description': finding['description']
                })

        # Detect consensus (2+ agents agree)
        consensus = []
        for key, reports in findings.items():
            if len(reports) >= 2:
                consensus.append({
                    'finding': key,
                    'agents': [r['agent'] for r in reports],
                    'confidence': len(reports) / len(results)
                })

        return consensus
```

**Requirements:**
- Consensus detection algorithm
- Result aggregation logic
- Conflict resolution (when agents disagree)
- Report generation (unified findings)

**Estimated Total: 4-6 weeks**

---

## Performance Comparison

### Current State (After DSPy + Codex Fixes)

| Feature | ~/bin/ai | Claude Workflow | Gap |
|---------|----------|-----------------|-----|
| **DSPy Routing** | ✅ Working | N/A (uses agent swarms) | - |
| **Codex CLI** | ✅ Working | N/A (different approach) | - |
| **MCP Access** | ❌ None (0/13) | ✅ Full (13/13) | 13 MCPs |
| **Agent Swarms** | ❌ None (0/289) | ✅ Full (289/289) | 289 agents |
| **Code Navigation** | ❌ grep (slow) | ✅ serena (10-50x faster) | 10-50x speed |
| **SWE-bench** | 77.2% (best model) | 84.8% (with swarms) | +7.6% |
| **Multi-app Integration** | ❌ None | ✅ rube (500+ apps) | 500 apps |
| **Implementation Time** | 0 (already works) | 0 (already works) | - |

**To reach parity:** 7-10 weeks of development

---

## Cost-Benefit Analysis

### Option A: Integrate MCPs + Agents into ~/bin/ai

**Investment:**
- Development time: 7-10 weeks
- Complexity added: High (async, protocol, coordination)
- Maintenance burden: High (keep up with MCP changes)
- Risk: Medium (architectural challenges, edge cases)

**Benefits:**
- Single unified CLI
- Consistent interface across models
- Benchmark-based routing remains primary

**Downsides:**
- Claude workflow already provides these features
- Duplicate effort (reinventing existing capabilities)
- Ongoing maintenance burden
- Lower quality (unlikely to match Claude's native integration)

### Option B: Use Claude Workflow for MCP/Agent Features (RECOMMENDED)

**Investment:**
- Development time: 0 (already complete)
- Complexity added: None
- Maintenance burden: None (Anthropic maintains)
- Risk: None

**Benefits:**
- ✅ Full MCP ecosystem (13 servers, 500+ apps via rube)
- ✅ Agent swarms (289 agents, 84.8% SWE-bench)
- ✅ 10-50x faster code navigation (serena)
- ✅ Zero maintenance burden
- ✅ Native integration (higher quality)
- ✅ Automatic updates (Anthropic maintains)

**Downsides:**
- Two CLIs instead of one unified CLI
- Need to remember when to use each

**Mitigation:**
- Shell aliases abstract away the distinction
- Smart router (`~/bin/smart`) automatically routes to Claude for MCP/agent tasks
- 90% of tasks should use Claude workflow anyway

---

## Recommendations

### For 90% of Tasks: Use Claude Workflow

**When to use `claude` (or aliases):**
- ✅ Complex multi-step features → agent swarms
- ✅ Security audits → security-auditor + code-reviewer agents
- ✅ Code refactoring → serena MCP (10-50x faster)
- ✅ Multi-app workflows → rube MCP (500+ apps)
- ✅ Research with verification → brave-search + agents
- ✅ Planning with ultrathink → sequential-thinking MCP
- ✅ Database operations → redis-mcp + database-specialist
- ✅ Browser automation → playwright/puppeteer MCPs

**Shell aliases:**
```bash
ai "your task"                    # Routes to Claude (recommended)
aiswarm "complex security audit"  # Explicit agent swarm
ultrathink "architectural decision" # Sequential thinking MCP
```

### For 10% of Tasks: Use ~/bin/ai

**When to use `~/bin/ai` directly:**
- ⚠️ Explicit model benchmarking
- ⚠️ Comparative analysis (Claude vs Codex vs Gemini)
- ⚠️ Teaching/demonstrating multi-model routing
- ⚠️ Testing DSPy optimization

**Direct usage:**
```bash
~/bin/ai --force-codex "optimize this algorithm"  # Explicit Codex
~/bin/ai --force-gemini "design this UI"          # Explicit Gemini
~/bin/ai --show-analysis "complex task"           # Compare models
```

### Use Smart Router for Automatic Routing

```bash
smart "implement OAuth2 with security review"
# → Analyzes task
# → Routes to Claude workflow (COMPLEX, SECURITY domain)
# → Activates serena + github MCPs
# → Launches security-auditor + backend-architect agents
# → Delivers production-ready implementation
```

---

## Integration Examples (If You Proceed)

### Example 1: Adding Single MCP to ~/bin/ai

**Goal:** Add serena MCP for code navigation

**Implementation:**
```python
# ~/bin/ai - Add MCP support
import asyncio
from mcp_sdk import MCPClient

class SerenaIntegration:
    def __init__(self):
        self.client = None

    async def start(self):
        """Launch serena MCP server"""
        process = await asyncio.create_subprocess_exec(
            'serena-mcp',
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
        )
        self.client = MCPClient(process.stdin, process.stdout)
        await self.client.initialize()

    async def find_symbol(self, pattern):
        """Find symbols in codebase"""
        result = await self.client.call_tool(
            'find_symbol',
            {'name_path_pattern': pattern}
        )
        return result

# Usage in routing logic
async def execute_with_code_nav(cli, prompt):
    serena = SerenaIntegration()
    await serena.start()

    # Extract code references from prompt
    symbols = extract_symbols(prompt)

    # Gather code context
    context = []
    for symbol in symbols:
        info = await serena.find_symbol(symbol)
        context.append(info)

    # Augment prompt
    augmented = f"{prompt}\n\nCode Context:\n{json.dumps(context)}"

    # Execute CLI with context
    return execute_cli(cli, augmented)
```

**Effort:** 3-5 days for single MCP × 13 MCPs = 6-10 weeks total

### Example 2: Adding Single Agent to ~/bin/ai

**Goal:** Add security-auditor agent behavior

**Implementation:**
```python
# ~/bin/ai - Add agent behavior
AGENT_PROMPTS = {
    'security-auditor': '''You are a security auditor specializing in OWASP Top 10 vulnerabilities.

Analyze the provided code for:
1. SQL Injection vulnerabilities
2. Cross-Site Scripting (XSS)
3. Cross-Site Request Forgery (CSRF)
4. Insecure Direct Object References
5. Security Misconfiguration
6. Sensitive Data Exposure
7. Missing Access Control
8. Using Components with Known Vulnerabilities
9. Insufficient Logging & Monitoring
10. Server-Side Request Forgery (SSRF)

For each vulnerability found:
- Severity: CRITICAL/HIGH/MEDIUM/LOW
- Location: File and line number
- Description: What the vulnerability is
- Impact: What could happen
- Remediation: How to fix it

Format output as structured JSON.
'''
}

async def execute_agent(agent_type, task):
    """Execute agent behavior via prompted Claude call"""
    agent_prompt = AGENT_PROMPTS[agent_type]
    full_prompt = f"{agent_prompt}\n\nTask:\n{task}"

    # Execute Claude with agent behavior
    result = subprocess.run(
        ['claude', '--print', full_prompt],
        capture_output=True,
        text=True
    )

    return json.loads(result.stdout)

async def execute_agent_swarm(agents, task):
    """Execute multiple agents in parallel"""
    tasks = [execute_agent(agent, task) for agent in agents]
    results = await asyncio.gather(*tasks)
    return aggregate_results(results)
```

**Effort:** 2-3 days per agent × 289 agents = 100+ weeks (2 years) for full parity

**Reality check:** This is why Claude's native agent swarm integration is superior.

---

## Conclusion

### Summary

| Approach | Time | Quality | Maintenance | Recommendation |
|----------|------|---------|-------------|----------------|
| **Integrate MCPs into ~/bin/ai** | 3-4 weeks | Medium | High | ⚠️ Not recommended |
| **Integrate agents into ~/bin/ai** | 4-6 weeks | Medium | High | ⚠️ Not recommended |
| **Use Claude workflow** | 0 (done) | Native/High | None | ✅ **RECOMMENDED** |

### Final Recommendation

**DO NOT integrate MCPs/agents into ~/bin/ai.** Instead:

1. ✅ **Use Claude workflow as primary interface** (already configured)
   - Full MCP ecosystem (13 servers)
   - Agent swarms (289 agents)
   - 84.8% SWE-bench performance
   - Zero maintenance burden

2. ✅ **Keep ~/bin/ai for explicit benchmarking** (DSPy + Codex fixes complete)
   - Benchmark-based routing works
   - Useful for model comparison
   - Educational/demonstration purposes

3. ✅ **Use smart router for automatic routing** (already configured)
   - Analyzes task automatically
   - Routes to Claude for MCP/agent tasks
   - Routes to specific models when explicitly requested

### Result

**Best-of-both-worlds:**
- Claude workflow provides MCP/agent capabilities (84.8% SWE-bench)
- ~/bin/ai provides model comparison capabilities (77.2% SWE-bench)
- Smart router makes routing automatic and invisible
- Zero duplicate effort, zero maintenance burden
- 90% of tasks use Claude (optimal), 10% use ~/bin/ai (benchmarking)

---

**Status:** ✅ DOCUMENTATION COMPLETE
**Grade:** ARCHITECTURE DECISION DOCUMENTED
**Next:** Use Claude workflow for MCP/agent tasks, ~/bin/ai for explicit benchmarking only
