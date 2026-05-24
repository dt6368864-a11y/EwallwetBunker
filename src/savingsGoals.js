import { faker } from '@faker-js/faker';

// ═══════════════════════════════════════════════════════════════
//  CLASE: SavingsGoal
// ═══════════════════════════════════════════════════════════════
export class SavingsGoal {
    constructor(name, initialAmount = 0) {
        this.id      = faker.string.uuid();
        this.name    = name;
        this.balance = initialAmount;
    }
}

// ═══════════════════════════════════════════════════════════════
//  CLASE: Wallet
// ═══════════════════════════════════════════════════════════════
export class Wallet {
    constructor() {
        this.availableBalance = 0;
        this.savingsGoals     = [];
    }

    createSavingsGoal(name, initialAmount = 0) {
        const goal = new SavingsGoal(name, initialAmount);
        this.savingsGoals.push(goal);
        return goal;
    }

    transferToGoal(goalName, amount) {
        if (amount <= 0)
            throw new Error('El monto debe ser mayor a cero');
        if (amount > this.availableBalance)
            throw new Error('Saldo insuficiente');

        const goal = this.savingsGoals.find(g => g.name === goalName);
        if (!goal) throw new Error('Objetivo de ahorro no encontrado');

        this.availableBalance -= amount;
        goal.balance          += amount;
    }

    setAvailableBalance(balance) {
        this.availableBalance = balance;
    }

    getTotalBalance() {
        const savingsTotal = this.savingsGoals.reduce((t, g) => t + g.balance, 0);
        return this.availableBalance + savingsTotal;
    }
}

// ═══════════════════════════════════════════════════════════════
//  GENERADOR DE METAS CON FAKER
//  ✅ faker.number.int en lugar de faker.datatype.number (eliminado en v9)
// ═══════════════════════════════════════════════════════════════
export function generateSampleSavingsGoals(count = 3) {
    const goals = [];
    for (let i = 0; i < count; i++) {
        goals.push({
            id:      faker.string.uuid(),
            name:    faker.finance.accountName(),
            balance: faker.number.int({ min: 0, max: 50000 }),
        });
    }
    return goals;
}