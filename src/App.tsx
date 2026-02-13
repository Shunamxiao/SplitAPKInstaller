import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  ScrollView,
  NativeModules,
  Linking,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import {
  parsePackageFile,
  copyObbFiles,
  cleanupExtractDir,
  ParsedPackage,
} from './utils/fileParser';
import {installPackage} from './utils/installer';

const {PermissionModule} = NativeModules;

type InstallStatus = 'idle' | 'selecting' | 'parsing' | 'copying_obb' | 'installing' | 'done' | 'error';

function App(): React.JSX.Element {
  const [status, setStatus] = useState<InstallStatus>('idle');
  const [statusText, setStatusText] = useState('');
  const [packageInfo, setPackageInfo] = useState<ParsedPackage | null>(null);
  const [hasStoragePermission, setHasStoragePermission] = useState<boolean | null>(null);
  const [hasInstallPermission, setHasInstallPermission] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS !== 'android') {
      setHasStoragePermission(true);
      setHasInstallPermission(true);
      return;
    }

    try {
      // Check storage permission
      const storageGranted = await PermissionModule.hasManageStoragePermission();
      setHasStoragePermission(storageGranted);

      // Check install permission
      const installGranted = await PermissionModule.canInstallPackages();
      setHasInstallPermission(installGranted);
    } catch (err) {
      console.warn('Permission check failed:', err);
      // Fallback for older Android versions
      setHasStoragePermission(true);
      setHasInstallPermission(true);
    }
  };

  const requestStoragePermission = async () => {
    try {
      const apiLevel = Platform.Version as number;
      
      if (apiLevel >= 30) {
        // Android 11+ needs MANAGE_EXTERNAL_STORAGE
        Alert.alert(
          '需要存储权限',
          '请在设置中允许"所有文件访问"权限，以便读取和复制安装包文件。',
          [
            {text: '取消', style: 'cancel'},
            {
              text: '去设置',
              onPress: async () => {
                await PermissionModule.requestManageStoragePermission();
                // Re-check after returning from settings
                setTimeout(checkPermissions, 1000);
              },
            },
          ]
        );
      } else {
        // Android 10 and below
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        const hasPermission = 
          granted['android.permission.READ_EXTERNAL_STORAGE'] === 'granted' &&
          granted['android.permission.WRITE_EXTERNAL_STORAGE'] === 'granted';
        setHasStoragePermission(hasPermission);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const requestInstallPermission = async () => {
    Alert.alert(
      '需要安装权限',
      '请在设置中允许"安装未知应用"权限。',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '去设置',
          onPress: async () => {
            await PermissionModule.requestInstallPermission();
            setTimeout(checkPermissions, 1000);
          },
        },
      ]
    );
  };

  const selectAndInstall = async () => {
    // Re-check permissions before proceeding
    await checkPermissions();

    if (!hasStoragePermission) {
      await requestStoragePermission();
      return;
    }

    if (!hasInstallPermission) {
      await requestInstallPermission();
      return;
    }

    try {
      setStatus('selecting');
      setStatusText('选择文件...');

      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });

      const file = result[0];
      const fileName = file.name?.toLowerCase() || '';

      if (
        !fileName.endsWith('.apk') &&
        !fileName.endsWith('.xapk') &&
        !fileName.endsWith('.apks') &&
        !fileName.endsWith('.apkm')
      ) {
        Alert.alert('格式错误', '请选择 APK、XAPK、APKS 或 APKM 文件');
        setStatus('idle');
        return;
      }

      // Copy file to cache if it's a content URI
      let filePath = file.uri;
      if (filePath.startsWith('content://')) {
        setStatusText('复制文件...');
        const destPath = `${RNFS.CachesDirectoryPath}/${file.name}`;
        await RNFS.copyFile(filePath, destPath);
        filePath = destPath;
      }

      setStatus('parsing');
      setStatusText('解析安装包...');

      const parsed = await parsePackageFile(filePath);
      setPackageInfo(parsed);

      if (parsed.obbFiles.length > 0) {
        setStatus('copying_obb');
        setStatusText(`复制 OBB 文件 (${parsed.obbFiles.length} 个)...`);
        await copyObbFiles(parsed.obbFiles);
      }

      setStatus('installing');
      setStatusText('安装中...');

      await installPackage(parsed.apkFiles);

      setStatus('done');
      setStatusText('安装请求已发送');

      // Cleanup
      if (parsed.extractDir) {
        await cleanupExtractDir(parsed.extractDir);
      }

    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) {
        setStatus('idle');
        setStatusText('');
        return;
      }

      console.error(err);
      setStatus('error');
      setStatusText(`错误: ${err.message}`);
      Alert.alert('安装失败', err.message);
    }
  };

  const reset = () => {
    setStatus('idle');
    setStatusText('');
    setPackageInfo(null);
  };

  const renderPermissionStatus = () => {
    if (hasStoragePermission === null || hasInstallPermission === null) {
      return null;
    }

    const needsPermission = !hasStoragePermission || !hasInstallPermission;
    if (!needsPermission) return null;

    return (
      <View style={styles.permissionCard}>
        <Text style={styles.permissionTitle}>需要授权</Text>
        
        {!hasStoragePermission && (
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestStoragePermission}
          >
            <Text style={styles.permissionButtonText}>
              ⚠️ 授权文件访问权限
            </Text>
          </TouchableOpacity>
        )}
        
        {!hasInstallPermission && (
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestInstallPermission}
          >
            <Text style={styles.permissionButtonText}>
              ⚠️ 授权安装应用权限
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Split APK Installer</Text>
        <Text style={styles.subtitle}>支持 APK / XAPK / APKS / APKM</Text>
      </View>

      {renderPermissionStatus()}

      <View style={styles.card}>
        {status === 'idle' ? (
          <TouchableOpacity style={styles.button} onPress={selectAndInstall}>
            <Text style={styles.buttonText}>选择安装包</Text>
          </TouchableOpacity>
        ) : status === 'done' || status === 'error' ? (
          <TouchableOpacity
            style={[styles.button, status === 'error' && styles.errorButton]}
            onPress={reset}>
            <Text style={styles.buttonText}>
              {status === 'done' ? '✓ 完成' : '✗ 重试'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        )}
      </View>

      {packageInfo && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>安装包信息</Text>
          <Text style={styles.infoText}>类型: {packageInfo.type.toUpperCase()}</Text>
          {packageInfo.packageName && (
            <Text style={styles.infoText}>包名: {packageInfo.packageName}</Text>
          )}
          {packageInfo.versionName && (
            <Text style={styles.infoText}>版本: {packageInfo.versionName}</Text>
          )}
          <Text style={styles.infoText}>APK 数量: {packageInfo.apkFiles.length}</Text>
          {packageInfo.obbFiles.length > 0 && (
            <Text style={styles.infoText}>OBB 数量: {packageInfo.obbFiles.length}</Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          提示: 首次使用需要授权文件访问和安装权限
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  permissionCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#212529',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  errorButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default App;
