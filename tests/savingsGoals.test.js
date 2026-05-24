import { Wallet } from '../src/savingsGoals';

describe('Savings Goal Feature', () => {
    let wallet;

    beforeEach(() => {
        wallet = new Wallet();
        wallet.setAvailableBalance(100000);
        wallet.createSavingsGoal('Para la Moto',      30000);
        wallet.createSavingsGoal('Para el concierto', 15000);
    });

    // ── TRANSFERENCIA BÁSICA ────────────────────────────────────
    test('transfiere dinero a un objetivo y lo resta del saldo disponible', () => {
        wallet.transferToGoal('Para la Moto', 5000);

        // El saldo disponible baja exactamente el monto transferido
        expect(wallet.availableBalance).toBe(95000);

        // La meta sube exactamente ese monto
        expect(wallet.savingsGoals.find(g => g.name === 'Para la Moto').balance).toBe(35000);
    });

    // ── SALDO INSUFICIENTE ──────────────────────────────────────
    test('no permite transferencias que superen el saldo disponible', () => {
        expect(() => wallet.transferToGoal('Para la Moto', 200000))
            .toThrow('Saldo insuficiente');
    });

    // ── MONTOS INVÁLIDOS ────────────────────────────────────────
    test('no permite transferencias negativas', () => {
        expect(() => wallet.transferToGoal('Para la Moto', -1000))
            .toThrow('El monto debe ser mayor a cero');
    });

    test('no permite transferencias de cero', () => {
        expect(() => wallet.transferToGoal('Para la Moto', 0))
            .toThrow('El monto debe ser mayor a cero');
    });

    // ── TOTAL CORRECTO (saldo disponible + todas las metas) ─────
    test('el total suma saldo disponible y todas las metas sin duplicar dinero', () => {
        wallet.transferToGoal('Para la Moto', 5000);

        // disponible: 100,000 - 5,000 = 95,000
        // metas:      35,000 + 15,000 = 50,000
        // total:      95,000 + 50,000 = 145,000
        expect(wallet.getTotalBalance()).toBe(145000);
    });

    test('el total antes de cualquier transferencia es correcto', () => {
        // disponible: 100,000 | metas: 30,000 + 15,000 = 45,000 | total: 145,000
        expect(wallet.getTotalBalance()).toBe(145000);
    });

    // ── OBJETIVO INEXISTENTE ────────────────────────────────────
    test('lanza error si el objetivo de ahorro no existe', () => {
        expect(() => wallet.transferToGoal('Objetivo Inexistente', 5000))
            .toThrow('Objetivo de ahorro no encontrado');
    });

    // ── EL DINERO NO SE DUPLICA  ───────────
    test('el dinero transferido no se duplica ni queda flotando', () => {
        const totalAntes = wallet.getTotalBalance();

        wallet.transferToGoal('Para el concierto', 10000);

        const totalDespues = wallet.getTotalBalance();

        // El total global debe ser idéntico antes y después
        expect(totalDespues).toBe(totalAntes);

        // El saldo disponible bajó exactamente 10,000
        expect(wallet.availableBalance).toBe(90000);

        // La meta subió exactamente 10,000
        expect(wallet.savingsGoals.find(g => g.name === 'Para el concierto').balance).toBe(25000);
    });
});