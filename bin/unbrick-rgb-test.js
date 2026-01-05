#!/usr/bin/env node

/**
 * unbrick-rgb-test - Test ASUS AURA unbrick library
 * Usage: unbrick-rgb-test
 */

const fs = require('fs');

// Check device but allow tests to run even without hardware
const hasDevice = fs.existsSync('/dev/hidraw0');
if (!hasDevice) {
    console.log('');
    console.log('ℹ️  Note: AURA device not found at /dev/hidraw0');
    console.log('   Running tests without hardware (some will be skipped)');
    console.log('');
}

// Run test suite
const { SafeAuraController, States } = require('../src/aura-safe');

let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn, requiresHardware = false) {
    if (requiresHardware && !hasDevice) {
        console.log(`⊘ ${name} (skipped - no hardware)`);
        skipped++;
        return;
    }
    
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
console.log('ASUS AURA UNBRICK - TEST SUITE');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Test 1: Module loads
test('Module loads without errors', () => {
    const aura = new SafeAuraController();
    if (!aura) throw new Error('Failed to create controller');
});

// Test 2: Initial state
test('Initial state is DISCONNECTED', () => {
    const aura = new SafeAuraController();
    if (aura.getState() !== States.DISCONNECTED) {
        throw new Error(`Expected DISCONNECTED, got ${aura.getState()}`);
    }
});

// Test 3: Custom topology
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

// Test 4: Cannot operate while disconnected
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

// Hardware tests
test('Connection transitions to RUNTIME', () => {
    const aura = new SafeAuraController({ verbose: false });
    aura.connect();
    if (aura.getState() !== States.RUNTIME) {
        throw new Error(`Expected RUNTIME, got ${aura.getState()}`);
    }
    aura.disconnect();
}, true);

test('Topology initialized on connect', () => {
    const aura = new SafeAuraController({ verbose: false });
    aura.connect();
    
    const config = aura.getConfig();
    if (config.channel0_leds === 0 && config.channel1_leds === 0 && config.channel2_leds === 0) {
        throw new Error('Topology not initialized');
    }
    
    aura.disconnect();
}, true);

test('State transitions tracked correctly', () => {
    const aura = new SafeAuraController({ verbose: false });
    
    if (aura.getState() !== States.DISCONNECTED) throw new Error('Wrong initial state');
    
    aura.connect();
    if (aura.getState() !== States.RUNTIME) throw new Error('Wrong state after connect');
    
    aura.commit();
    if (aura.getState() !== States.COMMITTED) throw new Error('Wrong state after commit');
    
    aura.disconnect();
    if (aura.getState() !== States.DISCONNECTED) throw new Error('Wrong state after disconnect');
}, true);

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('RESULTS');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Passed:  ${passed}`);
console.log(`Failed:  ${failed}`);
console.log(`Skipped: ${skipped}`);
console.log('');

if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
} else {
    console.log('✅ All tests passed!');
    if (skipped > 0) {
        console.log(`   (${skipped} tests skipped - no hardware)`);
    }
}
