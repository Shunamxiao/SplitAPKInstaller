import React, {useState} from 'react';
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

type InstallStatus = 'idle' | 'selecting' | 'parsing' | 'copying_obb' | 'installing' | 'done' | 'error';

function App(): React.JSX.Element {
  const [status, setStatus] = useState<InstallStatus>('idle');
  const [statusText, setStatusText] = useState('');
  const [packageInfo, setPackageInfo] = useState<ParsedPackage | null>(null);

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);

      return (
        granted['android.permission.READ_EXTERNAL_STORAGE'] === 'granted' &&
        granted['android.permission.WRITE_EXTERNAL_STORAGE'] === 'granted'
      );
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const selectAndInstall = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('权限错误', '需要存储权限才能安装应用');
        return;
      }

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Split APK Installer</Text>
        <Text style={styles.subtitle}>支持 APK / XAPK / APKS / APKM</Text>
      </View>

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
          提示: 安装时系统会弹出确认对话框
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
