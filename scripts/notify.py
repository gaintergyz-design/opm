#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把生成的圖推到手機/微信側。支援三種通道（在 scripts/.env.notify 設定）：
  CHANNEL=wecom | telegram | bark | none
  WECOM_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx   # 企业微信群机器人
  TG_TOKEN=123:abc / TG_CHAT=@channel_or_id
  BARK_KEY=xxxx（iOS，僅文字通知）

用法：python notify.py --image out/on-deck-20261020.png --text "On Deck ..." [--dry-run]
"""
import base64, hashlib, json, os, subprocess, sys, urllib.parse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.notify')
DRY = '--dry-run' in sys.argv


def conf():
    c = {}
    if os.path.exists(ENV):
        for line in open(ENV, encoding='utf-8'):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                c[k.strip()] = v.strip()
    c.setdefault('CHANNEL', os.environ.get('NOTIFY_CHANNEL', 'none'))
    c.setdefault('WECOM_WEBHOOK', os.environ.get('WECOM_WEBHOOK', ''))
    c.setdefault('TG_TOKEN', os.environ.get('TG_TOKEN', ''))
    c.setdefault('TG_CHAT', os.environ.get('TG_CHAT', ''))
    c.setdefault('BARK_KEY', os.environ.get('BARK_KEY', ''))
    return c


def opt(name, d=None):
    a = sys.argv
    return a[a.index(name) + 1] if name in a else d


def post_json(url, payload):
    out = subprocess.run(['curl', '-s', '--max-time', '30', '-X', 'POST', url,
                          '-H', 'Content-Type: application/json',
                          '-d', json.dumps(payload, ensure_ascii=False)],
                         capture_output=True, text=True).stdout
    return out


def send_wecom(c, image, text):
    """企业微信群机器人：文字 + 圖片（base64+md5，無需先上傳）"""
    if not c['WECOM_WEBHOOK']:
        return 'skip: 未設 WECOM_WEBHOOK'
    r1 = post_json(c['WECOM_WEBHOOK'], {'msgtype': 'text', 'text': {'content': text}})
    r2 = ''
    if image and os.path.exists(image):
        b64 = base64.b64encode(open(image, 'rb').read()).decode()
        md5 = hashlib.md5(open(image, 'rb').read()).hexdigest()
        r2 = post_json(c['WECOM_WEBHOOK'],
                       {'msgtype': 'image', 'image': {'base64': b64, 'md5': md5}})
    return f'wecom text={r1[:60]} image={r2[:60]}'


def send_telegram(c, image, text):
    if not (c['TG_TOKEN'] and c['TG_CHAT']):
        return 'skip: 未設 TG_TOKEN/TG_CHAT'
    if image and os.path.exists(image):
        out = subprocess.run([
            'curl', '-s', '--max-time', '60', '-X', 'POST',
            f"https://api.telegram.org/bot{c['TG_TOKEN']}/sendPhoto",
            '-F', f'chat_id={c["TG_CHAT"]}',
            '-F', f'photo=@{image};type=image/png',
            '-F', f'caption={text[:1000]}'], capture_output=True, text=True).stdout
    else:
        out = post_json(f"https://api.telegram.org/bot{c['TG_TOKEN']}/sendMessage",
                        {'chat_id': c['TG_CHAT'], 'text': text})
    return f'telegram={out[:80]}'


def send_bark(c, image, text):
    if not c['BARK_KEY']:
        return 'skip: 未設 BARK_KEY'
    title = urllib.parse.quote('@onepagemarket')
    body = urllib.parse.quote(text[:200])
    out = subprocess.run(['curl', '-s', '--max-time', '20',
                          f"https://api.day.app/{c['BARK_KEY']}/{title}/{body}?group=onepagemarket"],
                         capture_output=True, text=True).stdout
    return f'bark={out[:60]}'


def send_wecom_app(c, image, text):
    """企业微信自建应用：应用消息可在「微信插件」里用微信直接收到（真·微信）。
    需要 WECOM_CORPID / WECOM_SECRET / WECOM_AGENTID / WECOM_TOUSER。"""
    need = ['WECOM_CORPID', 'WECOM_SECRET', 'WECOM_AGENTID']
    if not all(c.get(k) for k in need):
        return 'skip: 未設 WECOM_CORPID/WECOM_SECRET/WECOM_AGENTID'
    tok = json.loads(subprocess.run(
        ['curl', '-s', '--max-time', '20',
         f"https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid={c['WECOM_CORPID']}"
         f"&corpsecret={c['WECOM_SECRET']}"], capture_output=True, text=True).stdout)
    at = tok.get('access_token')
    if not at:
        return f'wecom-app token 失敗: {str(tok)[:80]}'
    to = c.get('WECOM_TOUSER') or '@all'
    base = {'touser': to, 'agentid': c['WECOM_AGENTID']}
    r1 = post_json(f'https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={at}',
                   dict(base, msgtype='text', text={'content': text}))
    r2 = ''
    if image and os.path.exists(image):
        up = subprocess.run(['curl', '-s', '--max-time', '40', '-X', 'POST',
                             f'https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token={at}&type=image',
                             '-F', f'media=@{image};type=image/png'],
                            capture_output=True, text=True).stdout
        try:
            mid = json.loads(up).get('media_id')
        except Exception:
            mid = None
        if mid:
            r2 = post_json(f'https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={at}',
                           dict(base, msgtype='image', image={'media_id': mid}))
        else:
            r2 = f'upload 失敗 {up[:60]}'
    return f'wecom-app text={r1[:50]} image={r2[:50]}'


def main():
    image = opt('--image')
    text = opt('--text', 'onepagemarket 新圖已生成')
    c = conf()
    ch = c['CHANNEL']
    print(f'[notify] channel={ch} image={image}')
    if DRY or ch in ('none', ''):
        print('[dry-run/none] 未發送'); return
    fn = {'wecom': send_wecom, 'wecom-app': send_wecom_app,
          'telegram': send_telegram, 'bark': send_bark}.get(ch)
    if not fn:
        print('未知通道', ch); return
    try:
        print(fn(c, image, text))
    except Exception as e:
        print('推送失敗（不影響出圖）:', e)


if __name__ == '__main__':
    main()
