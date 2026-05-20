import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet
} from 'react-native';

import {
  generateTransactionHistory,
  calculateNetBalance
} from './walletEngine';

// Requisito Fase 3.2: Mínimo 200 registros de Faker
const data = generateTransactionHistory(200);

export default function WalletScreen() {
  const [filter, setFilter] = useState('Todos');

  // Filtrado rápido en tiempo real (Fase 3.3)
  const filteredData = useMemo(() => {
    if (filter === 'Ingreso') {
      return data.filter(item => item.type === 'Ingreso');
    }
    if (filter === 'Retiro') {
      return data.filter(item => item.type === 'Retiro');
    }
    return data;
  }, [filter]);

  // Cálculo memorizado del saldo neto total de los datos base (Fase 3.1)
  const totalBalance = useMemo(() => calculateNetBalance(data), []);

  return (
    <View style={styles.container}>
      
      {/* REQUISITO FASE 3.1: Saldo Neto Resaltado en la parte superior */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceTitle}>Saldo Neto Total</Text>
        <Text style={[styles.balanceAmount, { color: totalBalance >= 0 ? '#2e7d32' : '#c62828' }]}>
          ${totalBalance.toLocaleString('es-CO')} COP
        </Text>
      </View>

      {/* REQUISITO FASE 3.3: Filtros Rápidos en la UI */}
      <View style={styles.filterButtonsContainer}>
        <TouchableOpacity 
          style={[styles.button, filter === 'Todos' && styles.activeButton]} 
          onPress={() => setFilter('Todos')}
        >
          <Text style={[styles.buttonText, filter === 'Todos' && styles.activeButtonText]}>Todos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, filter === 'Ingreso' && styles.activeButton]} 
          onPress={() => setFilter('Ingreso')}
        >
          <Text style={[styles.buttonText, filter === 'Ingreso' && styles.activeButtonText]}>Ingresos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, filter === 'Retiro' && styles.activeButton]} 
          onPress={() => setFilter('Retiro')}
        >
          <Text style={[styles.buttonText, filter === 'Retiro' && styles.activeButtonText]}>Retiros</Text>
        </TouchableOpacity>
      </View>

      {/* REQUISITO FASE 3.2: Renderizado optimizado con FlatList */}
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
            {/* REQUISITO FASE 3.2: Ingreso -> Verde | Retiro -> Rojo */}
            <Text style={[
              styles.amountText, 
              { color: item.type === 'Ingreso' ? '#4caf50' : '#f44336' }
            ]}>
              {item.type === 'Ingreso' ? '+' : '-'} ${item.amount.toLocaleString('es-CO')}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  balanceContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceTitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 4,
  },
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
  activeButton: {
    backgroundColor: '#1976d2',
  },
  buttonText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ccc'
  },
  accountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  statusText: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});