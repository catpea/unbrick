# Architecture

## Overview

The ASUS AURA Unbrick library implements a safe wrapper around the ASUS AURA USB protocol using the BLACK STATE MACHINE methodology for reverse engineering.

## Layer Architecture

```
┌─────────────────────────────────────┐
│   User Application                  │
├─────────────────────────────────────┤
│   SafeAuraController                │ ← State machine + guards
│   - State tracking                  │
│   - Safety validations              │
│   - Auto-recovery                   │
├─────────────────────────────────────┤
│   AuraProtocol                      │ ← Low-level protocol
│   - Packet construction             │
│   - USB HID communication           │
├─────────────────────────────────────┤
│   node-hid                          │ ← USB HID library
├─────────────────────────────────────┤
│   /dev/hidraw0                      │ ← Kernel HID driver
└─────────────────────────────────────┘
```

## Core Components

### 1. AuraProtocol (src/protocol.js)

Low-level USB HID protocol implementation.

**Responsibilities:**
- Packet creation and formatting
- USB HID communication
- Basic command primitives

**Key Methods:**
- `getConfig()` - Read CONFIG_TABLE (0xB0)
- `setLEDCount()` - Topology init (0x52 0x53)
- `commit()` - Persist to EEPROM (0x3F 0x55)
- `setDirectLED()` - Set LED colors (0x40)
- `setEffect()` - Set effect mode (0x35)

**Does NOT:**
- Track state
- Enforce operation order
- Validate inputs
- Handle recovery

### 2. SafeAuraController (src/aura-safe.js)

Safe wrapper implementing BLACK STATE MACHINE.

**Responsibilities:**
- State machine implementation
- Operation guards
- Auto-initialization
- Error recovery

**State Machine:**

```
DISCONNECTED ←──────────────────────┐
    ↓ connect()                     │
LOCKED (no topology)                │
    ↓ initTopology()                │
RUNTIME (can operate)               │
    ↓ commit()                      │
COMMITTED (persisted)               │
    ↓ disconnect() ─────────────────┘
```

**State Transitions:**

| From | Event | To | Action |
|------|-------|-----|--------|
| DISCONNECTED | connect() | LOCKED | Open USB, read config |
| LOCKED | initTopology() | RUNTIME | Send 0x52 0x53 for each channel |
| RUNTIME | commit() | COMMITTED | Send 0x3F 0x55 |
| * | disconnect() | DISCONNECTED | Close USB |

**Safety Guards:**

```javascript
_ensureRuntime() {
    if (state === DISCONNECTED) throw error;
    if (state === LOCKED) initTopology();
}
```

Every operation calls `_ensureRuntime()` first.

### 3. Recovery Tools (tools/)

Command-line utilities for common operations.

**unbrick-all.js:**
- Detects bricked state
- Applies recovery procedure
- Verifies success

**verify-topology.js:**
- Reads current config
- Checks for issues
- Tests LED 10

**fix-led-count.js:**
- Specifically fixes Channel 2 = 9 → 16
- Quick one-command fix

## Protocol Details

### Packet Structure

All packets are 65 bytes:

```
Byte 0:    0xEC (command prefix)
Byte 1:    Command code
Byte 2-64: Command-specific data
```

### Key Commands

#### 0xB0 - Read CONFIG_TABLE

**Request:**
```
EC B0 00 00 ... (rest zero)
```

**Response:**
```
EC 30 00 00 [CONFIG DATA...]

Offsets in response:
  0x0A: Channel 0 LED count
  0x0D: Channel 0 flag
  0x10: Channel 1 LED count
  0x13: Channel 1 flag
  0x16: Channel 2 LED count
  0x19: Channel 2 flag
```

#### 0x52 0x53 - Set LED Count (TOPOLOGY INIT)

**Critical Discovery:** This is NOT just "set count" - it's the **runtime topology initializer** that unlocks the firmware.

```
EC 52 53 [channel] [count] 00 00 ...

Example:
  EC 52 53 00 0F  → Channel 0: 15 LEDs
  EC 52 53 02 10  → Channel 2: 16 LEDs
```

**What it does:**
- Initializes EC routing table
- Enables channel mask bits
- Transitions firmware: LOCKED → RUNTIME
- MUST be called before any operations

#### 0x3F 0x55 - Commit to EEPROM

```
EC 3F 55 00 00 ...
```

**What it does:**
- Writes current runtime state to EEPROM
- Makes topology persistent across reboots
- Only works after topology init

**Critical:** Calling without topology init has no effect!

#### 0x40 - Direct LED Control

```
EC 40 [flags|channel] [offset] [count] [R G B] [R G B] ...

Example:
  EC 40 82 09 01 FF 00 00
        ^^channel 2
           ^^LED index 9 (LED #10)
              ^^1 LED
                 ^^R G B (red)
```

### The Discovery

**Failed Approaches:**
1. Direct CONFIG write (0xB1) - Rejected
2. Raw /dev/hidraw writes - No effect
3. Feature reports - Not supported
4. Block writes - Rejected
5. Unlock sequences - No effect

**Working Approach:**
```
1. setLEDCount(ch, count)  // Init topology
2. commit()                 // Persist runtime → EEPROM
```

**Why this works:**

The firmware uses a two-tier system:
1. **Runtime state** (volatile) - Set by 0x52 0x53
2. **CONFIG_TABLE** (EEPROM) - Updated by 0x3F 55

The commit command persists runtime → CONFIG, but only works if runtime topology exists!

## Error Handling

### Connection Errors

```javascript
try {
    aura.connect();
} catch (error) {
    // Device not found or permissions issue
}
```

### State Errors

```javascript
try {
    aura.commit();  // Without topology
} catch (error) {
    // "Cannot commit in state: LOCKED"
}
```

### Recovery

```javascript
if (aura.isBricked()) {
    aura.unbrick();
}
```

## Testing Strategy

### Unit Tests (tests/test-safe-operations.js)

- State transitions
- Guard enforcement
- Custom topology
- Error conditions

### Integration Tests

- Actual hardware required
- Test recovery procedures
- Verify LED control

### Manual Verification

```bash
npm run verify
```

## Performance

### Connection Time
- ~100ms to connect
- ~200ms to init topology
- Total: ~300ms

### Command Latency
- Single LED: ~10ms
- All LEDs: ~50ms
- Commit: ~500ms

### State Overhead
- Minimal (state tracking is just a string)
- Guards add ~1ms

## Security Considerations

### USB Access

Requires read/write access to `/dev/hidraw0`:

```bash
sudo chmod 666 /dev/hidraw0
```

Or use udev rules (see README).

### EEPROM Writes

Commits write to EEPROM:
- Limited write cycles (~100,000)
- Don't commit in loops!
- Only commit when needed

## Future Enhancements

### Possible Additions

1. **State persistence** - Remember last topology
2. **Effect library** - Pre-built effects
3. **Zone support** - If hardware supports it
4. **Auto-detect** - Probe LED counts
5. **Async API** - Promise-based operations

### Protocol Extensions

- Investigate commands 0x30-0x38
- Test alternative commit sequences
- Explore write-enable patterns

## References

- `DISCOVERY.md` - How we found this
- `THEORY.md` - BLACK STATE MACHINE methodology
- `BEST-PRACTICES.md` - Usage guidelines
- OpenRGB ASUS AURA controller
