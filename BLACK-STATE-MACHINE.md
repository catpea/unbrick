# BLACK STATE MACHINE Theory

## Definition

A **BLACK STATE MACHINE (BSM)** is a reverse engineering model for unknown systems where:

1. ✅ **Black Box** - Internal implementation is unknown or inaccessible
2. ✅ **Observable I/O** - You can send inputs and observe outputs
3. ✅ **Resettable** - System can be returned to initial state
4. ✅ **State Modeling** - Behavior can be modeled AS IF it has states

**Key Insight**: The system may NOT actually be implemented as a state machine, but modeling it as one is a powerful analysis tool.

## The Framework

```
Unknown System
     ↓
  BLACK BOX
     ↓
Observable Behavior
     ↓
Hypothesized States
     ↓
State Machine Model
     ↓
Predictive Power
```

## Requirements for a BLACK STATE MACHINE

### 1. Reset Capability
You must be able to return the system to a known initial state:
- Power cycle
- Reset command
- Factory reset
- Reboot
- Physical disconnect

**Why**: Without reset, you can't systematically explore state transitions.

### 2. Observable Behavior
You must be able to observe responses:
- Return values
- Status indicators
- Side effects
- Memory contents
- Physical outputs (LEDs, motors, etc.)

**Why**: You need feedback to map inputs → states.

### 3. Repeatable Interactions
The same sequence must produce consistent results:
- Deterministic (or mostly deterministic)
- Testable
- Verifiable

**Why**: Non-deterministic systems can't be reliably modeled.

## The AURA Case Study

### What We Observed

```
RESET (power cycle or reconnect)
  ↓
??? (unknown initial state)
  ↓
EC B1 writes → REJECTED ❌
EC 3F 55 commit → IGNORED ❌
Direct /dev/hidraw → NO EFFECT ❌
  ↓
EC 52 53 [ch] [count] (topology init)
  ↓
??? (unknown new state)
  ↓
EC B1 writes → still REJECTED ❌
EC 3F 55 commit → ACCEPTED ✅
  ↓
CONFIG_TABLE updated ✅
```

### The BLACK STATE MACHINE Model

```
┌─────────────┐
│   BOOT      │
│  (RESET)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   LOCKED    │ ← Direct writes rejected
│   (IDLE)    │   Commits ignored
└──────┬──────┘
       │ EC 52 53 (topology init)
       ▼
┌─────────────┐
│  RUNTIME    │ ← Direct writes still rejected
│  ACTIVE     │   Commits NOW work
└──────┬──────┘
       │ EC 3F 55 (commit)
       ▼
┌─────────────┐
│  EEPROM     │ ← Changes persisted
│ COMMITTED   │
└─────────────┘
```

**Critical**: We don't know if ASUS firmware ACTUALLY has states called "LOCKED" and "RUNTIME ACTIVE". But modeling it this way:
- ✅ Explains all observed behavior
- ✅ Predicts what will work/fail
- ✅ Guides safe operation
- ✅ Documents findings

## Why This Works

### For Known State Machines
If the system IS a state machine internally:
- Your model approximates reality
- You reverse engineer the actual states

### For Non-State-Machine Systems
If the system is NOT a state machine internally:
- Your model is a **useful fiction**
- It provides **predictive power**
- It helps **organize observations**
- It enables **safe interaction**

## The Power of the BSM Model

### 1. Systematic Exploration
```
For each hypothesized state:
  - What commands are valid?
  - What transitions are possible?
  - What side effects occur?
```

### 2. Predictive Testing
```
If in State A, command X should:
  - Transition to State B
  - Produce output Y
  - Enable operation Z
```

### 3. Safety Constraints
```
Never attempt:
  - Commits without topology init
  - Writes before state transition
  - Operations in wrong state
```

### 4. Documentation
```
State A (LOCKED):
  - Entry: Power on, reset
  - Valid: Read commands, topology init
  - Invalid: Direct writes, commits
  - Exit: Topology init → State B
```

## Universal Applications

### A UFO is a BLACK STATE MACHINE

If you can:
1. ✅ Reset it (turn it off and on)
2. ✅ Send inputs (buttons, signals)
3. ✅ Observe outputs (lights, sounds, movements)

Then you can:
- Model it as having states
- Test state transitions
- Build a predictive model
- Reverse engineer behavior

**Even if** the UFO uses alien technology, BSM modeling still works!

### Other Examples

#### Embedded Device (Unknown Firmware)
```
BOOT → IDLE → AUTHENTICATED → OPERATIONAL
```

#### Game Console (Undocumented Protocol)
```
INIT → PAIRED → READY → STREAMING
```

#### IoT Device (Proprietary API)
```
OFFLINE → CONNECTING → ONLINE → ACTIVE
```

#### Malware Sample
```
DORMANT → ACTIVATED → SPREADING → EXFILTRATING
```

#### Industrial Equipment
```
SAFE → ENABLED → RUNNING → FAULT
```

## Methodology

### Step 1: Reset and Observe
```
1. Reset system to initial state
2. Try random valid operations
3. Document what works/fails
4. Look for patterns
```

### Step 2: Hypothesize States
```
1. Group similar behaviors
2. Identify transitions
3. Name the states (arbitrary but meaningful)
4. Draw state diagram
```

### Step 3: Test Predictions
```
1. Predict: "If in state X, operation Y should work"
2. Test: Reset, reach state X, try operation Y
3. Verify: Did prediction hold?
4. Refine model if wrong
```

### Step 4: Document Model
```
1. State definitions
2. Valid operations per state
3. Transition conditions
4. Invariants
5. Safety constraints
```

### Step 5: Build Safe Wrapper
```
1. Track current state
2. Guard operations
3. Enforce valid sequences
4. Handle errors
5. Auto-recover when possible
```

## The ASUS AURA Implementation

### Before BSM Model (Chaos)
```javascript
// Random attempts
aura.sendRaw([0xEC, 0xB1, 0x12, 0x10]);  // Why doesn't this work?
aura.sendRaw([0xEC, 0x3F, 0x55]);         // Why is this ignored?
// ???
```

### After BSM Model (Control)
```javascript
class SafeAuraController {
    constructor() {
        this.state = 'LOCKED';  // Track assumed state
    }

    connect() {
        this.state = 'LOCKED';
        this.initTopology();  // LOCKED → RUNTIME
    }

    initTopology() {
        if (this.state === 'LOCKED') {
            this.setLEDCount(0, 15);
            this.setLEDCount(1, 15);
            this.setLEDCount(2, 16);
            this.state = 'RUNTIME';
        }
    }

    commit() {
        if (this.state !== 'RUNTIME') {
            throw new Error('Cannot commit in state: ' + this.state);
        }
        this._sendCommit();
        this.state = 'COMMITTED';
    }
}
```

## Key Principles

### 1. States Are Hypothetical
- You're creating a **model**, not discovering truth
- States are **labels you choose**
- What matters is **predictive power**

### 2. Reset Is Essential
- Without reset, no systematic exploration
- Reset provides **known starting point**
- Enables **reproducible testing**

### 3. Model Evolves
- Start with simple model
- Refine based on observations
- Add states as needed
- Merge states if indistinguishable

### 4. Usefulness Over Truth
- A wrong but useful model beats no model
- **"All models are wrong, some are useful"** - George Box
- BSM gives you a **framework to think**

## Philosophical Insight

> "Reality may not be a state machine, but pretending it is lets you control it."

The BLACK STATE MACHINE is:
- A **lens** for viewing unknown systems
- A **tool** for reverse engineering
- A **framework** for documentation
- A **method** for building safe wrappers

It's not about finding "truth" - it's about finding **useful abstractions**.

## When BSM Fails

BSM modeling breaks down when:

1. ❌ **No reset capability** - Can't return to known state
2. ❌ **Non-deterministic** - Same input gives different output randomly
3. ❌ **No observable output** - Complete black hole
4. ❌ **Stateless** - System truly has no memory (rare)
5. ❌ **Infinite states** - Too many states to model practically

But for most embedded systems, firmware, protocols: **BSM works!**

## Legacy

The BLACK STATE MACHINE methodology:
- ✅ Solved the ASUS AURA LED count problem
- ✅ Predicted what would/wouldn't work
- ✅ Enabled safe operation code
- ✅ Documented findings systematically
- ✅ Generalizes to any unknown system

## Credits

**Discovered by**: meow (2026-01-05)  
**During**: ASUS AURA LED count reverse engineering  
**Inspiration**: Hot shower epiphany  
**Named**: BLACK STATE MACHINE (realm of BLACK BOXES)

---

> "If you can reset it, you can model it.  
> If you can model it, you can control it.  
> Even UFOs."

