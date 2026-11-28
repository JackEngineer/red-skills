import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Brand, ClipImage, Heading, Icon, Rise, lerp, linear, ramp, useTime} from './graphics';

function ClickHighlight({time, at}) {
  const end = at + 0.56;
  if (time < at || time >= end) return null;

  const expansion = ramp(time, at, at + 0.46);
  const opacity = 1 - linear(time, at + 0.15, end);

  return (
    <span className="click-highlight" aria-hidden="true" style={{opacity}}>
      <span className="click-highlight-ring" style={{scale: 1 + expansion * 0.24}} />
      <svg className="click-highlight-pointer" width="43" height="50" viewBox="0 0 43 50" fill="#fff7e9" stroke="#482017" strokeWidth="3.8" strokeLinejoin="round">
        <path d="M5 4 6 38l9-8 7 14 7-4-7-13 13-2Z" />
      </svg>
    </span>
  );
}

export function Paste() {
  const time = useTime();
  const copyAt = 0.65;
  const sendAt = 1.9;
  const copied = time >= copyAt;
  const pasted = ramp(time, 0.94, 1.44);
  const sent = ramp(time, sendAt, 2.36);
  const press = ramp(time, 1.77, sendAt) - ramp(time, sendAt, 2.16);
  const confirmation = ramp(time, 2.16, 2.53);

  return (
    <AbsoluteFill className="scene paste light">
      <Brand label="用法演示" />
      <Rise className="heading-area" at={0.06}>
        <Heading first="完整分享链接" second="直接发给助手。" />
      </Rise>

      <Rise className="share-source" at={0.1}>
        <div className="source-image"><ClipImage /><div><Icon name="play" size={31} /></div></div>
        <div className="source-text"><b>日落骑行</b><span>视频分享链接</span></div>
        <div className="copy-pill" style={{background: copied ? '#ff603b' : '#e8ddce'}}>
          {copied ? <Icon name="check" size={28} /> : <Icon name="link" size={28} />}
          {copied ? '已复制' : '复制'}
          <ClickHighlight time={time} at={copyAt} />
        </div>
      </Rise>

      <div className="paste-trail"><span /><Icon name="arrow" size={45} /><span /></div>

      <Rise className="chat" at={0.23}>
        <div className="chat-header"><span className="chat-avatar"><Icon name="arrow" size={26} /></span><b>我的助手</b></div>
        <div className="chat-bubble" style={{opacity: pasted, translate: `${(1 - pasted) * 27}px ${lerp((1 - pasted) * 68, -67, sent)}px`, background: sent > 0.15 ? '#ffe0d1' : '#f2ebe2'}}>
          <b>用 VidSave 保存这段视频</b>
          <span>日落骑行 · 完整分享链接</span>
        </div>
        <div className="chat-input">
          <span style={{opacity: 1 - pasted}}>发给助手</span>
          <button style={{scale: 1 - press * 0.18}}>
            <Icon name="send" size={29} />
            <ClickHighlight time={time} at={sendAt} />
          </button>
        </div>
        <div className="chat-confirmed" style={{opacity: confirmation, translate: `0 ${(1 - confirmation) * 24}px`}}>
          <Icon name="check" size={25} /> 已发送
        </div>
      </Rise>
      <Rise className="scene-note" at={1.05}>安装在能运行本地命令的助手里</Rise>
    </AbsoluteFill>
  );
}
