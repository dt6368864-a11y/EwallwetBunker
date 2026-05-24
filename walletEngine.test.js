const { faker } = require('@faker-js/faker');

// ─────────────────────────────────────────────────────────────────
//  Réplicas locales de walletEngine.js para Jest (sin transpilación ESM)
// ─────────────────────────────────────────────────────────────────
const ADSO_POINTS_RATE  = 0.01;
const ADSO_MIN_AMOUNT   = 50000;
const ADSO_VALID_STATUS = 'Completado';

function calculateADSOPoints(transaction) {
    if (!transaction || typeof transaction !== 'object') return 0;
    const { amount, status } = transaction;
    if (typeof amount !== 'number' || typeof status !== 'string') return 0;
    if (status !== ADSO_VALID_STATUS) return 0;
    if (amount <= ADSO_MIN_AMOUNT) return 0;
    return Math.floor(amount * ADSO_POINTS_RATE);
}

function calculateTotalADSOPoints(transactions) {
    if (!transactions || !Array.isArray(transactions)) return 0;
    return transactions.reduce((total, tx) => total + calculateADSOPoints(tx), 0);
}

function generateTransactionHistory(count) {
    const transactions = [];
    for (let i = 0; i < count; i++) {
        const amount = Number(faker.finance.amount({ min: 10000, max: 500000, dec: 0 }));
        const status = faker.helpers.arrayElement(['Completado', 'Pendiente', 'Rechazado']);
        const type   = faker.helpers.arrayElement(['Ingreso', 'Retiro']);
        const tx = {
            id: faker.string.uuid(),
            accountNumber: faker.finance.accountNumber(10),
            type, amount,
            date: faker.date.recent({ days: 30 }),
            status,
        };
        tx.puntosADSO = calculateADSOPoints(tx);
        transactions.push(tx);
    }
    return transactions;
}

function calculateNetBalance(transactions) {
    if (!transactions || !Array.isArray(transactions)) return 0;
    return transactions.reduce((total, tx) => {
        if (tx.type === 'Ingreso') return total + tx.amount;
        else if (tx.type === 'Retiro' && tx.status === 'Completado') return total - tx.amount;
        return total;
    }, 0);
}

function generateExchangeRate() {
    return faker.number.int({ min: 3900, max: 4300 });
}

function purchaseUSDT({ copBalance, copAmount, exchangeRate }) {
    if (typeof copBalance !== 'number' || copBalance < 0)
        return { status: 'Rechazado', usdt: 0, copSpent: 0, exchangeRate, remainingCOP: copBalance, reason: 'Saldo inválido' };
    if (typeof copAmount !== 'number' || copAmount <= 0)
        return { status: 'Rechazado', usdt: 0, copSpent: 0, exchangeRate, remainingCOP: copBalance, reason: 'El monto a comprar debe ser mayor a cero' };
    if (typeof exchangeRate !== 'number' || exchangeRate <= 0)
        return { status: 'Rechazado', usdt: 0, copSpent: 0, exchangeRate, remainingCOP: copBalance, reason: 'Tasa de cambio inválida' };
    if (copAmount > copBalance)
        return { status: 'Rechazado', usdt: 0, copSpent: 0, exchangeRate, remainingCOP: copBalance, reason: 'Saldo COP insuficiente' };
    const usdt = parseFloat((copAmount / exchangeRate).toFixed(6));
    return { status: 'Aprobado', usdt, copSpent: copAmount, exchangeRate, remainingCOP: copBalance - copAmount, reason: null };
}


// ═════════════════════════════════════════════════════════════════
//  SUITE 1 — Historial de transacciones (tests originales)
// ═════════════════════════════════════════════════════════════════
describe('Wallet Engine — Historial de Transacciones', () => {

    test('1. Debe generar la cantidad exacta de transacciones (50)', () => {
        expect(generateTransactionHistory(50).length).toBe(50);
    });

    test('2. Los montos deben ser siempre números positivos', () => {
        generateTransactionHistory(20).forEach(item => {
            expect(item.amount).toBeGreaterThan(0);
        });
    });

    test('3. No debe haber ningún campo con valor undefined', () => {
        generateTransactionHistory(20).forEach(item => {
            Object.values(item).forEach(value => expect(value).not.toBeUndefined());
        });
    });

    test('4. Cálculo preciso del Saldo Neto', () => {
        const mock = [
            { type: 'Ingreso', amount: 150000, status: 'Completado' },
            { type: 'Retiro',  amount: 50000,  status: 'Completado' },
            { type: 'Ingreso', amount: 30000,  status: 'Pendiente'  },
            { type: 'Retiro',  amount: 20000,  status: 'Pendiente'  },
        ];
        expect(calculateNetBalance(mock)).toBe(130000);
    });

    test('5. Cada transacción debe incluir el campo puntosADSO', () => {
        generateTransactionHistory(20).forEach(item => {
            expect(item).toHaveProperty('puntosADSO');
            expect(typeof item.puntosADSO).toBe('number');
        });
    });
});

// ═════════════════════════════════════════════════════════════════
//  SUITE 2 — Tasa de cambio
// ═════════════════════════════════════════════════════════════════
describe('Wallet Engine — Tasa de Cambio COP/USDT', () => {

    test('6. La tasa debe estar entre 3,900 y 4,300 (100 iteraciones)', () => {
        for (let i = 0; i < 100; i++) {
            const rate = generateExchangeRate();
            expect(rate).toBeGreaterThanOrEqual(3900);
            expect(rate).toBeLessThanOrEqual(4300);
        }
    });

    test('7. La tasa debe ser un número entero', () => {
        expect(Number.isInteger(generateExchangeRate())).toBe(true);
    });
});

// ═════════════════════════════════════════════════════════════════
//  SUITE 3 — purchaseUSDT: casos de rechazo
// ═════════════════════════════════════════════════════════════════
describe('purchaseUSDT — Casos de Rechazo', () => {
    const rate = 4000;

    test('8. Rechaza si saldo COP es insuficiente', () => {
        const r = purchaseUSDT({ copBalance: 100000, copAmount: 200000, exchangeRate: rate });
        expect(r.status).toBe('Rechazado');
        expect(r.reason).toBe('Saldo COP insuficiente');
        expect(r.usdt).toBe(0);
    });

    test('9. Rechaza si el saldo COP es exactamente cero', () => {
        const r = purchaseUSDT({ copBalance: 0, copAmount: 10000, exchangeRate: rate });
        expect(r.status).toBe('Rechazado');
    });

    test('10. Rechaza si el monto a comprar es cero', () => {
        const r = purchaseUSDT({ copBalance: 500000, copAmount: 0, exchangeRate: rate });
        expect(r.status).toBe('Rechazado');
        expect(r.reason).toBe('El monto a comprar debe ser mayor a cero');
    });

    test('11. Rechaza si el monto a comprar es negativo', () => {
        const r = purchaseUSDT({ copBalance: 500000, copAmount: -50000, exchangeRate: rate });
        expect(r.status).toBe('Rechazado');
    });

    test('12. Rechaza si saldo COP es negativo', () => {
        const r = purchaseUSDT({ copBalance: -100, copAmount: 10000, exchangeRate: rate });
        expect(r.status).toBe('Rechazado');
        expect(r.reason).toBe('Saldo inválido');
    });

    test('13. Rechaza con tasa de cambio cero', () => {
        const r = purchaseUSDT({ copBalance: 500000, copAmount: 100000, exchangeRate: 0 });
        expect(r.status).toBe('Rechazado');
        expect(r.reason).toBe('Tasa de cambio inválida');
    });
});

// ═════════════════════════════════════════════════════════════════
//  SUITE 4 — purchaseUSDT: conversión exacta y casos límite
// ═════════════════════════════════════════════════════════════════
describe('purchaseUSDT — Conversión Exacta y Casos Límite', () => {

    test('14. 400,000 COP ÷ 4,000 = 100 USDT exactos', () => {
        const r = purchaseUSDT({ copBalance: 400000, copAmount: 400000, exchangeRate: 4000 });
        expect(r.status).toBe('Aprobado');
        expect(r.usdt).toBe(100.000000);
        expect(r.remainingCOP).toBe(0);
    });

    test('15. 390,000 COP ÷ 3,900 = 100 USDT exactos', () => {
        const r = purchaseUSDT({ copBalance: 500000, copAmount: 390000, exchangeRate: 3900 });
        expect(r.status).toBe('Aprobado');
        expect(r.usdt).toBe(100.000000);
        expect(r.remainingCOP).toBe(110000);
    });

    test('16. La fórmula USDT = copAmount / exchangeRate es exacta (con Faker)', () => {
        const exchangeRate = generateExchangeRate();
        const copAmount    = 200000;
        const r = purchaseUSDT({ copBalance: 1000000, copAmount, exchangeRate });
        expect(r.usdt).toBe(parseFloat((copAmount / exchangeRate).toFixed(6)));
    });

    test('17. Saldo exactamente igual al monto debe APROBARSE (caso límite)', () => {
        const r = purchaseUSDT({ copBalance: 50000, copAmount: 50000, exchangeRate: 4100 });
        expect(r.status).toBe('Aprobado');
        expect(r.remainingCOP).toBe(0);
    });

    test('18. El saldo restante se descuenta correctamente', () => {
        const r = purchaseUSDT({ copBalance: 800000, copAmount: 300000, exchangeRate: 4200 });
        expect(r.status).toBe('Aprobado');
        expect(r.remainingCOP).toBe(500000);
        expect(r.copSpent).toBe(300000);
    });

    test('19. 50 compras con tasa Faker: conversión siempre correcta', () => {
        for (let i = 0; i < 50; i++) {
            const exchangeRate = generateExchangeRate();
            const copAmount    = faker.number.int({ min: 10000, max: 400000 });
            const copBalance   = copAmount + faker.number.int({ min: 0, max: 100000 });
            const r = purchaseUSDT({ copBalance, copAmount, exchangeRate });
            expect(r.usdt).toBe(parseFloat((copAmount / exchangeRate).toFixed(6)));
        }
    });
});

// ═════════════════════════════════════════════════════════════════
//  SUITE 5 — Puntos ADSO: reglas de elegibilidad
// ═════════════════════════════════════════════════════════════════
describe('Puntos ADSO — Elegibilidad por Status', () => {

    test('20. Status "Pendiente" → 0 puntos sin importar el monto', () => {
        const tx = { amount: 300000, status: 'Pendiente' };
        expect(calculateADSOPoints(tx)).toBe(0);
    });

    test('21. Status "Rechazado" → 0 puntos sin importar el monto', () => {
        const tx = { amount: 300000, status: 'Rechazado' };
        expect(calculateADSOPoints(tx)).toBe(0);
    });

    test('22. Status "Completado" con monto alto → genera puntos', () => {
        const tx = { amount: 200000, status: 'Completado' };
        expect(calculateADSOPoints(tx)).toBeGreaterThan(0);
    });

    test('23. Transacción null → 0 puntos (manejo defensivo)', () => {
        expect(calculateADSOPoints(null)).toBe(0);
        expect(calculateADSOPoints(undefined)).toBe(0);
        expect(calculateADSOPoints({})).toBe(0);
    });
});

// ═════════════════════════════════════════════════════════════════
//  SUITE 6 — Puntos ADSO: umbral de $50,000 COP
// ═════════════════════════════════════════════════════════════════
describe('Puntos ADSO — Umbral de $50,000 COP', () => {

    test('24. Monto exactamente $50,000 Completado → 0 puntos (NO califica)', () => {
        expect(calculateADSOPoints({ amount: 50000, status: 'Completado' })).toBe(0);
    });

    test('25. Monto de $49,999 Completado → 0 puntos', () => {
        expect(calculateADSOPoints({ amount: 49999, status: 'Completado' })).toBe(0);
    });

    test('26. Monto de $50,001 Completado → genera puntos (supera el umbral)', () => {
        expect(calculateADSOPoints({ amount: 50001, status: 'Completado' })).toBeGreaterThan(0);
    });

    test('27. Monto de $10,000 Completado → 0 puntos (bajo el umbral)', () => {
        expect(calculateADSOPoints({ amount: 10000, status: 'Completado' })).toBe(0);
    });

    test('28. Monto de $0 Completado → 0 puntos', () => {
        expect(calculateADSOPoints({ amount: 0, status: 'Completado' })).toBe(0);
    });
});

// ═════════════════════════════════════════════════════════════════
//  SUITE 7 — Puntos ADSO: cálculo exacto del 1%
// ═════════════════════════════════════════════════════════════════
describe('Puntos ADSO — Cálculo Exacto del 1%', () => {

    test('29. $100,000 Completado → 1,000 puntos (1% exacto)', () => {
        expect(calculateADSOPoints({ amount: 100000, status: 'Completado' })).toBe(1000);
    });

    test('30. $200,000 Completado → 2,000 puntos', () => {
        expect(calculateADSOPoints({ amount: 200000, status: 'Completado' })).toBe(2000);
    });

    test('31. $500,000 Completado → 5,000 puntos', () => {
        expect(calculateADSOPoints({ amount: 500000, status: 'Completado' })).toBe(5000);
    });

    test('32. $75,500 Completado → 755 puntos (Math.floor)', () => {
        expect(calculateADSOPoints({ amount: 75500, status: 'Completado' })).toBe(755);
    });

    test('33. Puntos = Math.floor(amount * 0.01) para cualquier monto elegible', () => {
        [60000, 123456, 250000, 499999].forEach(amount => {
            const expected = Math.floor(amount * 0.01);
            expect(calculateADSOPoints({ amount, status: 'Completado' })).toBe(expected);
        });
    });
});

// ═════════════════════════════════════════════════════════════════
//  SUITE 8 — Puntos ADSO acumulados sobre historial completo
// ═════════════════════════════════════════════════════════════════
describe('Puntos ADSO — Acumulación sobre Historial', () => {

    test('34. Suma total correcta sobre historial mock mixto', () => {
        const mock = [
            { amount: 200000, status: 'Completado' },  // → 2000 pts
            { amount: 100000, status: 'Pendiente'  },  // → 0 pts
            { amount: 80000,  status: 'Rechazado'  },  // → 0 pts
            { amount: 50000,  status: 'Completado' },  // → 0 pts (en el umbral)
            { amount: 75000,  status: 'Completado' },  // → 750 pts
        ];
        // Total esperado: 2000 + 750 = 2750
        expect(calculateTotalADSOPoints(mock)).toBe(2750);
    });

    test('35. Historial vacío → 0 puntos', () => {
        expect(calculateTotalADSOPoints([])).toBe(0);
    });

    test('36. Input inválido (null/undefined) → 0 puntos', () => {
        expect(calculateTotalADSOPoints(null)).toBe(0);
        expect(calculateTotalADSOPoints(undefined)).toBe(0);
    });

    test('37. Historial con todos Rechazados/Pendientes → siempre 0 puntos', () => {
        const mock = [
            { amount: 400000, status: 'Rechazado' },
            { amount: 300000, status: 'Pendiente' },
            { amount: 200000, status: 'Rechazado' },
        ];
        expect(calculateTotalADSOPoints(mock)).toBe(0);
    });

    test('38. Puntos en historial generado con Faker son consistentes', () => {
        const history = generateTransactionHistory(100);
        const fromField  = history.reduce((s, t) => s + t.puntosADSO, 0);
        const fromCalc   = calculateTotalADSOPoints(history);
        // El campo puntosADSO almacenado debe coincidir con el recálculo
        expect(fromField).toBe(fromCalc);
    });
});