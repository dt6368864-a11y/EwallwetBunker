import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';

import {
  generateTransactionHistory,
  calculateNetBalance,
  generateExchangeRate,
  purchaseUSDT
} from './walletEngine';

// Requisito Fase 3.2: Mínimo 200 registros de Faker
const data = generateTransactionHistory(200);

export default function WalletScreen() {
  // ── Estado historial ──────────────────────────
  const [filter, setFilter] = useState('Todos');

  // ── Estado wallet ─────────────────────────────
  //    Saldo COP dinámico (arranca con el saldo neto calculado de las transacciones)
  const initialBalance = useMemo(() => calculateNetBalance(data), []);
  const [copBalance, setCopBalance] = useState(initialBalance);
  const [usdtBalance, setUsdtBalance] = useState(0);

  // ── Estado compra USDT ────────────────────────
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [copInput, setCopInput] = useState('');
  const [currentRate, setCurrentRate] = useState(null);
  const [lastTransaction, setLastTransaction] = useState(null);

  // ── Filtrado rápido (Fase 3.3) ────────────────
  const filteredData = useMemo(() => {
    if (filter === 'Ingreso') return data.filter(item => item.type === 'Ingreso');
    if (filter === 'Retiro') return data.filter(item => item.type === 'Retiro');
    return data;
  }, [filter]);

  // ─────────────────────────────────────────────
  //  Abrir modal → genera nueva tasa en tiempo real
  // ─────────────────────────────────────────────
  const handleOpenBuyModal = useCallback(() => {
    setCurrentRate(generateExchangeRate());
    setCopInput('');
    setLastTransaction(null);
    setShowBuyModal(true);
  }, []);

  // ─────────────────────────────────────────────
  //  Ejecutar compra
  // ─────────────────────────────────────────────
  const handlePurchase = useCallback(() => {
    const copAmount = parseFloat(copInput.replace(/\./g, '').replace(',', '.'));

    if (isNaN(copAmount)) {
      Alert.alert('Monto inválido', 'Ingrese un valor numérico válido en COP.');
      return;
    }

    const result = purchaseUSDT({
      copBalance,
      copAmount,
      exchangeRate: currentRate
    });

    setLastTransaction(result);

    if (result.status === 'Aprobado') {
      setCopBalance(result.remainingCOP);
      setUsdtBalance(prev => parseFloat((prev + result.usdt).toFixed(6)));
    }
  }, [copInput, copBalance, currentRate]);

  // ─────────────────────────────────────────────
  //  Refresh tasa sin cerrar modal
  // ─────────────────────────────────────────────
  const handleRefreshRate = useCallback(() => {
    setCurrentRate(generateExchangeRate());
    setLastTransaction(null);
    setCopInput('');
  }, []);

  // ─────────────────────────────────────────────
  //  Preview USDT mientras el usuario escribe
  // ─────────────────────────────────────────────
  const previewUSDT = useMemo(() => {
    const raw = parseFloat(copInput.replace(/\./g, '').replace(',', '.'));
    if (!raw || !currentRate || raw <= 0) return null;
    return parseFloat((raw / currentRate).toFixed(6));
  }, [copInput, currentRate]);

  // ─────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── SALDO NETO TOTAL (Fase 3.1) ── */}
      <View style={styles.balanceRow}>

        {/* COP */}
        <View style={[styles.balanceCard, styles.balanceCOP]}>
          <Text style={styles.balanceLabel}>Saldo COP</Text>
          <Text style={[styles.balanceAmount, { color: copBalance >= 0 ? '#2e7d32' : '#c62828' }]}>
            ${copBalance.toLocaleString('es-CO')}
          </Text>
          <Text style={styles.balanceCurrency}>COP</Text>
        </View>

        {/* USDT */}
        <View style={[styles.balanceCard, styles.balanceUSDT]}>
          <Text style={styles.balanceLabel}>Dólares Digitales</Text>
          <Text style={[styles.balanceAmount, { color: '#1565c0' }]}>
            {usdtBalance.toFixed(4)}
          </Text>
          <Text style={styles.balanceCurrency}>USDT</Text>
        </View>
      </View>

      {/* ── BOTÓN COMPRAR USDT ── */}
      <TouchableOpacity style={styles.buyButton} onPress={handleOpenBuyModal}>
        <Text style={styles.buyButtonText}>💱  Comprar Dólares Digitales (USDT)</Text>
      </TouchableOpacity>

      {/* ── FILTROS (Fase 3.3) ── */}
      <View style={styles.filterButtonsContainer}>
        {['Todos', 'Ingreso', 'Retiro'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.button, filter === f && styles.activeButton]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.buttonText, filter === f && styles.activeButtonText]}>
              {f === 'Todos' ? 'Todos' : f === 'Ingreso' ? 'Ingresos' : 'Retiros'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── LISTA (Fase 3.2) ── */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        initialNumToRender={15}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.accountText}>Cuenta: {item.accountNumber}</Text>
              <Text style={styles.statusText}>Estado: {item.status}</Text>
            </View>
            <Text style={[
              styles.amountText,
              { color: item.type === 'Ingreso' ? '#4caf50' : '#f44336' }
            ]}>
              {item.type === 'Ingreso' ? '+' : '-'} ${item.amount.toLocaleString('es-CO')}
            </Text>
          </View>
        )}
      />

      {/* ════════════════════════════════════════
          MODAL — COMPRAR USDT
      ════════════════════════════════════════ */}
      <Modal
        visible={showBuyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBuyModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Comprar Dólares Digitales</Text>
                <TouchableOpacity onPress={() => setShowBuyModal(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Tasa de cambio actual */}
              <View style={styles.rateContainer}>
                <Text style={styles.rateLabel}>Tasa de cambio actual</Text>
                <Text style={styles.rateValue}>
                  1 USDT = ${currentRate?.toLocaleString('es-CO')} COP
                </Text>
                <TouchableOpacity style={styles.refreshRateBtn} onPress={handleRefreshRate}>
                  <Text style={styles.refreshRateText}>🔄  Actualizar tasa</Text>
                </TouchableOpacity>
              </View>

              {/* Saldo disponible */}
              <View style={styles.availableBalance}>
                <Text style={styles.availableLabel}>Saldo disponible</Text>
                <Text style={styles.availableValue}>
                  ${copBalance.toLocaleString('es-CO')} COP
                </Text>
              </View>

              {/* Input COP */}
              <Text style={styles.inputLabel}>Monto en COP a convertir</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 200000"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={copInput}
                onChangeText={setCopInput}
              />

              {/* Preview USDT */}
              {previewUSDT !== null && (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewLabel}>Recibirías aproximadamente</Text>
                  <Text style={styles.previewValue}>{previewUSDT} USDT</Text>
                </View>
              )}

              {/* Resultado de la transacción */}
              {lastTransaction && (
                <View style={[
                  styles.resultBox,
                  lastTransaction.status === 'Aprobado'
                    ? styles.resultApproved
                    : styles.resultRejected
                ]}>
                  <Text style={styles.resultStatus}>
                    {lastTransaction.status === 'Aprobado' ? '✅' : '❌'} {lastTransaction.status}
                  </Text>
                  {lastTransaction.status === 'Aprobado' ? (
                    <>
                      <Text style={styles.resultDetail}>
                        + {lastTransaction.usdt} USDT recibidos
                      </Text>
                      <Text style={styles.resultDetail}>
                        Saldo restante: ${lastTransaction.remainingCOP.toLocaleString('es-CO')} COP
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.resultDetail}>
                      Motivo: {lastTransaction.reason}
                    </Text>
                  )}
                </View>
              )}

              {/* Botón comprar */}
              <TouchableOpacity style={styles.confirmButton} onPress={handlePurchase}>
                <Text style={styles.confirmButtonText}>Confirmar Compra</Text>
              </TouchableOpacity>

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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },

  // ── Balance cards ──
  balanceRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  balanceCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceCOP: { backgroundColor: '#ffffff' },
  balanceUSDT: { backgroundColor: '#e3f2fd' },
  balanceLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  balanceCurrency: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },

  // ── Botón comprar USDT ──
  buyButton: {
    backgroundColor: '#1565c0',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
    elevation: 2,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Filtros ──
  filterButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeButton: { backgroundColor: '#1976d2' },
  buttonText: { fontSize: 14, color: '#333', fontWeight: '600' },
  activeButtonText: { color: '#ffffff' },

  // ── Tarjetas de transacciones ──
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ccc',
  },
  accountText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  statusText: { fontSize: 12, color: '#777', marginTop: 2 },
  amountText: { fontSize: 16, fontWeight: 'bold' },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  closeBtn: { fontSize: 20, color: '#555' },

  // ── Tasa ──
  rateContainer: {
    backgroundColor: '#e8f5e9',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  rateLabel: { fontSize: 12, color: '#555', fontWeight: '600', textTransform: 'uppercase' },
  rateValue: { fontSize: 20, fontWeight: 'bold', color: '#2e7d32', marginTop: 4 },
  refreshRateBtn: { marginTop: 8 },
  refreshRateText: { fontSize: 13, color: '#1565c0', fontWeight: '600' },

  // ── Saldo disponible ──
  availableBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  availableLabel: { fontSize: 14, color: '#555' },
  availableValue: { fontSize: 14, fontWeight: '700', color: '#333' },

  // ── Input ──
  inputLabel: { fontSize: 13, color: '#555', marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: '#90caf9',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },

  // ── Preview ──
  previewContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  previewLabel: { fontSize: 12, color: '#555' },
  previewValue: { fontSize: 22, fontWeight: 'bold', color: '#1565c0', marginTop: 2 },

  // ── Resultado ──
  resultBox: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  resultApproved: { backgroundColor: '#e8f5e9' },
  resultRejected: { backgroundColor: '#ffebee' },
  resultStatus: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  resultDetail: { fontSize: 14, color: '#333', marginTop: 2 },

  // ── Confirmar ──
  confirmButton: {
    backgroundColor: '#1565c0',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});