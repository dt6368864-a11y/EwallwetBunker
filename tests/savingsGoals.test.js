import { Wallet } from '../src/savingsGoals';
import { faker } from '@faker-js/faker';

describe('Savings Goal Feature', () => {
    let wallet;

    beforeEach(() => {
        wallet = new Wallet();
        wallet.setAvailableBalance(100000);
        wallet.createSavingsGoal('Para la Moto', 30000);
        wallet.createSavingsGoal('Para el concierto', 15000);
    });

    test('Debería transferir dinero a un objetivo de ahorro', () => {
        wallet.transferToGoal('Para la Moto', 5000);
        
        expect(wallet.savingsGoals.find(g => g.name === 'Para la Moto').balance).toBe(35000);
        expect(wallet.availableBalance).toBe(95000);
    });

    test('No debería permitir transferencias que superen el saldo disponiblee', () => {
        expect(() => wallet.transferToGoal('Para la Moto', 200000)).toThrow('Saldo insuficiente');
    });

    test('No debería permitir transferencias negativaas o ceroo', () => {
        expect(() => wallet.transferToGoal('Para la Moto', -1000)).toThrow('El monto debe ser mayor a cero');
    });

    test('Debería sumarse el saldo total de la billetera y los objetivos de ahorro', () => {
        wallet.transferToGoal('Para la Moto', 5000);
        const totalBalance = wallet.getTotalBalance();
        expect(totalBalance).toBe(100000 + 35000 + 15000); // 100000 - 5000 + 35000 + 15000
    });

    test('Debería lanzar un error si el objetivo de ahorro no existe', () => {
        expect(() => wallet.transferToGoal('Objetivo Inexistente', 5000)).toThrow('Objetivo de ahorro no encontrado');
    });
});
