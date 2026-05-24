import { faker } from '@faker-js/faker';

// ─────────────────────────────────────────────
//  Generación de historial de transacciones
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Cálculo del saldo neto
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Tasa de cambio simulada COP → USDT
//  Faker fluctúa entre $3,900 y $4,300 COP/USDT
// ─────────────────────────────────────────────
export function generateExchangeRate() {
    return faker.number.int({ min: 3900, max: 4300 });
}

// ─────────────────────────────────────────────
//  Compra de Dólares Digitales (USDT simulado)
//
//  @param {number} copBalance   - Saldo disponible en COP
//  @param {number} copAmount    - Monto en COP que el usuario quiere convertir
//  @param {number} exchangeRate - Tasa COP/USDT generada por generateExchangeRate()
//
//  @returns {{
//    status: 'Aprobado' | 'Rechazado',
//    usdt: number,
//    copSpent: number,
//    exchangeRate: number,
//    remainingCOP: number,
//    reason?: string
//  }}
// ─────────────────────────────────────────────
export function purchaseUSDT({ copBalance, copAmount, exchangeRate }) {
    // ── Validaciones de entrada ──────────────────
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

    // ── Validación de saldo insuficiente ─────────
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

    // ── Conversión exacta ────────────────────────
    //  USDT = COP / tasa  (redondeado a 6 decimales, estándar USDT)
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