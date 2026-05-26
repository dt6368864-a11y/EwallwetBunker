import { faker } from '@faker-js/faker';

// ═══════════════════════════════════════════════════════════════
//  CONSTANTES DEL SISTEMA ADSO
// ═══════════════════════════════════════════════════════════════
export const ADSO_POINTS_RATE  = 0.01;
export const ADSO_MIN_AMOUNT   = 50000;
export const ADSO_VALID_STATUS = 'Completado';

// ═══════════════════════════════════════════════════════════════
//  PUNTOS ADSO — cálculo por transacción individual
// ═══════════════════════════════════════════════════════════════
export function calculateADSOPoints(transaction) {
    if (!transaction || typeof transaction !== 'object') return 0;
    const { amount, status } = transaction;
    if (typeof amount !== 'number' || typeof status !== 'string') return 0;
    if (status !== ADSO_VALID_STATUS) return 0;
    if (amount <= ADSO_MIN_AMOUNT) return 0;
    return Math.floor(amount * ADSO_POINTS_RATE);
}

// ═══════════════════════════════════════════════════════════════
//  PUNTOS ADSO ACUMULADOS — suma sobre todo el historial
// ═══════════════════════════════════════════════════════════════
export function calculateTotalADSOPoints(transactions) {
    if (!transactions || !Array.isArray(transactions)) return 0;
    return transactions.reduce((total, tx) => total + calculateADSOPoints(tx), 0);
}

// ═══════════════════════════════════════════════════════════════
//  GENERACIÓN DE HISTORIAL DE TRANSACCIONES (normal)
// ═══════════════════════════════════════════════════════════════
export function generateTransactionHistory(count) {
    const transactions = [];

    for (let i = 0; i < count; i++) {
        const amount = Number(
            faker.finance.amount({ min: 10000, max: 500000, dec: 0 })
        );
        const status = faker.helpers.arrayElement(['Completado', 'Pendiente', 'Rechazado']);
        const type   = faker.helpers.arrayElement(['Ingreso', 'Retiro']);

        const tx = {
            id:            faker.string.uuid(),
            accountNumber: faker.finance.accountNumber(10),
            type,
            amount,
            date:          faker.date.recent({ days: 30 }),
            status,
        };

        tx.puntosADSO = calculateADSOPoints(tx);
        transactions.push(tx);
    }

    return transactions;
}

// ═══════════════════════════════════════════════════════════════
//  GENERACIÓN CON RETIROS MASIVOS — fuerza "Gasto Crítico"
// ═══════════════════════════════════════════════════════════════

export function generateCriticalSpendingHistory(count = 100) {
    const transactions = [];

    for (let i = 0; i < count; i++) {
        // 85% retiros, 15% ingresos
        const isCritical = i < Math.floor(count * 0.85);
        const type       = isCritical ? 'Retiro' : 'Ingreso';

        // Los retiros son montos altos; los ingresos, bajos
        const amount = isCritical
            ? Number(faker.finance.amount({ min: 200000, max: 500000, dec: 0 }))
            : Number(faker.finance.amount({ min: 10000,  max: 50000,  dec: 0 }));

        const tx = {
            id:            faker.string.uuid(),
            accountNumber: faker.finance.accountNumber(10),
            type,
            amount,
            date:          faker.date.recent({ days: 30 }),
            status:        'Completado',
        };

        tx.puntosADSO = calculateADSOPoints(tx);
        transactions.push(tx);
    }

    return transactions;
}

// ═══════════════════════════════════════════════════════════════
//  CLASIFICADOR DE COMPORTAMIENTO DE GASTO
// ═══════════════════════════════════════════════════════════════

export function classifySpendingBehavior(transactions) {
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return 'Estable';
    }

    const totalIngresos = transactions
        .filter(tx => tx.type === 'Ingreso')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const totalRetiros = transactions
        .filter(tx => tx.type === 'Retiro')
        .reduce((sum, tx) => sum + tx.amount, 0);

    // Sin ingresos y con retiros → siempre Gasto Crítico
    if (totalIngresos === 0) {
        return totalRetiros > 0 ? 'Gasto Crítico' : 'Estable';
    }

    const ratio = (totalRetiros / totalIngresos) * 100;

    return ratio > 70 ? 'Gasto Crítico' : 'Estable';
}

// ═══════════════════════════════════════════════════════════════
//  CÁLCULO DEL SALDO NETO
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  TASA DE CAMBIO SIMULADA COP → USDT
// ═══════════════════════════════════════════════════════════════
export function generateExchangeRate() {
    return faker.number.int({ min: 3900, max: 4300 });
}

// ═══════════════════════════════════════════════════════════════
//  COMPRA DE DÓLARES DIGITALES (USDT simulado)
// ═══════════════════════════════════════════════════════════════
export function purchaseUSDT({ copBalance, copAmount, exchangeRate }) {

    if (typeof copBalance !== 'number' || copBalance < 0) {
        return { status: 'Rechazado', usdt: 0, copSpent: 0,
                 exchangeRate, remainingCOP: copBalance, reason: 'Saldo inválido' };
    }

    if (typeof copAmount !== 'number' || copAmount <= 0) {
        return { status: 'Rechazado', usdt: 0, copSpent: 0,
                 exchangeRate, remainingCOP: copBalance,
                 reason: 'El monto a comprar debe ser mayor a cero' };
    }

    if (typeof exchangeRate !== 'number' || exchangeRate <= 0) {
        return { status: 'Rechazado', usdt: 0, copSpent: 0,
                 exchangeRate, remainingCOP: copBalance,
                 reason: 'Tasa de cambio inválida' };
    }

    if (copAmount > copBalance) {
        return { status: 'Rechazado', usdt: 0, copSpent: 0,
                 exchangeRate, remainingCOP: copBalance,
                 reason: 'Saldo COP insuficiente' };
    }

    const usdt         = parseFloat((copAmount / exchangeRate).toFixed(6));
    const remainingCOP = copBalance - copAmount;

    return { status: 'Aprobado', usdt, copSpent: copAmount,
             exchangeRate, remainingCOP, reason: null };
}