export function mpPrompt(el, packTitle, lang, sourceBase) {
  var base = sourceBase ? sourceBase.replace(/\/?$/, '/') : null;
  var en = lang === 'en';
  var spec = el.spec[lang].map(function (s) { return '- ' + s; }).join('\n');
  var ref = base ? base + lang + '/e/' + el.id + '.txt' : '../e/' + el.id + '.txt';
  var kit = base ? base + 'kit/' + el.pack + '.js' : '../../kit/' + el.pack + '.js';
  var same = el.name.en === el.name.ja;
  var mean = el.meaning && (el.meaning[lang] || el.meaning.en);
  if (lang === 'zh-Hans') {
    return [
      '请使用“' + el.name[lang] + '（英文名：' + el.name.en + '）”，它属于“' + packTitle + '”素材包。',
      'Motion Prompt #' + el.id, ''
    ].concat(mean ? ['含义：' + mean] : [], [
      '示例内容：' + el.summary[lang], '动效规格：', spec, '适用场景：' + el.use[lang], '',
      '参考实现（Canvas 2D，画面只取决于传入时间）：' + ref,
      '共用辅助代码：' + kit,
      base ? '引用位置属于当前数据源。' : '以上路径相对于本提示词文件的位置。',
      '请保留参考实现的形状、时序和缓动参数，只按当前项目调整文字、颜色和素材。'
    ]).join('\n');
  }
  if (en) {
    return [
      'Please use "' + el.name.en + '"' + ', one of the names in "' + packTitle + '".',
      'Motion Prompt #' + el.id,
      ''
    ].concat(mean ? ['What it is: ' + mean] : [], [
      'What the sample shows: ' + el.summary.en,
      'Spec:',
      spec,
      'When to use it: ' + el.use.en,
      '',
      'Reference implementation (Canvas 2D, a function whose picture depends only on the time): ' + ref,
      'Shared helper code: ' + kit,
      'Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.'
    ]).join('\n');
  }
  return [
    '「' + el.name.ja + (same ? '' : '（英文名：' + el.name.en + '）') + '」を使ってください。「' + packTitle + '」の名前の1つです。',
    'Motion Prompt #' + el.id,
    ''
  ].concat(mean ? ['どういうものか: ' + mean] : [], [
    '見本で起きること: ' + el.summary.ja,
    '仕様:',
    spec,
    '使いどころ: ' + el.use.ja,
    '',
    '参考実装（Canvas 2D・時刻だけで絵が決まる関数）: ' + ref,
    '共通の補助コード: ' + kit,
    '参考実装の形・タイミング・イージングの数値はそのまま使い、中の文字・色・素材だけ、いま作っている物に合わせてください。'
  ]).join('\n');
}
