# Best Practices

## Safe AURA LED Control

### Golden Rules

1. **Always initialize topology on connect**
2. **Never commit without topology**
3. **Never zero all channels**
4. **Follow the 4-step sequence**

## The 4-Step Sequence

Every LED control session should follow:

```
1. TOPOLOGY INIT   → setLEDCount() for each channel
2. SET MODE        → setEffect() if using effects
3. SET COLORS      → setLED() or setAllLEDs()
4. COMMIT          → commit() to persist (optional)
```

## Code Examples

### ✅ CORRECT: Safe Usage

```javascript
const { SafeAuraController } = require('./src');

const aura = new SafeAuraController();

// 1. Connect (auto-inits topology)
aura.connect();

// 2. Set colors (guards ensure topology exists)
aura.setLED(2, 9, 255, 0, 0);

// 3. Commit if you want persistence
aura.commit();

// 4. Disconnect
aura.disconnect();
```

### ❌ WRONG: Direct Protocol Usage

```javascript
const { AuraProtocol } = require('./src');

const aura = new AuraProtocol();
aura.connect();

// DANGER: No topology init!
aura.setDirectLED(2, 9, [{ r: 255, g: 0, b: 0 }]);  // Ignored!
aura.commit();  // No effect!
```

### ✅ CORRECT: Manual Topology

```javascript
const { AuraProtocol } = require('./src');

const aura = new AuraProtocol();
aura.connect();

// 1. MUST init topology first
aura.setLEDCount(0, 15);
aura.setLEDCount(1, 15);
aura.setLEDCount(2, 16);

// 2. Now colors work
aura.setDirectLED(2, 9, [{ r: 255, g: 0, b: 0 }]);

// 3. Commit to persist
aura.commit();

aura.disconnect();
```

## Common Mistakes

### Mistake 1: Skipping Topology Init

**Problem:**
```javascript
aura.connect();
aura.setLED(2, 9, 255, 0, 0);  // Might be ignored
```

**Solution:**
```javascript
aura.connect();  // SafeAuraController auto-inits!
aura.setLED(2, 9, 255, 0, 0);  // Works
```

### Mistake 2: Committing Too Often

**Problem:**
```javascript
for (let i = 0; i < 100; i++) {
    aura.setLED(2, i % 16, 255, 0, 0);
    aura.commit();  // 100 EEPROM writes!
}
```

**Solution:**
```javascript
for (let i = 0; i < 100; i++) {
    aura.setLED(2, i % 16, 255, 0, 0);
    // No commit in loop
}
aura.commit();  // Once at the end
```

### Mistake 3: Not Handling Errors

**Problem:**
```javascript
aura.connect();  // What if device not found?
aura.setLED(2, 9, 255, 0, 0);
```

**Solution:**
```javascript
try {
    aura.connect();
    aura.setLED(2, 9, 255, 0, 0);
    aura.disconnect();
} catch (error) {
    console.error('Failed:', error.message);
    // Handle gracefully
}
```

### Mistake 4: Forgetting to Disconnect

**Problem:**
```javascript
aura.connect();
aura.setLED(2, 9, 255, 0, 0);
// Process exits, device still locked
```

**Solution:**
```javascript
try {
    aura.connect();
    aura.setLED(2, 9, 255, 0, 0);
} finally {
    aura.disconnect();  // Always cleanup
}
```

## Performance Tips

### 1. Batch LED Updates

**Slow:**
```javascript
for (let i = 0; i < 16; i++) {
    aura.setLED(2, i, 255, 0, 0);  // 16 USB transactions
}
```

**Fast:**
```javascript
const colors = Array(16).fill({ r: 255, g: 0, b: 0 });
aura.protocol.setDirectLED(2, 0, colors);  // 1 USB transaction
```

### 2. Minimize Commits

Commits take ~500ms and write to EEPROM:

```javascript
// Set many LEDs
aura.setAllLEDs(0, 255, 0, 0);
aura.setAllLEDs(1, 0, 255, 0);
aura.setAllLEDs(2, 0, 0, 255);

// Commit once
aura.commit();
```

### 3. Reuse Controller

**Slow:**
```javascript
for (let i = 0; i < 100; i++) {
    const aura = new SafeAuraController();
    aura.connect();  // Reconnect every time!
    aura.setLED(2, 0, 255, 0, 0);
    aura.disconnect();
}
```

**Fast:**
```javascript
const aura = new SafeAuraController();
aura.connect();  // Connect once

for (let i = 0; i < 100; i++) {
    aura.setLED(2, 0, 255, 0, 0);
}

aura.disconnect();
```

## Recovery Patterns

### Pattern 1: Auto-Recovery

```javascript
const { SafeAuraController } = require('./src');

const aura = new SafeAuraController();
aura.connect();

if (aura.isBricked()) {
    console.log('Bricked! Auto-recovering...');
    aura.unbrick();
}

// Now safe to use
aura.setAllLEDs(2, 0, 255, 0);
```

### Pattern 2: Defensive Initialization

```javascript
function safeConnect(aura) {
    aura.connect();
    
    // Force topology even if already initialized
    aura.initTopology();
    
    return aura;
}

const aura = safeConnect(new SafeAuraController());
```

### Pattern 3: Graceful Degradation

```javascript
try {
    aura.setLED(2, 9, 255, 0, 0);  // LED 10
} catch (error) {
    console.warn('LED 10 failed, trying LED 9');
    aura.setLED(2, 8, 255, 0, 0);  // LED 9 fallback
}
```

## Production Checklist

Before deploying:

- [ ] Error handling on connect()
- [ ] try/finally for disconnect()
- [ ] Topology validation
- [ ] Commit only when needed
- [ ] Not committing in loops
- [ ] Bricked state detection
- [ ] Graceful degradation
- [ ] User feedback for long operations
- [ ] Logging for debugging
- [ ] Recovery procedures documented

## Debug Mode

Enable verbose logging:

```javascript
const aura = new SafeAuraController({ verbose: true });
aura.connect();
// Logs:
// [BSM] State: DISCONNECTED → LOCKED
// [BSM] Initializing topology...
//   Channel 0: 15 LEDs
//   Channel 1: 15 LEDs
//   Channel 2: 16 LEDs
// [BSM] State: LOCKED → RUNTIME
```

## What NOT to Do

### ❌ Never: Use AuraProtocol Directly in Production

Unless you know what you're doing:

```javascript
// DON'T:
const aura = new AuraProtocol();
// Easy to forget topology init!

// DO:
const aura = new SafeAuraController();
// Auto-inits, has guards
```

### ❌ Never: Zero All Channels

```javascript
// This can brick the device:
aura.protocol.setLEDCount(0, 0);
aura.protocol.setLEDCount(1, 0);
aura.protocol.setLEDCount(2, 0);
aura.commit();  // Now all channels bricked!
```

### ❌ Never: Skip Error Handling

```javascript
// DON'T:
aura.connect();

// DO:
try {
    aura.connect();
} catch (error) {
    if (error.message.includes('not found')) {
        console.error('Device not connected');
    } else {
        throw error;
    }
}
```

### ❌ Never: Commit in Animation Loops

```javascript
// DON'T: (kills EEPROM)
while (true) {
    aura.setLED(2, 0, random(), random(), random());
    aura.commit();  // Writing EEPROM 60 times/second!
}

// DO:
while (true) {
    aura.setLED(2, 0, random(), random(), random());
    // No commit - just live updates
}
```

## EEPROM Health

The CONFIG_TABLE is in EEPROM with limited write cycles (~100,000).

**Good:**
- Commit once on startup
- Commit when user saves settings
- Commit after recovery

**Bad:**
- Commit in loops
- Commit every LED change
- Commit every frame in animations

**Calculate:**
- 100,000 writes / 60 per second = 27 minutes until failure
- 100,000 writes / 1 per day = 273 years of use ✓

## Summary

The SafeAuraController handles most of this automatically. The key points:

1. Use SafeAuraController, not AuraProtocol directly
2. Let it auto-initialize topology
3. Don't commit excessively
4. Handle errors
5. Clean up (disconnect)

Follow these practices and your LEDs will stay healthy and responsive!
