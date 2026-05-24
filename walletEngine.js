import { faker } from '@faker-js/faker';

// ═══════════════════════════════════════════════════════════════
//  CONSTANTES DEL SISTEMA ADSO
// ═══════════════════════════════════════════════════════════════
export const ADSO_POINTS_RATE    = 0.01;   // 1% del monto
export const ADSO_MIN_AMOUNT     = 50000;  // umbral mínimo en COP
export const ADSO_VALID_STATUS   = 'Completado';

// ═══════════════════════════════════════════════════════════════
//  PUNTOS ADSO — cálculo por transacción individual
//
//  Reglas de negocio:
//    • Solo status === 'Completado' califica
//    • Solo amount > 50,000 COP califica  (50,000 exacto NO aplica)
//    • Retornamos Math.floor para puntos enteros
// ═══════════════════════════════════════════════════════════════
export function calculateADSOPoints(transaction) {
    if (!transaction || typeof transaction !== 'object') return 0;

    const { amount, status } = transaction;

    // Validar tipos
    if (typeof amount !== 'number' || typeof status !== 'string') return 0;

    // Regla 1 — solo transacciones Completado
    if (status !== ADSO_VALID_STATUS) return 0;

    // Regla 2 — monto estrictamente mayor a 50,000
    if (amount <= ADSO_MIN_AMOUNT) return 0;

    // Cálculo: 1% del monto, redondeado hacia abajo
    return Math.floor(amount * ADSO_POINTS_RATE);
}

// ═══════════════════════════════════════════════════════════════
//  PUNTOS ADSO ACUMULADOS — suma sobre todo el historial
// ═══════════════════════════════════════════════════════════════
export function calculateTotalADSOPoints(transactions) {
    if (!transactions || !Array.isArray(transactions)) return 0;

    return transactions.reduce((total, tx) => {
        return total + calculateADSOPoints(tx);
    }, 0);
}

// ═══════════════════════════════════════════════════════════════
//  GENERACIÓN DE HISTORIAL DE TRANSACCIONES
//  Ahora incluye el campo `puntosADSO` calculado dinámicamente
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

        // Campo dinámico calculado en el momento de generación
        tx.puntosADSO = calculateADSOPoints(tx);

        transactions.push(tx);
    }

    return transactions;
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
//  Faker fluctúa entre $3,900 y $4,300 COP/USDT
// ═══════════════════════════════════════════════════════════════
export function generateExchangeRate() {
    return faker.number.int({ min: 3900, max: 4300 });
}

// ═══════════════════════════════════════════════════════════════
//  COMPRA DE DÓLARES DIGITALES (USDT simulado)
//
//  @param {number} copBalance   - Saldo disponible en COP
//  @param {number} copAmount    - Monto en COP a convertir
//  @param {number} exchangeRate - Tasa generada por generateExchangeRate()
//
//  @returns {{
//    status:       'Aprobado' | 'Rechazado',
//    usdt:         number,
//    copSpent:     number,
//    exchangeRate: number,
//    remainingCOP: number,
//    reason:       string | null
//  }}
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

    // Conversión exacta: USDT = COP / tasa (6 decimales estándar USDT)
    const usdt         = parseFloat((copAmount / exchangeRate).toFixed(6));
    const remainingCOP = copBalance - copAmount;

    return { status: 'Aprobado', usdt, copSpent: copAmount,
             exchangeRate, remainingCOP, reason: null };
}