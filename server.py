#!/usr/bin/env python3
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

def load_env(path='.env'):
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                k, _, v = line.partition('=')
                env[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        print("  [warn] No .env file found")
    return env

ENV = load_env()

CONFIG_TEMPLATE = """\
export const WEATHER_API_KEY  = '{key}';
export const WEATHER_API_BASE = 'https://api.weatherapi.com/v1';
export const DEFAULT_LOCATION = 'auto:ip';
export const OUTDOOR_REFRESH_MS = 300_000;
"""

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        '':       'application/octet-stream',
        '.html':  'text/html; charset=utf-8',
        '.css':   'text/css',
        '.js':    'application/javascript',
        '.mjs':   'application/javascript',
        '.json':  'application/json',
        '.png':   'image/png',
        '.jpg':   'image/jpeg',
        '.jpeg':  'image/jpeg',
        '.webp':  'image/webp',
        '.gif':   'image/gif',
        '.svg':   'image/svg+xml',
        '.ico':   'image/x-icon',
        '.woff':  'font/woff',
        '.woff2': 'font/woff2',
        '.ttf':   'font/ttf',
    }

    def do_GET(self):
        if self.path.split('?')[0] == '/config.js':
            body = CONFIG_TEMPLATE.format(key=ENV.get('WEATHER_API_KEY', '')).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type',   'application/javascript')
            self.send_header('Content-Length',  str(len(body)))
            self.send_header('Cache-Control',   'no-cache')
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        print(f'  {self.address_string():<18} {fmt % args}')

if __name__ == '__main__':
    port = int(ENV.get('PORT', 3000))
    os.chdir(os.path.dirname(os.path.abspath(__file__)) or '.')
    server = HTTPServer(('0.0.0.0', port), Handler)
    print(f'\n  ProjectGasu running at:')
    print(f'    Local   → http://localhost:{port}')
    print(f'    Network → http://<your-ip>:{port}  (run ipconfig to find your IP)')
    print(f'    Stop    → Ctrl+C\n')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Server stopped.')
