const { faker } = require('@faker-js/faker');

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

describe('Wallet Engine - Pruebas Unitarias TDD', () => {

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