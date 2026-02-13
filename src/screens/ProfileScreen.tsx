import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  NativeModules,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import {
  parsePackageFile,
  copyObbFiles,
  cleanupExtractDir,
  ParsedPackage,
} from '../utils/fileParser';
import {installPackage} from '../utils/installer';

const {PermissionModule} = NativeModules;

interface MenuItem {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string;
}

export function ProfileScreen() {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState('');

  const checkAndRequestPermissions = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const storageGranted = await PermissionModule.hasManageStoragePermission();
      const installGranted = await PermissionModule.canInstallPackages();

      if (!storageGranted) {
        Alert.alert(
          '需要存储权限',
          '请在设置中允许"所有文件访问"权限',
          [
            {text: '取消', style: 'cancel'},
            {
              text: '去设置',
              onPress: () => PermissionModule.requestManageStoragePermission(),
            },
          ]
        );
        return false;
      }

      if (!installGranted) {
        Alert.alert(
          '需要安装权限',
          '请在设置中允许"安装未知应用"权限',
          [
            {text: '取消', style: 'cancel'},
            {
              text: '去设置',
              onPress: () => PermissionModule.requestInstallPermission(),
            },
          ]
        );
        return false;
      }

      return true;
    } catch (err) {
      console.warn(err);
      return true;
    }
  };

  const handleInstallApk = async () => {
    const hasPermission = await checkAndRequestPermissions();
    if (!hasPermission) return;

    try {
      setIsInstalling(true);
      setInstallStatus('选择文件...');

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
        setIsInstalling(false);
        return;
      }

      let filePath = file.uri;
      if (filePath.startsWith('content://')) {
        setInstallStatus('复制文件...');
        const destPath = `${RNFS.CachesDirectoryPath}/${file.name}`;
        await RNFS.copyFile(filePath, destPath);
        filePath = destPath;
      }

      setInstallStatus('解析安装包...');
      const parsed = await parsePackageFile(filePath);

      if (parsed.obbFiles.length > 0) {
        setInstallStatus(`复制 OBB 文件...`);
        await copyObbFiles(parsed.obbFiles);
      }

      setInstallStatus('安装中...');
      await installPackage(parsed.apkFiles);

      if (parsed.extractDir) {
        await cleanupExtractDir(parsed.extractDir);
      }

      setInstallStatus('');
      setIsInstalling(false);
      Alert.alert('成功', '安装请求已发送');

    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) {
        setIsInstalling(false);
        setInstallStatus('');
        return;
      }
      console.error(err);
      setIsInstalling(false);
      setInstallStatus('');
      Alert.alert('安装失败', err.message);
    }
  };

  const menuItems: MenuItem[] = [
    {
      icon: '📦',
      title: '本地安装器',
      subtitle: '安装 APK/XAPK/APKS 文件',
      onPress: handleInstallApk,
    },
    {
      icon: '📥',
      title: '下载管理',
      subtitle: '查看下载任务',
      onPress: () => Alert.alert('提示', '功能开发中...'),
    },
    {
      icon: '⭐',
      title: '我的收藏',
      subtitle: '收藏的游戏',
      onPress: () => Alert.alert('提示', '功能开发中...'),
    },
    {
      icon: '🕐',
      title: '浏览历史',
      subtitle: '最近浏览的游戏',
      onPress: () => Alert.alert('提示', '功能开发中...'),
    },
  ];

  const settingsItems: MenuItem[] = [
    {
      icon: '⚙️',
      title: '设置',
      onPress: () => Alert.alert('提示', '功能开发中...'),
    },
    {
      icon: '📋',
      title: '关于',
      subtitle: 'v2.0.0',
      onPress: () => Alert.alert('ApksCC', '游戏资源盒子 v2.0.0\n\n支持 APK/XAPK/APKS/APKM 安装'),
    },
  ];

  const renderMenuItem = (item: MenuItem, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.menuItem}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuIcon}>{item.icon}</Text>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* 用户信息区域 */}
      <View style={styles.userSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>游客用户</Text>
          <Text style={styles.userDesc}>点击登录享受更多功能</Text>
        </View>
      </View>

      {/* 安装中状态 */}
      {isInstalling && (
        <View style={styles.installingCard}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.installingText}>{installStatus}</Text>
        </View>
      )}

      {/* 功能菜单 */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>我的功能</Text>
        <View style={styles.menuCard}>
          {menuItems.map(renderMenuItem)}
        </View>
      </View>

      {/* 设置菜单 */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>其他</Text>
        <View style={styles.menuCard}>
          {settingsItems.map(renderMenuItem)}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>ApksCC - 游戏资源盒子</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
  },
  userInfo: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  userDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  installingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  installingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#3B82F6',
  },
  menuSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    fontSize: 24,
    width: 40,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    color: '#1F2937',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 24,
    color: '#D1D5DB',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
