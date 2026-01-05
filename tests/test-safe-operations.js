#!/usr/bin/env node

/**
 * Test Suite for SafeAuraController
 * Validates BLACK STATE MACHINE implementation
 */

const { SafeAuraController, States } = require('../src/aura-safe');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (error) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${error.message}`);
        failed++;
    }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('SAFE AURA CONTROLLER TEST SUITE');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Test 1: Initial state
test('Initial state is DISCONNECTED', () => {
    const aura = new SafeAuraController();
    if (aura.getState() !== States.DISCONNECTED) {
        throw new Error(`Expected DISCONNECTED, got ${aura.getState()}`);
    }
});

// Test 2: Connection transitions to RUNTIME
test('Connect auto-initializes to RUNTIME', () => {
    const aura = new SafeAuraController({ verbose: false });
    aura.connect();
    if (aura.getState() !== States.RUNTIME) {
        throw new Error(`Expected RUNTIME, got ${aura.getState()}`);
    }
    aura.disconnect();
});

// Test 3: Cannot operate while disconnected
test('Operations blocked when disconnected', () => {
    const aura = new SafeAuraController({ verbose: false });
    try {
        aura.setLED(2, 0, 255, 0, 0);
        throw new Error('Should have thrown error');
    } catch (error) {
        if (!error.message.includes('Not connected')) {
            throw error;
        }
    }
});

// Test 4: Topology is initialized on connect
test('Topology initialized on connect', () => {
    const aura = new SafeAuraController({ verbose: false });
    aura.connect();
    
    const config = aura.getConfig();
    // Should have at least some LEDs configured
    if (config.channel0_leds === 0 && config.channel1_leds === 0 && config.channel2_leds === 0) {
        throw new Error('Topology not initialized');
    }
    
    aura.disconnect();
});

// Test 5: Custom topology
test('Custom topology is applied', () => {
    const customTopology = { 0: 10, 1: 10, 2: 20 };
    const aura = new SafeAuraController({ 
        verbose: false,
        topology: customTopology 
    });
    
    if (aura.topology[2] !== 20) {
        throw new Error('Custom topology not set');
    }
});

// Test 6: State tracking
test('State transitions tracked correctly', () => {
    const aura = new SafeAuraController({ verbose: false });
    
    if (aura.getState() !== States.DISCONNECTED) throw new Error('Wrong initial state');
    
    aura.connect();
    if (aura.getState() !== States.RUNTIME) throw new Error('Wrong state after connect');
    
    aura.commit();
    if (aura.getState() !== States.COMMITTED) throw new Error('Wrong state after commit');
    
    aura.disconnect();
    if (aura.getState() !== States.DISCONNECTED) throw new Error('Wrong state after disconnect');
});

// Test 7: Bricked detection
test('Bricked state detection works', () => {
    const aura = new SafeAuraController({ verbose: false });
    aura.connect();
    
    // This test just verifies the method doesn't crash
    const isBricked = aura.isBricked();
    // Result depends on actual hardware state
    
    aura.disconnect();
});

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('RESULTS');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('');

if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
} else {
    console.log('✅ All tests passed!');
}
