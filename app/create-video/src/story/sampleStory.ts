import { StoryVideoData } from './types';

/**
 * Agent 的标准输出示例。
 * Agent 返回的 JSON 应保存到独立任务目录，不写入代码目录。
 */
export const SAMPLE_STORY: StoryVideoData = {
  id: 'the-last-lamp',
  title: '巷口最后一盏灯',
  topic: '一个普通人，在低谷里重新找回生活的故事',
  style: '电影感、克制、温暖、现实主义',
  author: '故事短视频助手',
  character: {
    id: 'young-programmer-dad',
    name: '林默',
    description: 'a 30-year-old Chinese man, calm and slightly tired, an ordinary office worker and new father',
    visualTraits: 'short black hair, oval face, warm brown eyes, slim build, subtle tired expression, realistic East Asian features',
    wardrobe: 'dark navy hoodie, white T-shirt, black casual trousers, simple canvas shoes',
  },
  scenes: [
    {
      id: 'opening',
      title: '开场：灯还亮着',
      narration: '那天晚上，我加班到十一点，整条街都熄了灯，只有巷口那一盏还亮着。',
      subtitle: '有些灯，不是为了照亮路。',
      imagePrompt: '深夜的老城区巷口，一盏暖黄色路灯，湿润的石板路，远处一个疲惫的年轻人背影，电影感，竖屏构图，无文字',
      durationInSeconds: 6,
    },
    {
      id: 'memory',
      title: '回忆：父亲的习惯',
      narration: '我突然想起父亲说过，灯亮着，晚回家的人就知道有人等他。',
      subtitle: '灯亮着，就有人在等你。',
      imagePrompt: '温暖的旧屋室内，父亲坐在窗边等待晚归的孩子，桌上一盏台灯，生活化，怀旧电影色调，竖屏，无文字',
      durationInSeconds: 7,
    },
    {
      id: 'turning-point',
      title: '转折：停下来',
      narration: '我第一次没有急着回家，而是在那盏灯下坐了很久。手机没有电，城市也没有答案。',
      subtitle: '人有时候，不需要答案，只需要停一会儿。',
      imagePrompt: '年轻人独自坐在巷口路灯下，手边放着关机的手机，雨后夜色，安静孤独但不绝望，电影剧照，竖屏，无文字',
      durationInSeconds: 8,
    },
    {
      id: 'ending',
      title: '结尾：回家',
      narration: '后来我才明白，真正把我带回家的，不是那盏灯，是我终于愿意照顾一下自己。',
      subtitle: '愿你走再远，也记得给自己留一盏灯。',
      imagePrompt: '清晨的城市小巷，年轻人走向有暖光的家门，天空刚刚泛白，治愈温暖，电影感竖屏构图，无文字',
      durationInSeconds: 9,
    },
  ],
};
