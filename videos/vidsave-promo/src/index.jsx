import React from 'react';
import {AbsoluteFill, Composition, Folder, Series, staticFile, useVideoConfig, registerRoot} from 'remotion';
import {Audio} from '@remotion/media';
import {Opening} from './Opening';
import {Paste} from './Paste';
import {Batch} from './Batch';
import {Convert} from './Convert';
import {Ending} from './Ending';
import {useTime, linear} from './graphics';
import './video.css';

const subtitles = [
  [0.8, 1.982, '想保存视频？'],
  [1.982, 3.317, '复制分享链接，'],
  [3.317, 5.18, '发给装了 VidSave 的助手。'],
  [9, 10.38, '有多条就一起发。'],
  [10.38, 11.93, 'VidSave 会逐条处理，'],
  [11.93, 13.77, '告诉你哪些已经保存。'],
  [17, 18.36, '手头已经有文件？'],
  [18.36, 19.73, '也能检查视频，'],
  [19.73, 21.9, '需要时转成兼容的 MP4。'],
  [24, 26.29, '在小红书 SkillHub 搜索 VidSave。'],
  [26.29, 27.3, '装好技能，'],
  [27.3, 28.74, '发个链接就能试。'],
];

function Captions() {
  const time = useTime();
  const current = subtitles.find(([start, end]) => time >= start && time < end);
  return current ? <div className="caption"><span>{current[2]}</span></div> : null;
}

const cutTimes = [5, 8.6, 16.6, 23.5];

function FilmCut() {
  const time = useTime();
  const cut = cutTimes.find((seconds) => Math.abs(time - seconds) <= 0.12);
  if (cut === undefined) return null;

  const travel = linear(time, cut - 0.12, cut + 0.12);
  return <div className="film-cut" style={{translate: `${-1260 + travel * 2510}px 0`}} />;
}

function VidSavePromo() {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill className="video">
      <Series>
        <Series.Sequence name="开场 · 想保存视频？" durationInFrames={5 * fps} premountFor={fps}><Opening /></Series.Sequence>
        <Series.Sequence name="粘贴完整分享链接" durationInFrames={3.6 * fps} premountFor={fps}><Paste /></Series.Sequence>
        <Series.Sequence name="批量保存与核验" durationInFrames={8 * fps} premountFor={fps}><Batch /></Series.Sequence>
        <Series.Sequence name="本地文件转 MP4" durationInFrames={6.9 * fps} premountFor={fps}><Convert /></Series.Sequence>
        <Series.Sequence name="小红书 SkillHub" durationInFrames={7.5 * fps} premountFor={fps}><Ending /></Series.Sequence>
      </Series>
      <FilmCut />
      <Captions />
      <Audio src={staticFile('audio/vidsave-mix.m4a')} premountFor={fps} />
    </AbsoluteFill>
  );
}

const Root = () => (
  <>
    <Composition id="VidSavePromo" component={VidSavePromo} width={1080} height={1920} fps={30} durationInFrames={930} />
    <Folder name="Scenes">
      <Composition id="Opening" component={Opening} width={1080} height={1920} fps={30} durationInFrames={150} />
      <Composition id="Paste" component={Paste} width={1080} height={1920} fps={30} durationInFrames={108} />
      <Composition id="Batch" component={Batch} width={1080} height={1920} fps={30} durationInFrames={240} />
      <Composition id="Convert" component={Convert} width={1080} height={1920} fps={30} durationInFrames={207} />
      <Composition id="Ending" component={Ending} width={1080} height={1920} fps={30} durationInFrames={225} />
    </Folder>
  </>
);

registerRoot(Root);
