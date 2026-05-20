const {
    generateTransactionHistory,
    calculateNetBalance
} = require('./walletEngine');

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
            { type: 'Retiro', amount: 50000, status: 'Completado' },  // Resta
            { type: 'Ingreso', amount: 30000, status: 'Pendiente' },   // Suma
            { type: 'Retiro', amount: 20000, status: 'Pendiente' }    // Ignora (no completado)
        ];

        // Operación: 150000 - 50000 + 30000 = 130000
        const saldoNeto = calculateNetBalance(mockTransactions);
        expect(saldoNeto).toBe(130000);
    });
});