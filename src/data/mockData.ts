// 模拟游戏数据
export interface Game {
  id: string;
  name: string;
  cover: string;
  size: string;
  category: string;
  rating: number;
  downloads: string;
  description: string;
}

export interface Banner {
  id: string;
  image: string;
  title: string;
  link?: string;
}

export const banners: Banner[] = [
  {
    id: '1',
    image: 'https://picsum.photos/800/400?random=1',
    title: '热门游戏推荐',
  },
  {
    id: '2',
    image: 'https://picsum.photos/800/400?random=2',
    title: '新游上线',
  },
  {
    id: '3',
    image: 'https://picsum.photos/800/400?random=3',
    title: '限时活动',
  },
];

export const categories = ['全部', '热门', '新游', '破解', '汉化'];

export const games: Game[] = [
  {
    id: '1',
    name: '原神',
    cover: 'https://picsum.photos/200/200?random=10',
    size: '15.2 GB',
    category: '热门',
    rating: 4.8,
    downloads: '1000万+',
    description: '开放世界冒险游戏',
  },
  {
    id: '2',
    name: '王者荣耀',
    cover: 'https://picsum.photos/200/200?random=11',
    size: '3.8 GB',
    category: '热门',
    rating: 4.5,
    downloads: '5000万+',
    description: 'MOBA竞技手游',
  },
  {
    id: '3',
    name: '和平精英',
    cover: 'https://picsum.photos/200/200?random=12',
    size: '4.2 GB',
    category: '热门',
    rating: 4.3,
    downloads: '3000万+',
    description: '战术竞技手游',
  },
  {
    id: '4',
    name: '崩坏：星穹铁道',
    cover: 'https://picsum.photos/200/200?random=13',
    size: '12.5 GB',
    category: '新游',
    rating: 4.9,
    downloads: '500万+',
    description: '回合制RPG',
  },
  {
    id: '5',
    name: '明日方舟',
    cover: 'https://picsum.photos/200/200?random=14',
    size: '2.1 GB',
    category: '热门',
    rating: 4.7,
    downloads: '800万+',
    description: '塔防策略游戏',
  },
  {
    id: '6',
    name: 'GTA5 汉化版',
    cover: 'https://picsum.photos/200/200?random=15',
    size: '8.5 GB',
    category: '汉化',
    rating: 4.6,
    downloads: '200万+',
    description: '开放世界动作冒险',
  },
  {
    id: '7',
    name: '我的世界 破解版',
    cover: 'https://picsum.photos/200/200?random=16',
    size: '1.2 GB',
    category: '破解',
    rating: 4.4,
    downloads: '1500万+',
    description: '沙盒建造游戏',
  },
  {
    id: '8',
    name: '绝区零',
    cover: 'https://picsum.photos/200/200?random=17',
    size: '18.0 GB',
    category: '新游',
    rating: 4.8,
    downloads: '300万+',
    description: '都市幻想动作游戏',
  },
];
