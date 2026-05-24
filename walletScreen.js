import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  TextInput, Modal, ScrollView, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';

import {
  generateTransactionHistory,
  calculateNetBalance,
  calculateTotalADSOPoints,
  generateExchangeRate,
  purchaseUSDT,
  classifySpendingBehavior,
  generateCriticalSpendingHistory,
} from './walletEngine';

import {
  Wallet,
  generateSampleSavingsGoals,
} from './src/savingsGoals';

// ── 200 registros Faker ────────────────────────────────────────
const data = generateTransactionHistory(200);

// ── Helper de formato ──────────────────────────────────────────
const fmt = (n) => n.toLocaleString('es-CO');

export default function WalletScreen() {

  // ── Estado: historial ──────────────────────────────────────
  const [filter, setFilter] = useState('Todos');

  // ── Estado: saldos ─────────────────────────────────────────
  const initialCOP = useMemo(() => calculateNetBalance(data), []);
  const [copBalance,  setCopBalance]  = useState(initialCOP);
  const [usdtBalance, setUsdtBalance] = useState(0);

  // ── Estado: puntos ADSO ────────────────────────────────────
  const initialADSO = useMemo(() => calculateTotalADSOPoints(data), []);
  const [adsoPoints] = useState(initialADSO);

  // ── Estado: modal compra USDT ──────────────────────────────
  const [showBuyModal,    setShowBuyModal]    = useState(false);
  const [copInput,        setCopInput]        = useState('');
  const [currentRate,     setCurrentRate]     = useState(null);
  const [lastTransaction, setLastTransaction] = useState(null);

  // ── Estado: metas de ahorro ────────────────────────────────
  const savingsWallet = useMemo(() => {
    const w = new Wallet();
    w.setAvailableBalance(copBalance);
    generateSampleSavingsGoals(3).forEach(g => w.createSavingsGoal(g.name, g.balance));
    return w;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [goals,         setGoals]         = useState(() => [...savingsWallet.savingsGoals]);
  const [showGoalModal, setShowGoalModal]  = useState(false);
  const [selectedGoal,  setSelectedGoal]  = useState(null);
  const [goalInput,     setGoalInput]     = useState('');

  // ── Estado: clasificador de gasto ─────────────────────────
 
  const spendingStatus = useMemo(() => classifySpendingBehavior(data), []);
  const [gastoCritico, setGastoCritico] = useState(spendingStatus);

  const handleSimulateCritical = useCallback(() => {
    const criticalData = generateCriticalSpendingHistory(100);
    setGastoCritico(classifySpendingBehavior(criticalData));
  }, []);

  const handleResetSpending = useCallback(() => {
    setGastoCritico(classifySpendingBehavior(data));
  }, []);

  // ── Filtrado rápido ────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (filter === 'Ingreso') return data.filter(t => t.type === 'Ingreso');
    if (filter === 'Retiro')  return data.filter(t => t.type === 'Retiro');
    return data;
  }, [filter]);

  // ── USDT: abrir modal ──────────────────────────────────────
  const handleOpenBuyModal = useCallback(() => {
    setCurrentRate(generateExchangeRate());
    setCopInput('');
    setLastTransaction(null);
    setShowBuyModal(true);
  }, []);

  // ── USDT: actualizar tasa ──────────────────────────────────
  const handleRefreshRate = useCallback(() => {
    setCurrentRate(generateExchangeRate());
    setLastTransaction(null);
    setCopInput('');
  }, []);

  // ── USDT: ejecutar compra ──────────────────────────────────
  const handlePurchase = useCallback(() => {
    const copAmount = parseFloat(copInput.replace(/\./g, '').replace(',', '.'));
    if (isNaN(copAmount)) {
      Alert.alert('Monto inválido', 'Ingrese un valor numérico válido en COP.');
      return;
    }
    const result = purchaseUSDT({ copBalance, copAmount, exchangeRate: currentRate });
    setLastTransaction(result);
    if (result.status === 'Aprobado') {
      setCopBalance(result.remainingCOP);
      setUsdtBalance(prev => parseFloat((prev + result.usdt).toFixed(6)));
    }
  }, [copInput, copBalance, currentRate]);

  // ── USDT: preview en tiempo real ───────────────────────────
  const previewUSDT = useMemo(() => {
    const raw = parseFloat(copInput.replace(/\./g, '').replace(',', '.'));
    if (!raw || !currentRate || raw <= 0) return null;
    return parseFloat((raw / currentRate).toFixed(6));
  }, [copInput, currentRate]);

  // ── METAS: abrir modal ─────────────────────────────────────
  const handleOpenGoalModal = useCallback(() => {
    setSelectedGoal(null);
    setGoalInput('');
    setShowGoalModal(true);
  }, []);

  // ── METAS: transferir ──────────────────────────────────────
  const handleTransferToGoal = useCallback(() => {
    const amount = parseFloat(goalInput.replace(/\./g, '').replace(',', '.'));

    if (isNaN(amount)) {
      Alert.alert('Monto inválido', 'Ingresa un número válido.');
      return;
    }
    if (!selectedGoal) {
      Alert.alert('Selecciona una meta', 'Toca una meta antes de transferir.');
      return;
    }

    try {
      savingsWallet.setAvailableBalance(copBalance);
      savingsWallet.transferToGoal(selectedGoal.name, amount);

      setCopBalance(savingsWallet.availableBalance);
      setGoals([...savingsWallet.savingsGoals]);
      setGoalInput('');
      setSelectedGoal(null);

      Alert.alert(
        '✅ Transferencia exitosa',
        `$${fmt(amount)} COP enviados a "${selectedGoal.name}"`,
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }, [goalInput, copBalance, selectedGoal, savingsWallet]);

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>

      {/* ── FILA DE SALDOS ── */}
      <View style={styles.balanceRow}>
        <View style={[styles.balanceCard, styles.cardCOP]}>
          <Text style={styles.balLabel}>Saldo COP</Text>
          <Text style={[styles.balAmount, { color: copBalance >= 0 ? '#2e7d32' : '#c62828' }]}>
            ${fmt(copBalance)}
          </Text>
          <Text style={styles.balCurrency}>COP</Text>
        </View>

        <View style={[styles.balanceCard, styles.cardUSDT]}>
          <Text style={styles.balLabel}>Dólares Digitales</Text>
          <Text style={[styles.balAmount, { color: '#1565c0' }]}>
            {usdtBalance.toFixed(4)}
          </Text>
          <Text style={styles.balCurrency}>USDT</Text>
        </View>
      </View>

      {/* ── TARJETA PUNTOS ADSO ── */}
      <View style={styles.adsoCard}>
        <View style={styles.adsoLeft}>
          <Text style={styles.adsoIcon}>⭐</Text>
          <View>
            <Text style={styles.adsoLabel}>Puntos ADSO</Text>
            <Text style={styles.adsoSub}>1% en transacciones {'>'} $50,000 Completadas</Text>
          </View>
        </View>
        <Text style={styles.adsoValue}>{fmt(adsoPoints)} pts</Text>
      </View>

      {/* ── ALERTA GASTO CRÍTICO ── */}
      <View style={[
        styles.spendingCard,
        gastoCritico === 'Gasto Crítico' ? styles.spendingCritical : styles.spendingStable,
      ]}>
        <View style={styles.spendingLeft}>
          <Text style={styles.spendingIcon}>
            {gastoCritico === 'Gasto Crítico' ? '🚨' : '✅'}
          </Text>
          <View>
            <Text style={styles.spendingLabel}>{gastoCritico}</Text>
            <Text style={styles.spendingSub}>
              {gastoCritico === 'Gasto Crítico'
                ? 'Tus retiros superan el 70% de tus ingresos'
                : 'Tus retiros están dentro del límite saludable'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={gastoCritico === 'Gasto Crítico' ? handleResetSpending : handleSimulateCritical}
          style={styles.spendingBtn}
        >
          <Text style={styles.spendingBtnTxt}>
            {gastoCritico === 'Gasto Crítico' ? 'Resetear' : 'Simular'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── BOTÓN COMPRAR USDT ── */}
      <TouchableOpacity style={styles.buyButton} onPress={handleOpenBuyModal}>
        <Text style={styles.buyButtonText}>💱  Comprar Dólares Digitales (USDT)</Text>
      </TouchableOpacity>

      {/* ── BOTÓN METAS DE AHORRO ── */}
      <TouchableOpacity
        style={[styles.buyButton, { backgroundColor: '#2e7d32', marginBottom: 14 }]}
        onPress={handleOpenGoalModal}
      >
        <Text style={styles.buyButtonText}>🎯  Metas de Ahorro</Text>
      </TouchableOpacity>

      {/* ── FILTROS ── */}
      <View style={styles.filterRow}>
        {['Todos', 'Ingreso', 'Retiro'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTxt, filter === f && styles.filterTxtActive]}>
              {f === 'Todos' ? 'Todos' : f === 'Ingreso' ? 'Ingresos' : 'Retiros'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── LISTA DE TRANSACCIONES ── */}
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        initialNumToRender={15}
        renderItem={({ item }) => (
          <View style={[
            styles.card,
            { borderLeftColor: item.type === 'Ingreso' ? '#4caf50' : '#f44336' },
          ]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardAccount}>Cuenta: {item.accountNumber}</Text>
              <Text style={styles.cardStatus}>Estado: {item.status}</Text>
              {item.puntosADSO > 0 && (
                <Text style={styles.cardADSO}>⭐ +{fmt(item.puntosADSO)} Puntos ADSO</Text>
              )}
            </View>
            <Text style={[
              styles.cardAmount,
              { color: item.type === 'Ingreso' ? '#4caf50' : '#f44336' },
            ]}>
              {item.type === 'Ingreso' ? '+' : '-'} ${fmt(item.amount)}
            </Text>
          </View>
        )}
      />

      {/* ════════════════════════════════════════════════════
          MODAL — COMPRAR USDT
      ════════════════════════════════════════════════════ */}
      <Modal
        visible={showBuyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBuyModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Comprar Dólares Digitales</Text>
                <TouchableOpacity onPress={() => setShowBuyModal(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rateBox}>
                <Text style={styles.rateLabel}>Tasa de cambio actual</Text>
                <Text style={styles.rateValue}>
                  1 USDT = ${currentRate?.toLocaleString('es-CO')} COP
                </Text>
                <TouchableOpacity onPress={handleRefreshRate}>
                  <Text style={styles.refreshTxt}>🔄  Actualizar tasa</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.availRow}>
                <Text style={styles.availLabel}>Saldo disponible</Text>
                <Text style={styles.availValue}>${fmt(copBalance)} COP</Text>
              </View>

              <Text style={styles.inputLabel}>Monto en COP a convertir</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 200000"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={copInput}
                onChangeText={setCopInput}
              />

              {previewUSDT !== null && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Recibirías aproximadamente</Text>
                  <Text style={styles.previewValue}>{previewUSDT} USDT</Text>
                </View>
              )}

              {lastTransaction && (
                <View style={[
                  styles.resultBox,
                  lastTransaction.status === 'Aprobado' ? styles.resultOk : styles.resultErr,
                ]}>
                  <Text style={styles.resultStatus}>
                    {lastTransaction.status === 'Aprobado' ? '✅' : '❌'} {lastTransaction.status}
                  </Text>
                  {lastTransaction.status === 'Aprobado' ? (
                    <>
                      <Text style={styles.resultDetail}>+ {lastTransaction.usdt} USDT recibidos</Text>
                      <Text style={styles.resultDetail}>
                        Saldo restante: ${fmt(lastTransaction.remainingCOP)} COP
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.resultDetail}>Motivo: {lastTransaction.reason}</Text>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.confirmBtn} onPress={handlePurchase}>
                <Text style={styles.confirmTxt}>Confirmar Compra</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════════
          MODAL — METAS DE AHORRO
      ════════════════════════════════════════════════════ */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGoalModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🎯 Metas de Ahorro</Text>
                <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Toca una meta para transferirle dinero</Text>

              {/* Lista de metas */}
              {goals.map(g => (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => { setSelectedGoal(g); setGoalInput(''); }}
                  style={[
                    styles.card,
                    {
                      borderLeftColor: selectedGoal?.id === g.id ? '#2e7d32' : '#ccc',
                      marginBottom: 8,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardAccount}>{g.name}</Text>
                    <Text style={styles.cardStatus}>
                      Ahorro acumulado: ${fmt(g.balance)} COP
                    </Text>
                  </View>
                  {selectedGoal?.id === g.id && (
                    <Text style={{ color: '#2e7d32', fontWeight: '800', fontSize: 18 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}

              {/* Formulario de transferencia */}
              {selectedGoal && (
                <>
                  <View style={styles.rateBox}>
                    <Text style={styles.rateLabel}>Meta seleccionada</Text>
                    <Text style={styles.rateValue}>{selectedGoal.name}</Text>
                    <Text style={[styles.refreshTxt, { color: '#2e7d32' }]}>
                      Ahorro actual: ${fmt(selectedGoal.balance)} COP
                    </Text>
                  </View>

                  <View style={styles.availRow}>
                    <Text style={styles.availLabel}>Saldo disponible</Text>
                    <Text style={styles.availValue}>${fmt(copBalance)} COP</Text>
                  </View>

                  <Text style={styles.inputLabel}>Monto a transferir (COP)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 50000"
                    placeholderTextColor="#aaa"
                    keyboardType="numeric"
                    value={goalInput}
                    onChangeText={setGoalInput}
                  />

                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: '#2e7d32' }]}
                    onPress={handleTransferToGoal}
                  >
                    <Text style={styles.confirmTxt}>Transferir a Meta</Text>
                  </TouchableOpacity>
                </>
              )}

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────
//  ESTILOS
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },

  // Saldos
  balanceRow:      { flexDirection: 'row', marginBottom: 12, gap: 10 },
  balanceCard:     { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center',
                     elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                     shadowOpacity: 0.1, shadowRadius: 4 },
  cardCOP:         { backgroundColor: '#ffffff' },
  cardUSDT:        { backgroundColor: '#e3f2fd' },
  balLabel:        { fontSize: 11, color: '#666', fontWeight: '700',
                     textTransform: 'uppercase', letterSpacing: 0.5 },
  balAmount:       { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  balCurrency:     { fontSize: 11, color: '#999', marginTop: 2 },

  // ADSO
  adsoCard:        { backgroundColor: '#fff8e1', borderRadius: 12, padding: 14,
                     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     marginBottom: 12, elevation: 2,
                     shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                     shadowOpacity: 0.08, shadowRadius: 3,
                     borderLeftWidth: 4, borderLeftColor: '#f9a825' },
  adsoLeft:        { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  adsoIcon:        { fontSize: 28 },
  adsoLabel:       { fontSize: 14, fontWeight: '800', color: '#333' },
  adsoSub:         { fontSize: 11, color: '#888', marginTop: 2 },
  adsoValue:       { fontSize: 18, fontWeight: 'bold', color: '#f57f17' },

  // Botones principales
  buyButton:       { backgroundColor: '#1565c0', paddingVertical: 13, borderRadius: 10,
                     alignItems: 'center', marginBottom: 10, elevation: 2 },
  buyButtonText:   { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Filtros
  filterRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  filterBtn:       { flex: 1, backgroundColor: '#e0e0e0', paddingVertical: 10,
                     marginHorizontal: 4, borderRadius: 8, alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#1976d2' },
  filterTxt:       { fontSize: 14, color: '#333', fontWeight: '600' },
  filterTxtActive: { color: '#ffffff' },

  // Tarjeta transacción / meta
  card:            { backgroundColor: '#fff', padding: 16, borderRadius: 8,
                     flexDirection: 'row', justifyContent: 'space-between',
                     alignItems: 'center', marginBottom: 10, borderLeftWidth: 4 },
  cardAccount:     { fontSize: 14, fontWeight: 'bold', color: '#333' },
  cardStatus:      { fontSize: 12, color: '#777', marginTop: 2 },
  cardADSO:        { fontSize: 11, color: '#f57f17', fontWeight: '700', marginTop: 3 },
  cardAmount:      { fontSize: 16, fontWeight: 'bold' },

  // Modal base
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
                     padding: 24, maxHeight: '90%' },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between',
                     alignItems: 'center', marginBottom: 20 },
  modalTitle:      { fontSize: 18, fontWeight: '800', color: '#111' },
  closeBtn:        { fontSize: 20, color: '#555' },

  rateBox:         { backgroundColor: '#e8f5e9', padding: 14, borderRadius: 10,
                     marginBottom: 14, alignItems: 'center' },
  rateLabel:       { fontSize: 12, color: '#555', fontWeight: '600', textTransform: 'uppercase' },
  rateValue:       { fontSize: 20, fontWeight: 'bold', color: '#2e7d32', marginTop: 4 },
  refreshTxt:      { fontSize: 13, color: '#1565c0', fontWeight: '600', marginTop: 8 },

  availRow:        { flexDirection: 'row', justifyContent: 'space-between',
                     backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 14 },
  availLabel:      { fontSize: 14, color: '#555' },
  availValue:      { fontSize: 14, fontWeight: '700', color: '#333' },

  inputLabel:      { fontSize: 13, color: '#555', marginBottom: 6, fontWeight: '600' },
  input:           { borderWidth: 1.5, borderColor: '#90caf9', borderRadius: 10, padding: 12,
                     fontSize: 16, color: '#111', backgroundColor: '#fafafa', marginBottom: 12 },

  previewBox:      { backgroundColor: '#e3f2fd', padding: 12, borderRadius: 10,
                     marginBottom: 14, alignItems: 'center' },
  previewLabel:    { fontSize: 12, color: '#555' },
  previewValue:    { fontSize: 22, fontWeight: 'bold', color: '#1565c0', marginTop: 2 },

  resultBox:       { padding: 14, borderRadius: 10, marginBottom: 14 },
  resultOk:        { backgroundColor: '#e8f5e9' },
  resultErr:       { backgroundColor: '#ffebee' },
  resultStatus:    { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  resultDetail:    { fontSize: 14, color: '#333', marginTop: 2 },

  confirmBtn:      { backgroundColor: '#1565c0', paddingVertical: 15, borderRadius: 10,
                     alignItems: 'center', marginTop: 4 },
  confirmTxt:      { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Gasto Crítico
  spendingCard:    { borderRadius: 12, padding: 14, flexDirection: 'row',
                     justifyContent: 'space-between', alignItems: 'center',
                     marginBottom: 12, elevation: 3,
                     shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                     shadowOpacity: 0.12, shadowRadius: 4,
                     borderLeftWidth: 4 },
  spendingCritical:{ backgroundColor: '#ffebee', borderLeftColor: '#c62828' },
  spendingStable:  { backgroundColor: '#e8f5e9', borderLeftColor: '#2e7d32' },
  spendingLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  spendingIcon:    { fontSize: 28 },
  spendingLabel:   { fontSize: 14, fontWeight: '800', color: '#333' },
  spendingSub:     { fontSize: 11, color: '#888', marginTop: 2, flexShrink: 1 },
  spendingBtn:     { backgroundColor: 'rgba(0,0,0,0.08)', paddingHorizontal: 12,
                     paddingVertical: 6, borderRadius: 8 },
  spendingBtnTxt:  { fontSize: 12, fontWeight: '700', color: '#333' },
});