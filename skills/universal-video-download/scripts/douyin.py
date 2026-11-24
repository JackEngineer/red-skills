import asyncio,json,re,urllib.request,urllib.parse,subprocess,argparse,sys,shutil
from pathlib import Path
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
parser=argparse.ArgumentParser(description='下载公开抖音视频，校验文件；不负责微信投递。')
parser.add_argument('url', help='抖音链接或包含链接的完整分享文字')
parser.add_argument('--output-dir', type=Path, default=Path.home()/'Downloads'/'douyin', help='保存目录')
parser.add_argument('--name', default='抖音视频', help='简短主题名，自动移除不安全字符')
parser.add_argument('--browser', type=Path, help='浏览器可执行文件路径；默认先试内置 Chromium')
parser.add_argument('--compress-above-mib', type=float, default=80, help='超过此大小另生成微信版；不是通道官方限制')
args=parser.parse_args()
link=re.search(r'https?://(?:v\.douyin\.com|www\.douyin\.com|douyin\.com)/[^\s<>]+',args.url)
if not link:
 parser.error('请提供有效的抖音链接。')
share_url=link.group(0).rstrip('，。；！）')
name=re.sub(r'[\x00-\x1f\x7f\\/:*?"<>|#]','_',args.name)
name=' '.join(name.split()).strip(' ._')[:45] or '抖音视频'
OUT=args.output_dir.expanduser().resolve()/(name+'.mp4')
for tool in ['curl','ffprobe']:
 if not shutil.which(tool):parser.error('缺少必需工具：'+tool)

def search(o,vid):
 if isinstance(o,dict):
  if 'video' in o and str(o.get('aweme_id',''))==vid:return o
  for v in o.values():
   r=search(v,vid)
   if r:return r
 elif isinstance(o,list):
  for v in o:
   r=search(v,vid)
   if r:return r
async def main():
 from playwright.async_api import async_playwright
 with urllib.request.urlopen(urllib.request.Request(share_url,headers={'User-Agent':UA}),timeout=30) as r:final=r.url
 m=re.search(r'/video/(\d+)',final)
 if not m:raise RuntimeError('该链接不是普通视频。若为商品页，请按技能中的内置播放器流程下载；脚本不自动处理商城页。')
 vid=m.group(1);print('视频编号',vid,flush=True)
 OUT=globals()['OUT'].with_name(globals()['OUT'].stem+'_'+vid+'.mp4')
 async with async_playwright() as p:
  if args.browser:
   b=await p.chromium.launch(headless=True,executable_path=str(args.browser))
  else:
   try:b=await p.chromium.launch(headless=True)
   except Exception as exc:
    chrome=Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    if not chrome.exists():raise RuntimeError('内置浏览器启动失败，请安装 Chromium 或用 --browser 指定浏览器。') from exc
    b=await p.chromium.launch(headless=True,executable_path=str(chrome))
  page=await b.new_page(user_agent=UA);captured=[]
  async def response(resp):
   if 'aweme/detail' in resp.url:
    try:
     aw=search(await resp.json(),vid)
     if aw:captured.append(aw)
    except Exception:pass
  page.on('response',response)
  await page.goto(final,wait_until='domcontentloaded',timeout=40000);await page.wait_for_timeout(8000)
  aw=captured[0] if captured else None
  if not aw:
   for s in re.findall(r'<script[^>]*>(.*?)</script>',await page.content(),re.S):
    for candidate in [s,urllib.parse.unquote(s)]:
     try:aw=search(json.loads(candidate),vid)
     except ValueError:pass
     if aw:break
    if aw:break
  if not aw:
   t=await page.evaluate('async u=>(await fetch(u,{credentials:"include"})).text()',f'https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id={vid}&aid=1128&cookie_enabled=true&platform=webapp')
   try:aw=search(json.loads(t),vid)
   except ValueError:pass
  if not aw:raise RuntimeError('网页未返回可下载的视频详情')
  print('标题',aw.get('desc'),flush=True)
  urls=[]
  for k in ['download_addr','play_addr']:
   for u in aw.get('video',{}).get(k,{}).get('url_list',[]):
    if u not in urls:urls.append(u)
  OUT.parent.mkdir(parents=True,exist_ok=True)
  for u in urls:
   r=subprocess.run(['curl','-L','--fail','-sS','--max-time','180','-A',UA,'-e','https://www.douyin.com/','-o',str(OUT)+'.part',u],capture_output=True,text=True)
   if not r.returncode:
    probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_type,codec_name','-of','json',str(OUT)+'.part'],capture_output=True,text=True)
    if probe.returncode==0 and any(x.get('codec_type')=='video' for x in json.loads(probe.stdout).get('streams',[])):
     Path(str(OUT)+'.part').replace(OUT);break
  else:raise RuntimeError('所有候选下载地址失败')
  await b.close()
 data=json.loads(probe.stdout);dst=OUT
 if OUT.stat().st_size>args.compress_above_mib*1024*1024:
  if not shutil.which('ffmpeg'):raise RuntimeError('原件已下载，但缺少 ffmpeg，无法生成压缩版：'+str(OUT))
  dst=OUT.with_name(OUT.stem+'_微信版.mp4');rate=max(180,int(60*1024*1024*8/float(data['format']['duration'])/1000)-80)
  subprocess.run(['ffmpeg','-y','-v','error','-i',str(OUT),'-vf','scale=720:-2','-c:v','h264_videotoolbox','-b:v',f'{rate}k','-c:a','aac','-b:a','64k','-movflags','+faststart',str(dst)],check=True)
  data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_type,codec_name','-of','json',str(dst)]))
 print(json.dumps({'文件':str(dst),'信息':data,'大小MB':dst.stat().st_size/1024/1024},ensure_ascii=False))
if __name__ == '__main__':
 try:asyncio.run(main())
 except KeyboardInterrupt:sys.exit('已取消下载。')
 except Exception as exc:sys.exit('下载失败：'+str(exc))
