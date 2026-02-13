import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {Game} from '../data/mockData';

interface Props {
  game: Game;
  onPress?: () => void;
}

export function GameCard({game, onPress}: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Image source={{uri: game.cover}} style={styles.cover} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{game.name}</Text>
        <Text style={styles.description} numberOfLines={1}>{game.description}</Text>
        <View style={styles.meta}>
          <Text style={styles.size}>{game.size}</Text>
          <View style={styles.rating}>
            <Text style={styles.star}>⭐</Text>
            <Text style={styles.ratingText}>{game.rating}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.downloadBtn}>
        <Text style={styles.downloadText}>下载</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  description: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  size: {
    fontSize: 12,
    color: '#6B7280',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  star: {
    fontSize: 10,
  },
  ratingText: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 2,
  },
  downloadBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  downloadText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
