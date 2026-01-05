# ASUS AURA Unbrick Project

## Purpose

Clean, production-ready implementation of ASUS AURA LED control with:
- Safe, validated protocols
- Automatic recovery from "bricked" LED states
- Best practices enforced
- Clear documentation

## What We Learned (Empirically Verified)

### The Discovery
Channel 2 was "stuck" at 9 LEDs. We discovered the fix:

```javascript
aura.setLEDCount(2, 16);  // EC 52 53 02 10 - Topology init
aura.commit();             // EC 3F 55       - Persist to EEPROM
```

### Why It Worked

**Verified Facts:**
1. Firmware requires topology initialization before accepting writes
2. Direct CONFIG_TABLE writes are rejected
3. The commit command persists runtime state to EEPROM
4. Without topology init, ALL writes fail (even valid ones)

**Key Insight:**
> **Topology is session state, not configuration**

This means `setLEDCount()` must be called every session, even if the count hasn't changed.

## Proposed Architecture

### Core Module: `aura-safe.js`

Safe AURA controller with automatic topology management:

```javascript
class SafeAuraController {
    constructor() {
        this.topologyInitialized = false;
        this.channelCounts = { 0: 15, 1: 15, 2: 16 };
    }

    connect() {
        // 1. Connect to device
        // 2. Read current CONFIG
        // 3. Auto-initialize topology
        this.initTopology();
    }

    initTopology() {
        // ALWAYS init topology on connect
        for (let ch in this.channelCounts) {
            this.setLEDCount(ch, this.channelCounts[ch]);
        }
        this.topologyInitialized = true;
    }

    setColor(channel, led, r, g, b) {
        // Guard: topology must exist
        if (!this.topologyInitialized) {
            this.initTopology();
        }
        // Now safe to set colors
        this._sendColorCommand(channel, led, r, g, b);
    }

    commit() {
        // Guard: don't commit without topology
        if (!this.topologyInitialized) {
            throw new Error('Cannot commit without topology init');
        }
        this._sendCommit();
    }
}
```

### Recovery Module: `unbrick.js`

Automatic LED recovery tool:

```javascript
// Detect bricked state
function isBricked() {
    // Check if LEDs respond to commands
    // Check CONFIG_TABLE for zeroed channels
}

// Recover from bricked state
function unbrick() {
    // 1. Read current CONFIG
    // 2. Initialize topology for all channels
    // 3. Commit to EEPROM
    // 4. Verify recovery
}
```

## File Structure

```
/home/meow/Universe/Hardware/unbrick/
├── README.md                    # User-facing documentation
├── ARCHITECTURE.md              # Technical design
├── THEORY.md                    # Interpreted firmware behavior
├── src/
│   ├── aura-safe.js            # Safe controller implementation
│   ├── unbrick.js              # Recovery utilities
│   └── protocol.js             # Low-level protocol (from rgb-tool)
├── tools/
│   ├── fix-led-count.js        # One-command fix
│   ├── verify-topology.js      # Check current state
│   └── unbrick-all.js          # Full recovery procedure
├── docs/
│   ├── DISCOVERY.md            # How we found the solution
│   ├── STATE-MACHINE.md        # Firmware state flow (theory)
│   └── BEST-PRACTICES.md       # Safe usage guide
└── tests/
    └── test-safe-operations.js # Validation tests
```

## Documentation Strategy

### README.md
- Quick start
- Installation
- Basic usage
- Recovery procedure

### ARCHITECTURE.md
- Verified protocol details
- Safe operation patterns
- Error handling

### THEORY.md ⚠️
- **Clearly labeled as interpretation**
- State machine model
- Why LEDs get bricked
- Firmware internals (best guesses)

Include the insights from ISTHISCORRECT.md here, but mark them as:
- "Based on observed behavior..."
- "Likely interpretation..."
- "Working theory..."

### BEST-PRACTICES.md
1. Always init topology on connect
2. Never commit without topology
3. Never zero all channels
4. Follow the 4-step sequence: topology → mode → colors → commit

## What to Include from ISTHISCORRECT.md

✅ **Include with confidence:**
- The 4-step workflow
- State machine concept (as a model)
- "Topology as session state" principle
- Safety guards and best practices
- "Why games brick LEDs" explanation

⚠️ **Include but mark as theory:**
- "Runtime topology initializer" terminology
- Specific firmware internals (channel masks, routing tables)
- "Protected idle state" concept
- Internal latch mechanisms

❌ **Don't include:**
- Unverified claims presented as facts
- Speculation about ASUS intentions

## Next Steps

1. Create clean project structure
2. Extract working code from rgb-tool
3. Implement SafeAuraController with guards
4. Write comprehensive tests
5. Document everything
6. Create recovery tools
7. Write user guides

## Key Principles

1. **Empirical over theoretical** - Document what we observed
2. **Safety first** - Enforce correct sequences
3. **Clear documentation** - Separate fact from theory
4. **Production ready** - Error handling, validation, logging
5. **User friendly** - Simple recovery tools

---

Ready to build?
