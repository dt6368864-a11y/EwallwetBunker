import { faker } from '@faker-js/faker';

export function generateTransactionHistory(count) {
    const transactions = [];

    for (let i = 0; i < count; i++) {
        transactions.push({
            id: faker.string.uuid(),
            accountNumber: faker.finance.accountNumber(10),
            type: faker.helpers.arrayElement(['Ingreso', 'Retiro']),
            amount: Number(
                faker.finance.amount({
                    min: 10000,
                    max: 500000,
                    dec: 0
                })
            ),
            date: faker.date.recent({ days: 30 }),
            status: faker.helpers.arrayElement(['Completado', 'Pendiente', 'Rechazado'])
        });
    }

    return transactions;
}

export function calculateNetBalance(transactions) {
    if (!transactions || !Array.isArray(transactions)) return 0;

    return transactions.reduce((total, tx) => {
        if (tx.type === 'Ingreso') {
            return total + tx.amount;
        } else if (tx.type === 'Retiro' && tx.status === 'Completado') {
            return total - tx.amount;
        }
        return total;
    }, 0);
}