import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Brand, ClipImage, Heading, Icon, Rise, lerp, linear, ramp, useTime} from './graphics';

export function Convert() {
  const time = useTime();
  const progress = linear(time, 1.34, 3.6);
  const output = ramp(time, 3.6, 4.23);

  return (
    <AbsoluteFill className="scene convert light">
      <Brand label="本地视频" />
      <Rise className="heading-area" at={0.06}>
        <Heading first="手头已有视频？" second="转成兼容 MP4。" />
      </Rise>
      <div className="convert-graphic">
        <Rise className="convert-source" at={0.32}>
          <div className="convert-file source-file">
            <div className="file-fold" /><Icon name="film" size={68} /><strong>MOV</strong>
          </div>
          <span>本地原片</span>
        </Rise>
        <div className="convert-arrow" style={{opacity: ramp(time, 0.75, 1.25)}}><Icon name="swap" size={70} /><div><span style={{scale: `${progress} 1`}} /></div></div>
        <Rise className="convert-output" at={0.69}>
          <div className="convert-file output-file" style={{translate: `0 ${lerp(12, -20, output)}px`}}>
            <ClipImage name="rain-city" style={{opacity: 0.28 + output * 0.72, scale: 1.13 - output * 0.13}} />
            <div className="file-scrim" />
            <div className="file-fold" /><strong>MP4</strong>
            <span className="convert-check" style={{scale: output}}><Icon name="check" size={34} /></span>
          </div>
          <span>{progress === 1 ? '兼容版已生成' : '兼容版'}</span>
        </Rise>
      </div>
      <Rise className="convert-note" at={3.68}><Icon name="check" size={31} /> 原片保留</Rise>
    </AbsoluteFill>
  );
}
