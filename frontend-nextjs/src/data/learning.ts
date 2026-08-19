import type { VexIqPartId } from '@/data/parts/vexIqParts';

export type CourseStatus = 'available' | 'coming-soon';

export interface LearningPath {
  id: string;
  order: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  lessonCount: number;
  status: CourseStatus;
  accent: string;
}

export interface LessonPart {
  id: string;
  libraryPartId: VexIqPartId;
  name: string;
  nameEn: string;
  count: number;
  note: string;
  noteEn: string;
}

export interface BuildStep {
  id: string;
  title: string;
  titleEn: string;
  instruction: string;
  instructionEn: string;
  check: string;
  checkEn: string;
  focus: '结构' | '传动' | '测试';
  image: {
    src: string;
    alt: string;
    altEn: string;
    addedPart: string;
    addedPartEn: string;
  };
}

export const learningPaths: LearningPath[] = [
  {
    id: 'build',
    order: 1,
    title: '零件与搭建',
    titleEn: 'Parts & Building',
    description: '从能转、能滚、能抓的有趣作品开始，认识零件和稳固结构。',
    descriptionEn: 'Meet robot parts and sturdy structures by building creations that spin, roll, and grab.',
    lessonCount: 6,
    status: 'available',
    accent: 'from-blue-500 to-cyan-400',
  },
  {
    id: 'mechanisms',
    order: 2,
    title: '机械结构',
    titleEn: 'Mechanisms',
    description: '用齿轮、杠杆、连杆和传送结构解决真实的小任务。',
    descriptionEn: 'Use gears, levers, linkages, and conveyors to solve hands-on challenges.',
    lessonCount: 6,
    status: 'coming-soon',
    accent: 'from-amber-500 to-orange-400',
  },
  {
    id: 'coding',
    order: 3,
    title: '编程与机器人',
    titleEn: 'Coding & Robots',
    description: '让机器人移动、判断、重复，并学会寻找和修复程序问题。',
    descriptionEn: 'Make robots move, decide, and repeat while learning how to find and fix code problems.',
    lessonCount: 6,
    status: 'coming-soon',
    accent: 'from-violet-500 to-fuchsia-400',
  },
];

export const gearRacerLesson = {
  id: 'gear-racer',
  title: '齿轮加速赛车',
  titleEn: 'Gear-Driven Racer',
  subtitle: '先造一辆跑得起来的小车，再找出让它更快的秘密。',
  subtitleEn: 'Build a racer that moves, then discover the secret that makes it faster.',
  duration: 40,
  ageRange: '8–12 岁',
  ageRangeEn: 'Ages 8–12',
  difficulty: '入门',
  hero: '/learn/gear-racer-hero.webp',
  outcomes: ['认识梁、轴、轴套和齿轮', '理解主动齿轮与从动齿轮', '比较速度与力量的取舍'],
  outcomesEn: ['Identify beams, shafts, collars, and gears', 'Understand driving and driven gears', 'Compare the trade-off between speed and torque'],
  parts: [
    { id: 'long-beam', libraryPartId: 'iq-beam-1x12', name: '长梁', nameEn: 'Long beam', count: 2, note: '作为车身左右两条主梁', noteEn: 'The two main rails of the chassis' },
    { id: 'cross-beam', libraryPartId: 'iq-beam-1x6', name: '短梁', nameEn: 'Short beam', count: 3, note: '连接并加固车架', noteEn: 'Connect and brace the chassis' },
    { id: 'wheel', libraryPartId: 'iq-wheel-160mm-smooth', name: '车轮', nameEn: 'Wheel', count: 4, note: '选择相同大小的车轮', noteEn: 'Choose four wheels of the same size' },
    { id: 'axle', libraryPartId: 'iq-shaft-6x', name: '轴', nameEn: 'Shaft', count: 3, note: '两根作为轮轴，一根作为电机驱动轴', noteEn: 'Two wheel axles and one motor drive shaft' },
    { id: 'collar', libraryPartId: 'iq-rubber-shaft-collar', name: '轴套', nameEn: 'Shaft collar', count: 6, note: '防止轴和齿轮左右滑动', noteEn: 'Keep shafts and gears from sliding sideways' },
    { id: 'gear-12', libraryPartId: 'iq-gear-12t', name: '12 齿齿轮', nameEn: '12-tooth gear', count: 1, note: '安装在车轮轴上', noteEn: 'Mount on the rear wheel axle' },
    { id: 'gear-36', libraryPartId: 'iq-gear-36t', name: '36 齿齿轮', nameEn: '36-tooth gear', count: 1, note: '作为主动齿轮', noteEn: 'Use as the driving gear' },
    { id: 'motor', libraryPartId: 'iq-smart-motor', name: '智能电机', nameEn: 'Smart Motor', count: 1, note: '第一轮测试前不要接通电源', noteEn: 'Keep power off until the first test' },
    { id: 'brain', libraryPartId: 'iq-robot-brain-gen2', name: 'Robot Brain', nameEn: 'Robot Brain', count: 1, note: '运行程序并通过 Smart Port 控制电机', noteEn: 'Runs the program and controls the motor through a Smart Port' },
    { id: 'battery', libraryPartId: 'iq-robot-battery-gen2', name: 'Robot Battery', nameEn: 'Robot Battery', count: 1, note: '充好电后插入 Brain，不直接连接电机', noteEn: 'Charge it and insert it into the Brain; never connect it directly to the motor' },
    { id: 'smart-cable', libraryPartId: 'iq-smart-cable', name: 'Smart Cable', nameEn: 'Smart Cable', count: 1, note: '连接电机与 Brain 的 1 号 Smart Port', noteEn: 'Connect the motor to Smart Port 1 on the Brain' },
    { id: 'pins', libraryPartId: 'iq-connector-pin-1x1', name: '连接销', nameEn: 'Connector pin', count: 12, note: '数量可根据梁的长度调整', noteEn: 'Quantity may vary with beam length' },
  ] satisfies LessonPart[],
  steps: [
    {
      id: 'frame',
      title: '搭出平行车架',
      titleEn: 'Build a parallel chassis',
      instruction: '把两条长梁平行摆放，用前、中、后三条短梁连接。先只压紧四角，再补上中间的连接销。',
      instructionEn: 'Place the two long beams parallel. Connect them with short beams at the front, middle, and rear. Secure the four corners first, then add the remaining pins.',
      check: '从上方观察：左右主梁应当平行，车架放在桌面上不会翘起。',
      checkEn: 'Look from above: the two rails should be parallel, and the chassis should sit flat without rocking.',
      focus: '结构',
      image: {
        src: '/learn/gear-racer-steps/step-01-frame.webp',
        alt: '使用灰色 VEX IQ 长梁、短梁和蓝色连接销搭好的平行车架',
        altEn: 'A parallel VEX IQ chassis built with gray long beams, short beams, and blue connector pins',
        addedPart: '长梁、短梁和连接销',
        addedPartEn: 'long beams, short beams, and connector pins',
      },
    },
    {
      id: 'front-axle',
      title: '安装前轮轴',
      titleEn: 'Install the front axle',
      instruction: '让轴同时穿过左右主梁对应的孔，在梁外侧装上轴套，保留刚好可以自由转动的间隙。',
      instructionEn: 'Slide the shaft through matching holes in both rails. Add collars outside the rails, leaving just enough clearance for the shaft to spin freely.',
      check: '用手拨动轴，它能连续转动，而且不会明显左右移动。',
      checkEn: 'Spin the axle by hand. It should rotate freely without noticeable side-to-side movement.',
      focus: '结构',
      image: {
        src: '/learn/gear-racer-steps/step-02-front-axle.webp',
        alt: '在 VEX IQ 平行车架前部穿入一根银色方轴',
        altEn: 'A silver square front axle inserted through the parallel VEX IQ chassis',
        addedPart: '前轮轴和轴套',
        addedPartEn: 'front axle and shaft collars',
      },
    },
    {
      id: 'rear-axle',
      title: '安装后轮轴',
      titleEn: 'Install the rear axle',
      instruction: '在车架后部用相同方法穿入第二根轴。先把 12 齿齿轮固定在轴的中间位置。',
      instructionEn: 'Insert the second axle through the rear of the chassis. Secure the 12-tooth gear near the middle of this axle.',
      check: '前后两根轴互相平行；转动后轴时，12 齿齿轮不会在轴上打滑。',
      checkEn: 'The two axles are parallel, and the 12-tooth gear does not slip when you turn the rear axle.',
      focus: '传动',
      image: {
        src: '/learn/gear-racer-steps/step-03-rear-axle.webp',
        alt: 'VEX IQ 车架上增加后轮轴和一个小号蓝色 12 齿齿轮',
        altEn: 'A rear axle and small blue 12-tooth gear added to the VEX IQ chassis',
        addedPart: '后轮轴和 12 齿齿轮',
        addedPartEn: 'rear axle and 12-tooth gear',
      },
    },
    {
      id: 'motor',
      title: '装驱动轴并固定电机',
      titleEn: 'Add the drive shaft and mount the motor',
      instruction: '把第三根方轴完全插入电机的方形输出孔，再把电机牢固连接在后轮轴旁边。电机驱动轴要和后轮轴平行，两根轴必须彼此分开。',
      instructionEn: 'Push the third square shaft fully into the motor output socket, then mount the motor firmly beside the rear axle. The motor shaft and rear axle must be separate and parallel.',
      check: '轻轻晃动车架时电机不会移动；驱动轴只进入电机输出孔，不穿过电机外壳，也不与后轮轴重合。',
      checkEn: 'The motor does not move when the chassis is gently shaken. The drive shaft enters only the output socket and does not overlap the rear axle.',
      focus: '结构',
      image: {
        src: '/learn/gear-racer-steps/step-04-motor-v2.webp',
        alt: 'VEX IQ 车架上分开安装后轮轴与智能电机驱动轴，12 齿齿轮套在后轮轴上',
        altEn: 'A VEX IQ chassis with separate rear and motor drive shafts, with the 12-tooth gear on the rear axle',
        addedPart: '电机和独立的电机驱动轴',
        addedPartEn: 'motor and separate motor drive shaft',
      },
    },
    {
      id: 'gear',
      title: '让两个齿轮正确咬合',
      titleEn: 'Mesh the two gears correctly',
      instruction: '把 36 齿齿轮的方孔套到电机驱动轴上，再调整位置，让它和后轮轴上的 12 齿齿轮咬合。每个齿轮都只能套在自己的轴上。',
      instructionEn: 'Slide the square center of the 36-tooth gear onto the motor drive shaft. Adjust it to mesh with the 12-tooth gear on the rear axle. Each gear stays on its own shaft.',
      check: '两根轴平行、两个齿轮位于同一平面。手动转动大齿轮时小齿轮会一起转，而且没有齿轮擦到电机外壳。',
      checkEn: 'The shafts are parallel and both gears share one plane. Turning the large gear moves the small gear without either gear rubbing the motor housing.',
      focus: '传动',
      image: {
        src: '/learn/gear-racer-steps/step-05-gears-v2.webp',
        alt: 'VEX IQ 36 齿齿轮套在电机驱动轴上，与后轮轴上的 12 齿齿轮咬合',
        altEn: 'A VEX IQ 36-tooth gear on the motor shaft meshing with a 12-tooth gear on the rear axle',
        addedPart: '36 齿主动齿轮',
        addedPartEn: '36-tooth driving gear',
      },
    },
    {
      id: 'wheels',
      title: '装上四个车轮',
      titleEn: 'Install all four wheels',
      instruction: '在两根轴的左右两端装上车轮和轴套。轴套要挡住车轮，但不要挤压车轮。',
      instructionEn: 'Add wheels and collars to both ends of the two axles. The collars should retain the wheels without squeezing them.',
      check: '四个车轮方向一致，离开桌面后都可以被手轻松转动。',
      checkEn: 'All four wheels face the same way and spin easily when lifted off the table.',
      focus: '结构',
      image: {
        src: '/learn/gear-racer-steps/step-06-wheels-v2.webp',
        alt: 'VEX IQ 齿轮赛车的两根轴上装好四个相同尺寸的车轮',
        altEn: 'Four matching wheels installed on the two axles of the VEX IQ gear racer',
        addedPart: '四个车轮和轴套',
        addedPartEn: 'four wheels and shaft collars',
      },
    },
    {
      id: 'roll-test',
      title: '安装 Brain、电池和 Smart Cable',
      titleEn: 'Install the Brain, battery, and Smart Cable',
      instruction: '保持 Brain 关机。把充好电的 Robot Battery 完全插入 Brain，再将 Brain 固定在车架前部。用一根 Smart Cable 把电机连接到 Brain 的 1 号 Smart Port。',
      instructionEn: 'Keep the Brain off. Insert a charged Robot Battery fully into the Brain, mount the Brain at the front of the chassis, and connect the motor to Smart Port 1 with one Smart Cable.',
      check: '电池卡入 Brain；连接线两端都插紧，并且远离齿轮和车轮。电池没有直接连接到电机。',
      checkEn: 'The battery clicks into the Brain. Both cable ends are secure and clear of gears and wheels. The battery is not connected directly to the motor.',
      focus: '结构',
      image: {
        src: '/learn/gear-racer-steps/step-07-control-system-v2.webp',
        alt: 'VEX IQ 齿轮赛车安装 Robot Brain 和电池，Smart Cable 从电机连接到 Brain',
        altEn: 'A VEX IQ gear racer with a Robot Brain and battery, with a Smart Cable connecting the motor to the Brain',
        addedPart: 'Brain、电池和 Smart Cable',
        addedPartEn: 'Brain, battery, and Smart Cable',
      },
    },
    {
      id: 'powered-test',
      title: '抬起车轮再启动',
      titleEn: 'Lift the wheels before starting',
      instruction: '在 VEXcode IQ 中把 1 号端口电机设为 20% 速度，让它正转 1 圈后停止，并把程序下载到 Brain。抬起车轮，在成人或老师确认后启动程序。',
      instructionEn: 'In VEXcode IQ, set the motor on Port 1 to 20% speed and spin it forward for one turn, then download the project to the Brain. Lift the wheels and run it with adult approval.',
      check: '电机转完 1 圈会自动停止；齿轮没有跳齿或异常噪声，Smart Cable 和所有轴套仍在原位。',
      checkEn: 'The motor stops after one turn. The gears do not skip or make unusual noise, and the Smart Cable and collars remain in place.',
      focus: '测试',
      image: {
        src: '/learn/gear-racer-steps/step-08-powered-test-v2.webp',
        alt: '安装 Brain、电池和 Smart Cable 的完整 VEX IQ 齿轮赛车进行低速通电测试',
        altEn: 'A complete VEX IQ gear racer with Brain, battery, and Smart Cable during a low-speed powered test',
        addedPart: '运行 20% 速度测试程序',
        addedPartEn: 'run the 20% speed test program',
      },
    },
  ] satisfies BuildStep[],
};
