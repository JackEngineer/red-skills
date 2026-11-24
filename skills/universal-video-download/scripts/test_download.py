import importlib.util
from pathlib import Path
import unittest

SCRIPT=Path(__file__).with_name('download.py')

class RoutingTest(unittest.TestCase):
    def test_shared_text_routes_all_unique_targets(self):
        self.assertTrue(SCRIPT.is_file(), '缺少通用下载入口')
        spec=importlib.util.spec_from_file_location('video_download',SCRIPT)
        mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
        result=mod.extract_targets('分享 https://v.douyin.com/abc/ 和 https://example.org/video.mp4 https://v.douyin.com/abc/')
        self.assertEqual(result,['https://v.douyin.com/abc/','https://example.org/video.mp4'])
        self.assertEqual(mod.route(result[0]),'douyin')
        self.assertEqual(mod.route(result[1]),'generic')
        self.assertEqual(mod.route('https://notdouyin.com/video/1'),'generic')

    def test_public_direct_download_end_to_end(self):
        import functools,http.server,json,os,subprocess,sys,tempfile,threading
        scratch=Path(os.environ.get('HERMES_HOME',str(Path.home()/'.hermes')))/'cache'/'scratch'
        scratch.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as td:
            root=Path(td)
            fixture=root/'sample.mp4'
            subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','color=c=blue:s=160x120:r=10','-t','1','-c:v','libx264','-pix_fmt','yuv420p',str(fixture)],check=True)
            class Handler(http.server.SimpleHTTPRequestHandler):
                def log_message(self,*args):pass
            server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=td))
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            try:
                out=root/'output'
                result=subprocess.run([sys.executable,str(SCRIPT),f'http://127.0.0.1:{server.server_port}/sample.mp4','--output-dir',str(out),'--name','测试\n视频'],capture_output=True,text=True,timeout=90)
                self.assertEqual(result.returncode,0,result.stdout+result.stderr)
                self.assertTrue((out/'results.json').is_file(),'应生成逐项结果清单')
                manifest=json.loads((out/'results.json').read_text())
                self.assertEqual(manifest[0]['status'],'downloaded_verified')
                saved=Path(manifest[0]['file'])
                self.assertTrue(saved.is_file())
                self.assertNotIn('\n',saved.name)
                self.assertGreater(manifest[0]['duration_seconds'],0)
            finally:
                server.shutdown();server.server_close();thread.join()

    def test_local_video_is_compressed_and_verified(self):
        import json,os,subprocess,sys,tempfile
        scratch=Path(os.environ.get('HERMES_HOME',str(Path.home()/'.hermes')))/'cache'/'scratch'
        scratch.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as td:
            root=Path(td);source=root/'local.mp4';out=root/'out'
            subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','color=c=green:s=160x120:r=10','-t','1','-c:v','libx264','-pix_fmt','yuv420p',str(source)],check=True)
            r=subprocess.run([sys.executable,str(SCRIPT),str(source),'--output-dir',str(out),'--compress-above-mib','0.0001'],capture_output=True,text=True,timeout=90)
            self.assertEqual(r.returncode,0,r.stdout+r.stderr)
            data=json.loads((out/'results.json').read_text())[0]
            self.assertIn('_通用版.mp4',data['file'])
            self.assertTrue(Path(data['original_file']).is_file())
            self.assertGreater(data['duration_seconds'],0)

    def test_invalid_video_is_not_reported_as_downloaded(self):
        import json,os,subprocess,sys,tempfile
        scratch=Path(os.environ.get('HERMES_HOME',str(Path.home()/'.hermes')))/'cache'/'scratch'
        scratch.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as td:
            root=Path(td);source=root/'fake.mp4';source.write_text('<html>不是视频</html>');out=root/'out'
            r=subprocess.run([sys.executable,str(SCRIPT),str(source),'--output-dir',str(out)],capture_output=True,text=True,timeout=30)
            self.assertNotEqual(r.returncode,0)
            data=json.loads((out/'results.json').read_text())[0]
            self.assertEqual(data['status'],'failed')
            self.assertNotIn('file',data)

if __name__=='__main__':unittest.main()
