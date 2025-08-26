import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

export function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState('1');
  const [showModal, setShowModal] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  useEffect(() => {
    // Mock permission for demo purposes
    setHasPermission(true);
  }, []);

  const handleBarCodeScanned = ({ type, data }: any) => {
    if (!isScanning) return;
    
    setIsScanning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Mock product lookup - replace with API call
    const mockProduct = {
      barcode: data,
      name: 'Grey Goose Vodka',
      size: '750ml',
      currentStock: 12,
      unit: 'bottles',
    };
    
    setScannedProduct(mockProduct);
    setShowModal(true);
  };

  const handleManualScan = () => {
    // Mock manual scan for testing
    const mockProduct = {
      barcode: '123456789',
      name: 'Grey Goose Vodka',
      size: '750ml',
      currentStock: 12,
      unit: 'bottles',
    };
    
    setScannedProduct(mockProduct);
    setShowModal(true);
  };

  const handleSaveCount = () => {
    const scan = {
      ...scannedProduct,
      quantity: parseFloat(quantity),
      timestamp: new Date().toISOString(),
    };
    
    setRecentScans([scan, ...recentScans]);
    setShowModal(false);
    setScannedProduct(null);
    setQuantity('1');
    setIsScanning(true);
    
    Alert.alert('Success', 'Count saved successfully');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-off" size={64} color={Colors.gray[400]} />
        <Text style={styles.permissionText}>Camera permission is required</Text>
        <TouchableOpacity style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.gray[900], Colors.gray[800], Colors.gray[700]]}
      style={styles.container}
    >
      <View style={styles.mockCamera}>
        <View style={styles.cameraPlaceholder}>
          <Ionicons name="camera" size={64} color={Colors.gray[400]} />
          <Text style={styles.cameraText}>Camera View</Text>
          <Text style={styles.cameraSubtext}>
            {isScanning ? 'Ready to scan barcodes' : 'Processing...'}
          </Text>
        </View>
      </View>
      
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="flash-off" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Count</Text>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="help-circle-outline" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.scanCorner, styles.topLeft]} />
            <View style={[styles.scanCorner, styles.topRight]} />
            <View style={[styles.scanCorner, styles.bottomLeft]} />
            <View style={[styles.scanCorner, styles.bottomRight]} />
          </View>
          <Text style={styles.scanHint}>
            {isScanning ? 'Point camera at barcode' : 'Processing...'}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.recentScansHeader}>
            <Text style={styles.recentScansTitle}>Recent Scans ({recentScans.length})</Text>
            <TouchableOpacity>
              <Text style={styles.clearButton}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.recentScansList}>
            {recentScans.slice(0, 3).map((scan, index) => (
              <View key={index} style={styles.recentScanItem}>
                <Text style={styles.recentScanName}>{scan.name}</Text>
                <Text style={styles.recentScanQuantity}>{scan.quantity} {scan.unit}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.manualButton} onPress={handleManualScan}>
            <Ionicons name="keypad" size={20} color={Colors.white} />
            <Text style={styles.manualButtonText}>Manual Entry</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Product Scanned</Text>
            
            {scannedProduct && (
              <>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{scannedProduct.name}</Text>
                  <Text style={styles.productDetails}>
                    {scannedProduct.size} • Current Stock: {scannedProduct.currentStock} {scannedProduct.unit}
                  </Text>
                </View>

                <View style={styles.quantityInput}>
                  <Text style={styles.inputLabel}>Count Quantity</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(String(Math.max(0, parseFloat(quantity) - 1)))}
                    >
                      <Ionicons name="remove" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityField}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(String(parseFloat(quantity) + 1))}
                    >
                      <Ionicons name="add" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowModal(false);
                      setIsScanning(true);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveCount}
                  >
                    <Text style={styles.saveButtonText}>Save Count</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mockCamera: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraText: {
    fontSize: Typography.sizes.lg,
    color: Colors.white,
    marginTop: Spacing.md,
    fontWeight: Typography.weights.semibold,
  },
  cameraSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.gray[400],
    marginTop: Spacing.xs,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanHint: {
    marginTop: Spacing.lg,
    fontSize: Typography.sizes.md,
    color: Colors.white,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  recentScansHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  recentScansTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  clearButton: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
  },
  recentScansList: {
    marginBottom: Spacing.lg,
  },
  recentScanItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  recentScanName: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
  },
  recentScanQuantity: {
    fontSize: Typography.sizes.sm,
    color: Colors.gray[400],
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  manualButtonText: {
    marginLeft: Spacing.sm,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  permissionText: {
    fontSize: Typography.sizes.lg,
    color: Colors.gray[600],
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  permissionButtonText: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.gray[900],
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  productInfo: {
    marginBottom: Spacing.lg,
  },
  productName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.gray[900],
    marginBottom: Spacing.xs,
  },
  productDetails: {
    fontSize: Typography.sizes.sm,
    color: Colors.gray[600],
  },
  quantityInput: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.gray[700],
    marginBottom: Spacing.sm,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityField: {
    marginHorizontal: Spacing.lg,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.gray[900],
    minWidth: 80,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.gray[700],
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
});