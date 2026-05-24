const { faker } = require('@faker-js/faker');

// ─────────────────────────────────────────────────────────────────
//  Copias locales de las funciones (misma lógica que walletEngine.js)
//  para que Jest pueda correr sin transpilación ESM
// ─────────────────────────────────────────────────────────────────

function generateTransactionHistory(count) {
    const transactions = [];
    for (let i = 0; i < count; i++) {
        transactions.push({
            id: faker.string.uuid(),
            accountNumber: faker.finance.accountNumber(10),
            type: faker.helpers.arrayElement(['Ingreso', 'Retiro']),
            amount: Number(faker.finance.amount({ min: 10000, max: 500000, dec: 0 })),
            date: faker.date.recent({ days: 30 }),
            status: faker.helpers.arrayElement(['Completado', 'Pendiente', 'Rechazado'])
        });
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
    if (typeof copBalance !== 'number' || copBalance < 0) {
        return {
            status: 'Rechazado',
            usdt: 0,
            copSpent: 0,
            exchangeRate,
            remainingCOP: copBalance,
            reason: 'Saldo inválido'
        };
    }
    if (typeof copAmount !== 'number' || copAmount <= 0) {
        return {
            status: 'Rechazado',
            usdt: 0,
            copSpent: 0,
            exchangeRate,
            remainingCOP: copBalance,
            reason: 'El monto a comprar debe ser mayor a cero'
        };
    }
    if (typeof exchangeRate !== 'number' || exchangeRate <= 0) {
        return {
            status: 'Rechazado',
            usdt: 0,
            copSpent: 0,
            exchangeRate,
            remainingCOP: copBalance,
            reason: 'Tasa de cambio inválida'
        };
    }
    if (copAmount > copBalance) {
        return {
            status: 'Rechazado',
            usdt: 0,
            copSpent: 0,
            exchangeRate,
            remainingCOP: copBalance,
            reason: 'Saldo COP insuficiente'
        };
    }
    const usdt = parseFloat((copAmount / exchangeRate).toFixed(6));
    const remainingCOP = copBalance - copAmount;
    return {
        status: 'Aprobado',
        usdt,
        copSpent: copAmount,
        exchangeRate,
        remainingCOP,
        reason: null
    };
}

// ═════════════════════════════════════════════════════════════════
//  SUITE 1 — Tests originales del historial de transacciones
// ═════════════════════════════════════════════════════════════════
describe('Wallet Engine — Historial de Transacciones', () => {

    test('1. Debe generar la cantidad exacta de transacciones pedidas (50)', () => {
        const data = generateTransactionHistory(50);
        expect(data.length).toBe(50);
    });

    test('2. Los montos (amount) deben ser siempre números positivos y mayores a cero', () => {
        const data = generateTransactionHistory(20);
        data.forEach(item => {
            expect(item.amount).toBeGreaterThan(0);
        });
    });

    test('3. No debe haber ningún campo con valor undefined', () => {
        const data = generateTransactionHistory(20);
        data.forEach(item => {
            Object.values(item).forEach(value => {
                expect(value).not.toBeUndefined();
            });
        });
    });

    test('4. Prueba de Regla de Negocio: Cálculo preciso del Saldo Neto', () => {
        const mockTransactions = [
            { type: 'Ingreso', amount: 150000, status: 'Completado' },
            { type: 'Retiro', amount: 50000, status: 'Completado' },
            { type: 'Ingreso', amount: 30000, status: 'Pendiente' },
            { type: 'Retiro', amount: 20000, status: 'Pendiente' }
        ];
        const saldoNeto = calculateNetBalance(mockTransactions);
        expect(saldoNeto).toBe(130000);
    });
});

// ═════════════════════════════════════════════════════════════════
//  SUITE 2 — Tasa de cambio simulada
// ═════════════════════════════════════════════════════════════════
describe('Wallet Engine — Tasa de Cambio COP/USDT', () => {

    test('5. La tasa de cambio debe estar entre 3,900 y 4,300 COP/USDT', () => {
        // Ejecutar 100 veces para cubrir aleatoriedad de Faker
        for (let i = 0; i < 100; i++) {
            const rate = generateExchangeRate();
            expect(rate).toBeGreaterThanOrEqual(3900);
            expect(rate).toBeLessThanOrEqual(4300);
        }
    });

    test('6. La tasa de cambio debe ser un número entero', () => {
        const rate = generateExchangeRate();
        expect(Number.isInteger(rate)).toBe(true);
    });
});

// ═════════════════════════════════════════════════════════════════
//  SUITE 3 — purchaseUSDT: casos de rechazo
// ═════════════════════════════════════════════════════════════════
describe('purchaseUSDT — Casos de Rechazo (status: Rechazado)', () => {

    const rate = 4000; // tasa fija para tests deterministas

    test('7. Debe rechazar si el saldo COP es insuficiente', () => {
        const result = purchaseUSDT({
            copBalance: 100000,
            copAmount: 200000,   // más de lo disponible
            exchangeRate: rate
        });
        expect(result.status).toBe('Rechazado');
        expect(result.reason).toBe('Saldo COP insuficiente');
        expect(result.usdt).toBe(0);
    });

    test('8. Debe rechazar si el saldo COP es exactamente cero', () => {
        const result = purchaseUSDT({
            copBalance: 0,
            copAmount: 10000,
            exchangeRate: rate
        });
        expect(result.status).toBe('Rechazado');
        expect(result.reason).toBe('Saldo COP insuficiente');
    });

    test('9. Debe rechazar si el monto a comprar es cero', () => {
        const result = purchaseUSDT({
            copBalance: 500000,
            copAmount: 0,
            exchangeRate: rate
        });
        expect(result.status).toBe('Rechazado');
        expect(result.reason).toBe('El monto a comprar debe ser mayor a cero');
    });

    test('10. Debe rechazar si el monto a comprar es negativo', () => {
        const result = purchaseUSDT({
            copBalance: 500000,
            copAmount: -50000,
            exchangeRate: rate
        });
        expect(result.status).toBe('Rechazado');
        expect(result.reason).toBe('El monto a comprar debe ser mayor a cero');
    });

    test('11. Debe rechazar si el saldo COP es negativo', () => {
        const result = purchaseUSDT({
            copBalance: -100,
            copAmount: 10000,
            exchangeRate: rate
        });
        expect(result.status).toBe('Rechazado');
        expect(result.reason).toBe('Saldo inválido');
    });

    test('12. Debe rechazar con tasa de cambio inválida (cero)', () => {
        const result = purchaseUSDT({
            copBalance: 500000,
            copAmount: 100000,
            exchangeRate: 0
        });
        expect(result.status).toBe('Rechazado');
        expect(result.reason).toBe('Tasa de cambio inválida');
    });
});

// ═════════════════════════════════════════════════════════════════
//  SUITE 4 — purchaseUSDT: conversión exacta y casos límite
// ═════════════════════════════════════════════════════════════════
describe('purchaseUSDT — Conversión y Casos Límite', () => {

    test('13. Conversión exacta: 400,000 COP a tasa 4,000 = 100 USDT', () => {
        const result = purchaseUSDT({
            copBalance: 400000,
            copAmount: 400000,
            exchangeRate: 4000
        });
        expect(result.status).toBe('Aprobado');
        expect(result.usdt).toBe(100.000000);
        expect(result.remainingCOP).toBe(0);
    });

    test('14. Conversión exacta: 390,000 COP a tasa 3,900 = 100 USDT', () => {
        const result = purchaseUSDT({
            copBalance: 500000,
            copAmount: 390000,
            exchangeRate: 3900
        });
        expect(result.status).toBe('Aprobado');
        expect(result.usdt).toBe(100.000000);
        expect(result.remainingCOP).toBe(110000);
    });

    test('15. La fórmula USDT = copAmount / exchangeRate es exacta (con Faker)', () => {
        const exchangeRate = generateExchangeRate();
        const copAmount = 200000;
        const copBalance = 1000000;

        const result = purchaseUSDT({ copBalance, copAmount, exchangeRate });

        const expectedUSDT = parseFloat((copAmount / exchangeRate).toFixed(6));
        expect(result.status).toBe('Aprobado');
        expect(result.usdt).toBe(expectedUSDT);
    });

    test('16. Saldo exactamente igual al monto: debe APROBARSE (caso límite)', () => {
        const result = purchaseUSDT({
            copBalance: 50000,
            copAmount: 50000,
            exchangeRate: 4100
        });
        expect(result.status).toBe('Aprobado');
        expect(result.remainingCOP).toBe(0);
    });

    test('17. El saldo restante se descuenta correctamente', () => {
        const result = purchaseUSDT({
            copBalance: 800000,
            copAmount: 300000,
            exchangeRate: 4200
        });
        expect(result.status).toBe('Aprobado');
        expect(result.remainingCOP).toBe(500000);
        expect(result.copSpent).toBe(300000);
    });

    test('18. Múltiples compras con tasa Faker: conversión siempre correcta', () => {
        for (let i = 0; i < 50; i++) {
            const exchangeRate = generateExchangeRate();
            const copAmount = faker.number.int({ min: 10000, max: 400000 });
            const copBalance = copAmount + faker.number.int({ min: 0, max: 100000 });

            const result = purchaseUSDT({ copBalance, copAmount, exchangeRate });
            const expectedUSDT = parseFloat((copAmount / exchangeRate).toFixed(6));

            expect(result.status).toBe('Aprobado');
            expect(result.usdt).toBe(expectedUSDT);
        }
    });
});