import {
    purchaseUSDT,
    calculateADSOPoints,
    calculateTotalADSOPoints,
    classifySpendingBehavior,
    generateCriticalSpendingHistory,
} from '../walletEngine';

// ═══════════════════════════════════════════════════════════════
//  SUITE 1 — COMPRA DE USDT
// ═══════════════════════════════════════════════════════════════
describe('purchaseUSDT', () => {

    const RATE = 4000;

    test('retorna Rechazado cuando el saldo COP es insuficiente', () => {
        const result = purchaseUSDT({ copBalance: 10000, copAmount: 50000, exchangeRate: RATE });
        expect(result.status).toBe('Rechazado');
        expect(result.reason).toBe('Saldo COP insuficiente');
        expect(result.usdt).toBe(0);
    });

    test('la conversión COP → USDT es exacta con la tasa dada', () => {
        const copAmount = 200000;
        const result    = purchaseUSDT({ copBalance: 500000, copAmount, exchangeRate: RATE });
        expect(result.status).toBe('Aprobado');
        expect(result.usdt).toBe(parseFloat((copAmount / RATE).toFixed(6))); // 50.000000
    });

    test('retorna Rechazado con saldo cero', () => {
        const result = purchaseUSDT({ copBalance: 0, copAmount: 1000, exchangeRate: RATE });
        expect(result.status).toBe('Rechazado');
    });

    test('retorna Rechazado con monto negativo', () => {
        const result = purchaseUSDT({ copBalance: 100000, copAmount: -5000, exchangeRate: RATE });
        expect(result.status).toBe('Rechazado');
    });

    test('retorna Rechazado con tasa de cambio inválida', () => {
        const result = purchaseUSDT({ copBalance: 100000, copAmount: 50000, exchangeRate: 0 });
        expect(result.status).toBe('Rechazado');
        expect(result.reason).toBe('Tasa de cambio inválida');
    });

    test('aprueba cuando el monto es exactamente igual al saldo (caso límite)', () => {
        const result = purchaseUSDT({ copBalance: 100000, copAmount: 100000, exchangeRate: RATE });
        expect(result.status).toBe('Aprobado');
        expect(result.remainingCOP).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 2 — PUNTOS ADSO
// ═══════════════════════════════════════════════════════════════
describe('calculateADSOPoints', () => {

    test('transacción menor a $50,000 acumula 0 puntos', () => {
        expect(calculateADSOPoints({ amount: 30000, status: 'Completado' })).toBe(0);
    });

    test('transacción de exactamente $50,000 acumula 0 puntos (límite estricto)', () => {
        expect(calculateADSOPoints({ amount: 50000, status: 'Completado' })).toBe(0);
    });

    test('transacción de $50,001 Completada acumula 1% = 500 puntos', () => {
        expect(calculateADSOPoints({ amount: 50001, status: 'Completado' })).toBe(500);
    });

    test('status Rechazado no acumula puntos aunque el monto sea alto', () => {
        expect(calculateADSOPoints({ amount: 200000, status: 'Rechazado' })).toBe(0);
    });

    test('status Pendiente no acumula puntos aunque el monto sea alto', () => {
        expect(calculateADSOPoints({ amount: 200000, status: 'Pendiente' })).toBe(0);
    });

    test('transacción Completada de $100,000 acumula exactamente 1,000 puntos', () => {
        expect(calculateADSOPoints({ amount: 100000, status: 'Completado' })).toBe(1000);
    });

    test('transacción Completada de $500,000 acumula exactamente 5,000 puntos', () => {
        expect(calculateADSOPoints({ amount: 500000, status: 'Completado' })).toBe(5000);
    });

    test('retorna 0 si la transacción es null o undefined', () => {
        expect(calculateADSOPoints(null)).toBe(0);
        expect(calculateADSOPoints(undefined)).toBe(0);
    });
});

describe('calculateTotalADSOPoints', () => {

    test('suma los puntos de varias transacciones correctamente', () => {
        const txs = [
            { amount: 100000, status: 'Completado' }, // 1000 pts
            { amount: 200000, status: 'Completado' }, // 2000 pts
            { amount: 30000,  status: 'Completado' }, // 0 pts
            { amount: 300000, status: 'Rechazado'  }, // 0 pts
        ];
        expect(calculateTotalADSOPoints(txs)).toBe(3000);
    });

    test('retorna 0 con arreglo vacío', () => {
        expect(calculateTotalADSOPoints([])).toBe(0);
    });

    test('retorna 0 con valor no arreglo', () => {
        expect(calculateTotalADSOPoints(null)).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 3 — CLASIFICADOR DE GASTO CRÍTICO
// ═══════════════════════════════════════════════════════════════
describe('classifySpendingBehavior', () => {

    // ── Casos Gasto Crítico ────────────────────────────────────
    test('devuelve "Gasto Crítico" cuando retiros son exactamente el 71% de ingresos', () => {
        const txs = [
            { type: 'Ingreso', amount: 100000 },
            { type: 'Retiro',  amount: 71000  }, // 71%
        ];
        expect(classifySpendingBehavior(txs)).toBe('Gasto Crítico');
    });

    test('devuelve "Gasto Crítico" cuando retiros superan ampliamente los ingresos', () => {
        const txs = [
            { type: 'Ingreso', amount: 100000  },
            { type: 'Retiro',  amount: 900000  }, // 900%
        ];
        expect(classifySpendingBehavior(txs)).toBe('Gasto Crítico');
    });

    test('devuelve "Gasto Crítico" cuando hay retiros pero cero ingresos', () => {
        const txs = [
            { type: 'Retiro', amount: 50000 },
        ];
        expect(classifySpendingBehavior(txs)).toBe('Gasto Crítico');
    });

    // ── Casos Estable ──────────────────────────────────────────
    test('devuelve "Estable" cuando retiros son exactamente el 70% de ingresos (límite)', () => {
        const txs = [
            { type: 'Ingreso', amount: 100000 },
            { type: 'Retiro',  amount: 70000  }, // exactamente 70%
        ];
        expect(classifySpendingBehavior(txs)).toBe('Estable');
    });

    test('devuelve "Estable" cuando retiros son bajos', () => {
        const txs = [
            { type: 'Ingreso', amount: 500000 },
            { type: 'Retiro',  amount: 100000 }, // 20%
        ];
        expect(classifySpendingBehavior(txs)).toBe('Estable');
    });

    test('devuelve "Estable" cuando no hay retiros', () => {
        const txs = [
            { type: 'Ingreso', amount: 200000 },
        ];
        expect(classifySpendingBehavior(txs)).toBe('Estable');
    });

    test('devuelve "Estable" con arreglo vacío', () => {
        expect(classifySpendingBehavior([])).toBe('Estable');
    });

    test('devuelve "Estable" con valor nulo', () => {
        expect(classifySpendingBehavior(null)).toBe('Estable');
    });

    // ── Dataset masivo de Faker fuerza la alerta ───────────────
    test('generateCriticalSpendingHistory siempre dispara "Gasto Crítico"', () => {
        const criticalData = generateCriticalSpendingHistory(100);
        expect(classifySpendingBehavior(criticalData)).toBe('Gasto Crítico');
    });

    test('el dataset crítico contiene mayoría de retiros (85%)', () => {
        const criticalData = generateCriticalSpendingHistory(100);
        const retiros = criticalData.filter(tx => tx.type === 'Retiro').length;
        expect(retiros).toBe(85);
    });
});