import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Brand, ClipCard, Heading, Icon, Rise, lerp, linear, ramp, useTime} from './graphics';

export function Opening() {
  const time = useTime();
  const reveal = ramp(time, 0, 0.9);
  const land = ramp(time, 1.98, 2.92);
  const drift = Math.sin(time * 2.2) * 11;

  return (
    <AbsoluteFill className="scene opening">
      <div className="opening-halo" />
      <Brand label="视频下载技能" />
      <Rise className="heading-area" at={-0.3}>
        <Heading first="想保存视频？" second="复制分享链接。" />
      </Rise>

      <div className="opening-media" style={{translate: `0 ${lerp(105, drift, reveal)}px`, rotate: `${lerp(-10, -5, reveal)}deg`}}>
        <div className="film-perforations" />
        <ClipCard className="opening-clip" photoStyle={{scale: 1.03 + linear(time, 0, 5) * 0.12}} />
        <div className="film-perforations" />
      </div>

      <div className="opening-link" style={{opacity: land, translate: `${(1 - land) * 180}px ${(1 - land) * 145}px`, rotate: `${lerp(16, 6, land)}deg`}}>
        <span className="icon-tile"><Icon name="link" size={40} /></span>
        <div><b>分享链接</b><span>日落骑行</span></div>
        <Icon name="arrow" size={46} />
      </div>
    </AbsoluteFill>
  );
}
