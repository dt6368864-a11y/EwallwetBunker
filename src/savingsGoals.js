import { faker } from '@faker-js/faker';

class SavingsGoal {
    constructor(name, initialAmount = 0) {
        this.name = name;
        this.balance = initialAmount;
    }
}

class Wallet {
    constructor() {
        this.availableBalance = 0;
        this.savingsGoals = [];
    }

    createSavingsGoal(name, initialAmount) {
        const goal = new SavingsGoal(name, initialAmount);
        this.savingsGoals.push(goal);
        return goal;
    }

    transferToGoal(goalName, amount) {
        if (amount <= 0) {
            throw new Error("El monto debe ser mayor a cero");
        }
        if (amount > this.availableBalance) {
            throw new Error("Saldo insuficiente");
        }

        const goal = this.savingsGoals.find(g => g.name === goalName);
        if (!goal) {
            throw new Error("Objetivo de ahorro no encontrado");
        }

        this.availableBalance -= amount;
        goal.balance += amount;
    }

    setAvailableBalance(balance) {
        this.availableBalance = balance;
    }

    getTotalBalance() {
        const savingsTotal = this.savingsGoals.reduce((total, goal) => total + goal.balance, 0);
        return this.availableBalance + savingsTotal;
    }
}

// Generación de objetos de prueba
export function generateSampleSavingsGoals(count) {
    const wallet = new Wallet();
    wallet.setAvailableBalance(100000); // Balance inicial para trabajo

    for (let i = 0; i < count; i++) {
        wallet.createSavingsGoal(faker.finance.accountName(), faker.datatype.number({ min: 0, max: 50000 }));
    }

    return wallet;
}

// Exportar classes y funciones
export { Wallet, SavingsGoal };
