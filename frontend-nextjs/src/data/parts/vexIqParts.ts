export type VexIqPartCategory = '结构件' | '运动件' | '传动件' | '连接件' | '电子件';

export type VexIqPartId =
  | 'iq-beam-1x12'
  | 'iq-beam-1x6'
  | 'iq-wheel-160mm-smooth'
  | 'iq-shaft-6x'
  | 'iq-rubber-shaft-collar'
  | 'iq-gear-12t'
  | 'iq-gear-36t'
  | 'iq-smart-motor'
  | 'iq-robot-brain-gen2'
  | 'iq-robot-battery-gen2'
  | 'iq-smart-cable'
  | 'iq-connector-pin-1x1'
  | 'iq-pitch-rope-24x'
  | 'iq-wide-spool-1x'
  | 'iq-crank-arm-23t'
  | 'iq-double-corner-connector';

export interface VexIqPart {
  id: VexIqPartId;
  name: string;
  nameEn: string;
  category: VexIqPartCategory;
  aliases: string[];
  aliasesEn: string[];
  image: {
    src: string;
    alt: string;
    kind: 'photo' | 'render';
  };
  identificationTip: string;
  identificationTipEn: string;
  source: {
    title: string;
    articleUrl: string;
    assetUrl: string;
  };
}

const shaftsArticle = 'https://kb.vex.com/hc/en-us/articles/360035955151-Selecting-Capturing-and-Supporting-VEX-IQ-Shafts';

export const vexIqParts: VexIqPart[] = [
  {
    id: 'iq-beam-1x12',
    name: '1×12 长梁',
    nameEn: '1x12 Beam',
    category: '结构件',
    aliases: ['长梁', '12孔梁'],
    aliasesEn: ['long beam', '12-hole beam'],
    image: { src: '/parts/vex-iq/beam-1x12-photo.webp', alt: 'VEX IQ 1×12 长梁实物照片', kind: 'photo' },
    identificationTip: '沿着长边数一数：一排有 12 个连接孔。',
    identificationTipEn: 'Count along the long edge: one row has 12 connector holes.',
    source: { title: 'VEX IQ 1x Beam Base Pack', articleUrl: 'https://www.vexrobotics.com/228-9059.html', assetUrl: 'https://www.vexrobotics.com.mx/vexiq/imagenes/productos/228-3503-rev3.jpg' },
  },
  {
    id: 'iq-beam-1x6',
    name: '1×6 短梁',
    nameEn: '1x6 Beam',
    category: '结构件',
    aliases: ['短梁', '6孔梁'],
    aliasesEn: ['short beam', '6-hole beam'],
    image: { src: '/parts/vex-iq/beam-1x6-photo.webp', alt: 'VEX IQ 1×6 短梁实物照片', kind: 'photo' },
    identificationTip: '一排有 6 个连接孔，长度约为 1×12 梁的一半。',
    identificationTipEn: 'One row has 6 holes, about half the length of a 1×12 beam.',
    source: { title: 'VEX IQ 1x Beam Base Pack', articleUrl: 'https://www.vexrobotics.com/228-9059.html', assetUrl: 'https://www.vexrobotics.com.mx/vexiq/imagenes/productos/228-3503-rev3.jpg' },
  },
  {
    id: 'iq-wheel-160mm-smooth',
    name: '160mm 平滑轮',
    nameEn: '160mm Travel Smooth Wheel',
    category: '运动件',
    aliases: ['车轮', '平滑轮'],
    aliasesEn: ['wheel', 'smooth wheel'],
    image: { src: '/parts/vex-iq/wheel-160mm-smooth.png', alt: 'VEX IQ 160mm 平滑轮官方三维外观图', kind: 'render' },
    identificationTip: '黑色轮胎和白色轮毂连成一体，四个车轮要选相同尺寸。',
    identificationTipEn: 'The black tire and white hub form one wheel; choose four wheels of the same size.',
    source: {
      title: 'Understanding VEX IQ Wheels',
      articleUrl: 'https://kb.vex.com/hc/en-us/articles/360035955171-Understanding-VEX-IQ-Wheels',
      assetUrl: 'https://kb.vex.com/hc/article_attachments/10178529095956',
    },
  },
  {
    id: 'iq-shaft-6x',
    name: '6× 轴',
    nameEn: '6x Pitch Shaft',
    category: '运动件',
    aliases: ['轴', '车轴'],
    aliasesEn: ['shaft', 'axle'],
    image: { src: '/parts/vex-iq/shaft-6x-photo.webp', alt: 'VEX IQ 钢轴实物照片', kind: 'photo' },
    identificationTip: '轴是银色方杆；把不同长度并排后选择 6× 长度。',
    identificationTipEn: 'Shafts are silver square rods. Compare lengths side by side and choose the 6× shaft.',
    source: { title: 'VEX IQ Drive Shaft Pack', articleUrl: shaftsArticle, assetUrl: 'https://www.vexrobotics.com.mx/vexiq/imagenes/productos/228-3506_4.jpg' },
  },
  {
    id: 'iq-rubber-shaft-collar',
    name: '橡胶轴套',
    nameEn: 'Rubber Shaft Collar',
    category: '连接件',
    aliases: ['轴套', '轴环'],
    aliasesEn: ['shaft collar', 'rubber collar'],
    image: { src: '/parts/vex-iq/shaft-collar-photo.webp', alt: 'VEX IQ 橡胶轴套实物照片', kind: 'photo' },
    identificationTip: '黑色小圆环，中间是能紧贴方轴的星形孔。',
    identificationTipEn: 'A small black ring with a star-shaped center that grips a square shaft.',
    source: { title: 'Rubber Shaft Collar (30-Pack)', articleUrl: 'https://www.vexrobotics.com/228-3510.html', assetUrl: 'https://tienda.vexrobotics.com.mx/data/images/products/1591999153-228-3510.jpg' },
  },
  {
    id: 'iq-gear-12t',
    name: '12 齿齿轮',
    nameEn: '12 Tooth Gear',
    category: '传动件',
    aliases: ['12T 齿轮', '小齿轮'],
    aliasesEn: ['12T gear', 'small gear'],
    image: { src: '/parts/vex-iq/gear-12t-photo.webp', alt: 'VEX IQ 12 齿齿轮实物照片', kind: 'photo' },
    identificationTip: '这是套装中直径最小的蓝色齿轮，外圈有 12 个齿。',
    identificationTipEn: 'The smallest blue gear in the kit, with 12 teeth around its edge.',
    source: { title: 'VEX IQ Gear Base Pack', articleUrl: 'https://www.vexrobotics.com/iq-gear.html', assetUrl: 'https://kb.vex.com/hc/article_attachments/360049025451' },
  },
  {
    id: 'iq-gear-36t',
    name: '36 齿齿轮',
    nameEn: '36 Tooth Gear',
    category: '传动件',
    aliases: ['36T 齿轮', '大齿轮'],
    aliasesEn: ['36T gear', 'large gear'],
    image: { src: '/parts/vex-iq/gear-36t-photo.webp', alt: 'VEX IQ 36 齿齿轮实物照片', kind: 'photo' },
    identificationTip: '比 12 齿齿轮明显更大，正面有一圈均匀的连接孔。',
    identificationTipEn: 'Clearly larger than the 12-tooth gear, with an even ring of holes on its face.',
    source: { title: 'VEX IQ Gear Base Pack', articleUrl: 'https://www.vexrobotics.com/iq-gear.html', assetUrl: 'https://kb.vex.com/hc/article_attachments/360049025451' },
  },
  {
    id: 'iq-smart-motor',
    name: 'IQ 智能电机',
    nameEn: 'IQ Smart Motor',
    category: '电子件',
    aliases: ['智能电机', '马达'],
    aliasesEn: ['Smart Motor', 'motor'],
    image: { src: '/parts/vex-iq/smart-motor.png', alt: 'VEX IQ 智能电机官方三维外观图', kind: 'render' },
    identificationTip: '灰色长方体，顶部有方形输出孔，侧面有智能线接口。',
    identificationTipEn: 'A gray rectangular unit with a square output socket and a Smart Cable port.',
    source: {
      title: 'Understanding and Mounting the IQ Smart Motor',
      articleUrl: 'https://kb.vex.com/hc/en-us/articles/18130095316884-Understanding-and-Mounting-the-IQ-Smart-Motor',
      assetUrl: 'https://kb.vex.com/hc/article_attachments/18130185881876',
    },
  },
  {
    id: 'iq-robot-brain-gen2',
    name: 'IQ Robot Brain（二代）',
    nameEn: 'IQ Robot Brain (2nd generation)',
    category: '电子件',
    aliases: ['主控', '机器人主脑', 'Brain'],
    aliasesEn: ['Brain', 'robot controller'],
    image: { src: '/parts/vex-iq/robot-brain-gen2.svg', alt: 'VEX IQ Robot Brain 二代官方零件图', kind: 'render' },
    identificationTip: '正面有彩色屏幕和四个按键，两侧共有 12 个带编号的 Smart Port。',
    identificationTipEn: 'It has a color screen, four buttons, and 12 numbered Smart Ports along its sides.',
    source: {
      title: 'IQ Robot Brain (2nd gen)',
      articleUrl: 'https://www.vexrobotics.com/228-6480.html',
      assetUrl: 'https://content.vexrobotics.com/resources/parts-posters/iqgen2/education-kit/electronics-robot-brain.svg?ver=1635529898064',
    },
  },
  {
    id: 'iq-robot-battery-gen2',
    name: 'IQ Robot Battery（二代）',
    nameEn: 'IQ Robot Battery (2nd generation)',
    category: '电子件',
    aliases: ['机器人电池', 'Brain 电池', 'Battery'],
    aliasesEn: ['Robot Battery', 'Brain battery'],
    image: { src: '/parts/vex-iq/robot-battery-gen2.svg', alt: 'VEX IQ Robot Battery 二代官方零件图', kind: 'render' },
    identificationTip: '深灰色长方体，一端有电量指示灯和卡扣；它需要插入 Brain 才能为机器人供电。',
    identificationTipEn: 'A dark gray pack with indicator lights and a latch; it powers the robot when inserted into the Brain.',
    source: {
      title: 'Installing or Removing the VEX IQ Brain Battery',
      articleUrl: 'https://kb.vex.com/hc/en-us/articles/360035951991-Installation-and-Removal-Battery-VEX-IQ',
      assetUrl: 'https://content.vexrobotics.com/resources/parts-posters/iqgen2/education-kit/electronics-robot-battery.svg?ver=1635529898064',
    },
  },
  {
    id: 'iq-smart-cable',
    name: 'IQ Smart Cable',
    nameEn: 'IQ Smart Cable',
    category: '电子件',
    aliases: ['智能线', '电机连接线', 'Smart Cable'],
    aliasesEn: ['Smart Cable', 'motor cable'],
    image: { src: '/parts/vex-iq/smart-cable.svg', alt: 'VEX IQ Smart Cable 官方零件图', kind: 'render' },
    identificationTip: '黑色扁线两端各有一个灰色插头，用来连接 Brain 与智能电机或传感器。',
    identificationTipEn: 'A flat black cable with gray plugs at both ends, used between the Brain and a motor or sensor.',
    source: {
      title: 'VEX IQ Smart Cables',
      articleUrl: 'https://www.vexrobotics.com/iq-smart-cables.html',
      assetUrl: 'https://content.vexrobotics.com/resources/parts-posters/iqgen2/education-kit/electronics-smart-cables.svg?ver=1635529898064',
    },
  },
  {
    id: 'iq-connector-pin-1x1',
    name: '1×1 连接销',
    nameEn: '1x1 Connector Pin',
    category: '连接件',
    aliases: ['连接销', '蓝销'],
    aliasesEn: ['connector pin', 'blue pin'],
    image: { src: '/parts/vex-iq/connector-pin-1x1-photo.webp', alt: 'VEX IQ 蓝色连接销实物照片', kind: 'photo' },
    identificationTip: '选择最短的蓝色连接销；中间有挡圈，两端都有弹性卡脚。',
    identificationTipEn: 'Choose the shortest blue pin, with a center flange and flexible tabs at both ends.',
    source: {
      title: 'Understanding VEX IQ Pins, Connectors, and Standoffs',
      articleUrl: 'https://kb.vex.com/hc/en-us/articles/360035955131-Understanding-VEX-IQ-Pins-Connectors-and-Standoffs',
      assetUrl: 'https://www.vexrobotics.com.mx/vexiq/imagenes/productos/228-3058-rev2.jpg',
    },
  },
  {
    id: 'iq-pitch-rope-24x',
    name: '24× 节距绳索',
    nameEn: '24x Pitch Rope',
    category: '传动件',
    aliases: ['绳索', '起重绳'],
    aliasesEn: ['rope', 'lifting rope'],
    image: { src: '/parts/vex-iq/pitch-rope-24x.svg', alt: 'VEX IQ 24× 节距绳索官方零件图', kind: 'render' },
    identificationTip: '一段带固定结头的黑色绳索；本课使用前先检查绳索没有打结或磨损。',
    identificationTipEn: 'A black rope with attachment ends. Check that it is untangled and undamaged before use.',
    source: {
      title: 'VEX IQ Education Kit Contents',
      articleUrl: 'https://www.vexrobotics.com/parts/228-7755',
      assetUrl: 'https://content.vexrobotics.com/resources/parts-posters/iqgen2/education-kit/specialty-parts-24x-pitch-rope.svg?ver=1635529898064',
    },
  },
  {
    id: 'iq-wide-spool-1x',
    name: '1× 宽卷筒',
    nameEn: '1x Wide Spool',
    category: '传动件',
    aliases: ['卷筒', '绕线轮'],
    aliasesEn: ['spool', 'winch drum'],
    image: { src: '/parts/vex-iq/wide-spool-1x.svg', alt: 'VEX IQ 1× 宽卷筒官方零件图', kind: 'render' },
    identificationTip: '像一个中间较窄的小线轴，中心的方孔可以套在方轴上。',
    identificationTipEn: 'It looks like a small thread spool with a narrow center and a square shaft hole.',
    source: {
      title: 'VEX IQ Education Kit Contents',
      articleUrl: 'https://www.vexrobotics.com/parts/228-7755',
      assetUrl: 'https://content.vexrobotics.com/resources/parts-posters/iqgen2/education-kit/specialty-parts-1x-wide-spool.svg?ver=1635529898064',
    },
  },
  {
    id: 'iq-crank-arm-23t',
    name: '1×4 手摇臂（带 23 齿齿轮）',
    nameEn: '1x4 Crank Arm with 23 Tooth Gear',
    category: '传动件',
    aliases: ['手摇臂', '曲柄'],
    aliasesEn: ['crank arm', 'handle'],
    image: { src: '/parts/vex-iq/crank-arm-23t.svg', alt: 'VEX IQ 1×4 手摇臂官方零件图', kind: 'render' },
    identificationTip: '一端是带方孔的 23 齿圆盘，长臂上有多个孔，可选择不同位置做把手。',
    identificationTipEn: 'One end has a 23-tooth disk with a square hole; the long arm offers several handle positions.',
    source: {
      title: 'VEX IQ Education Kit Contents',
      articleUrl: 'https://www.vexrobotics.com/parts/228-7755',
      assetUrl: 'https://content.vexrobotics.com/resources/parts-posters/iqgen2/education-kit/specialty-parts-1x4-crank-arm-with-23-tooth-gear.svg?ver=1635529898064',
    },
  },
  {
    id: 'iq-double-corner-connector',
    name: '双角连接件',
    nameEn: 'Double Corner Connector',
    category: '连接件',
    aliases: ['角连接件', '直角连接件'],
    aliasesEn: ['corner connector', 'right-angle connector'],
    image: { src: '/parts/vex-iq/double-corner-connector.svg', alt: 'VEX IQ 双角与三角连接件官方零件图', kind: 'render' },
    identificationTip: '蓝色连接件的连接面互成直角，用来把底座和立柱保持在 90°。',
    identificationTipEn: 'Its blue connection faces meet at right angles, keeping the base and tower at 90 degrees.',
    source: {
      title: 'VEX IQ Education Kit Contents',
      articleUrl: 'https://www.vexrobotics.com/parts/228-7755',
      assetUrl: 'https://content.vexrobotics.com/resources/parts-posters/iqgen2/education-kit/connectors-double-triple-corner-connectors.svg?ver=1635529898064',
    },
  },
];

const vexIqPartMap = new Map(vexIqParts.map(part => [part.id, part]));

export function getVexIqPart(id: VexIqPartId): VexIqPart {
  const part = vexIqPartMap.get(id);
  if (!part) throw new Error(`Unknown VEX IQ part: ${id}`);
  return part;
}
