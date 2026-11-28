import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Brand, ClipImage, Heading, Icon, Rise, linear, ramp, useTime} from './graphics';

function Result({name, title, duration, at}) {
  const time = useTime();
  const progress = linear(time, at - 1.1, at);
  const success = ramp(time, at, at + 0.38);

  return (
    <div className="result-row">
      <div className="result-thumb"><ClipImage name={name} /></div>
      <div className="result-title"><b>{title}.mp4</b><small>{progress === 1 ? duration : '处理中'}</small></div>
      <div className="result-status">
        <div className="result-spinner" style={{opacity: 1 - success, rotate: `${time * 280}deg`}} />
        <span style={{opacity: success, scale: 0.45 + 0.55 * success}}><Icon name="check" size={29} /></span>
      </div>
      <div className="result-progress" style={{scale: `${progress} 1`, opacity: 1 - success}} />
    </div>
  );
}

export function Batch() {
  const time = useTime();
  return (
    <AbsoluteFill className="scene batch">
      <div className="batch-grid" />
      <Brand label="批量保存" />
      <Rise className="heading-area" at={0.08}>
        <Heading first="有多条？" second="一起发。" />
      </Rise>
      <Rise className="batch-stack" at={0.38}>
        <div className="batch-header"><b>保存结果</b><span>{time >= 4.2 ? '2 项已保存' : time >= 2.9 ? '1 项已保存' : '正在处理 2 项'}</span></div>
        <Rise at={0.64}><Result name="ridge" title="日落骑行" duration="00:38 · 已校验" at={2.9} /></Rise>
        <Rise at={0.9}><Result name="rain-city" title="雨夜电车" duration="00:26 · 已校验" at={4.2} /></Rise>
        <Rise className="batch-location" at={4.25}><Icon name="folder" size={33} /><span>Downloads / videos</span></Rise>
      </Rise>
    </AbsoluteFill>
  );
}
