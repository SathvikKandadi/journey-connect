import { Button, Card, Text } from '@rneui/themed';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

type PaymentMethod = 'card' | 'upi' | 'cash';

export default function PaymentScreen() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const handlePayment = () => {
    // In a real app, this would process the payment
    // For now, just redirect to home
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Card.Title>Select Payment Method</Card.Title>
        <Card.Divider />

        <View style={styles.paymentOptions}>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedMethod === 'card' && styles.selectedOption
            ]}
            onPress={() => setSelectedMethod('card')}
          >
            <Text style={styles.paymentText}>💳 Credit/Debit Card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedMethod === 'upi' && styles.selectedOption
            ]}
            onPress={() => setSelectedMethod('upi')}
          >
            <Text style={styles.paymentText}>📱 UPI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedMethod === 'cash' && styles.selectedOption
            ]}
            onPress={() => setSelectedMethod('cash')}
          >
            <Text style={styles.paymentText}>💵 Cash</Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Complete Payment"
          onPress={handlePayment}
          disabled={!selectedMethod}
          containerStyle={styles.buttonContainer}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  paymentOptions: {
    marginVertical: 20,
  },
  paymentOption: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedOption: {
    borderColor: '#2089dc',
    backgroundColor: '#e3f2fd',
  },
  paymentText: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    marginVertical: 8,
  },
}); 