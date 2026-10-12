import http.server
import json
import urllib.parse
import socket

PORT = 3000
state = {
    "players": [],
    "buzzed": {}
}

class MafiaHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path == '/api/state':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(state).encode('utf-8'))
            return
        elif url.path == '/api/my_role':
            qs = urllib.parse.parse_qs(url.query)
            pid = qs.get('id', [''])[0]
            player = next((p for p in state['players'] if p['id'] == pid), None)
            buzzed = state['buzzed'].pop(pid, False)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            resp = {'role': player['role'] if player else None, 'buzzed': buzzed}
            self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        super().do_GET()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length).decode('utf-8')) if length > 0 else {}

        if url.path == '/api/join':
            pid, name = body.get('id'), body.get('name')
            existing = next((p for p in state['players'] if p['id'] == pid), None)
            if existing:
                existing['name'] = name
            else:
                state['players'].append({'id': pid, 'name': name, 'role': None})
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return
        elif url.path == '/api/distribute':
            deck = body.get('deck', [])
            for idx, p in enumerate(state['players']):
                if idx < len(deck):
                    p['role'] = deck[idx]
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return
        elif url.path == '/api/buzz':
            target = body.get('targetId')
            if target:
                state['buzzed'][target] = True
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return

        self.send_response(404)
        self.end_headers()

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    ip = get_ip()
    print(f"\n=======================================================")
    print(f"🎮 سرور لوکال مافیا آماده شد!")
    print(f"👉 آدرس بازی در وای‌فای خانه: http://{ip}:{PORT}")
    print(f"=======================================================\n")
    server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), MafiaHandler)
    server.serve_forever()
