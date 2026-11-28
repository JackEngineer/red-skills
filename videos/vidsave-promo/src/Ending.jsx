import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BrandMark, Icon, Rise, lerp, linear, ramp, useTime} from './graphics';

export function Ending() {
  const time = useTime();
  const enter = ramp(time, 0.08, 1.1);
  const searched = ramp(time, 3, 3.5);
  const searchAt = 0.9;
  const keywordHighlight = ramp(time, searchAt + 0.05, searchAt + 0.23)
    - linear(time, searchAt + 0.37, searchAt + 0.78);

  return (
    <AbsoluteFill className="scene ending">
      <div className="end-rings"><i /><i /><i /></div>
      <div className="end-symbol" style={{scale: lerp(0.72, 1, enter), rotate: `${lerp(-18, -6, enter)}deg`}}><BrandMark /></div>
      <Rise className="end-wordmark" at={0.21}>VidSave</Rise>
      <Rise className="end-tagline" at={0.42}>想存的视频，发个链接。</Rise>
      <Rise className="end-search" at={searchAt}>
        <div className="end-search-label">在小红书 SkillHub</div>
        <div className="search-field">
          <span className="search-action"><Icon name="search" size={38} /> 搜索</span>
          <b>
            <span className="search-keyword-highlight" aria-hidden="true"
              style={{opacity: keywordHighlight * 0.68, scale: 0.97 + keywordHighlight * 0.03}} />
            VidSave
          </b>
          <span className="search-success" style={{scale: searched}}><Icon name="check" size={30} /></span>
        </div>
      </Rise>
      <Rise className="end-note" at={3.12}>只保存你有权下载的视频</Rise>
    </AbsoluteFill>
  );
}
