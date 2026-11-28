import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const easeOut = Easing.bezier(0.19, 1, 0.22, 1);
const clamped = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

export const ramp = (time, start, end) => interpolate(time, [start, end], [0, 1], {...clamped, easing: easeOut});
export const linear = (time, start, end) => interpolate(time, [start, end], [0, 1], clamped);
export const lerp = (a, b, progress) => a + (b - a) * progress;

export const useTime = () => useCurrentFrame() / useVideoConfig().fps;

export function Rise({children, at = 0, distance = 48, className, style}) {
  const time = useTime();
  const progress = ramp(time, at, at + 0.65);
  return <div className={className} style={{...style, opacity: progress, translate: `0 ${distance * (1 - progress)}px`}}>{children}</div>;
}

export function Icon({name, size = 40}) {
  const paths = {
    link: <><path d="m10 13 4-4"/><path d="m8 16-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1" transform="translate(0 -1)"/></>,
    play: <path d="m9 5 11 7-11 7Z" fill="currentColor" strokeLinejoin="round"/>,
    arrow: <path d="M12 3v16m-6-6 6 6 6-6"/>,
    send: <path d="M12 20V4m-6 6 6-6 6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    search: <><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></>,
    folder: <path d="M3 18V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>,
    film: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 4v16m10-16v16M3 9h4m-4 6h4m10-6h4m-4 6h4m-11-4 4 2-4 2Z"/></>,
    swap: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function BrandMark({className = ''}) {
  return <span className={`brand-mark ${className}`}><Icon name="arrow" size={43} /><span /></span>;
}

export function Brand({label}) {
  return <header className="masthead"><div><BrandMark /> <b>VidSave</b></div>{label && <span>{label}</span>}</header>;
}

export function ClipImage({name = 'ridge', style}) {
  return <Img className="clip-image" src={staticFile(`stills/${name}.jpg`)} style={style} />;
}

export function ClipCard({className = '', style, photoStyle, name = 'ridge', title = '日落骑行', duration = '0:38'}) {
  return (
    <div className={`clip-card ${className}`} style={style}>
      <ClipImage name={name} style={photoStyle} />
      <div className="clip-shade" />
      <div className="clip-play"><Icon name="play" size={62} /></div>
      <div className="clip-meta"><b>{title}</b><span>{duration}</span></div>
    </div>
  );
}

export function Heading({first, second}) {
  return <h1 className="scene-title"><span>{first}</span><em>{second}</em></h1>;
}
