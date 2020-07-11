# -{cd .. | python -m server}
from http.server import BaseHTTPRequestHandler
from http.cookies import BaseCookie
from glob import glob
from os import path, remove
from random import random
from json import dumps, load, loads
from hashlib import pbkdf2_hmac
from .algo import extract_subjects, makeSchedule


def hash_pass(passw: str):
    return pbkdf2_hmac('sha256', passw.encode(), b'salt', 10000).hex()


pass_path = path.join(path.dirname(__file__), 'pass.txt')  # next to script
with open(pass_path) as file:
    password = file.read()
    password = password if password else hash_pass('')

public_cache = {}
authenticated = {}
mime = {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript'}
init = dumps(extract_subjects()).encode()  # for input


class handler(BaseHTTPRequestHandler):

    def signed_in(self):
        '''check if signed in'''
        cookie = BaseCookie(self.headers['Cookie']).get('token', None)
        token = authenticated.get(self.client_address[0], None)
        if cookie is None or not cookie.value or int(cookie.value) != token:
            return False
        return True

    def do_GET(self):
        # for files
        if self.path == '/':
            self.path = '/index.html'
        for p in glob('public/**/*', recursive=True):
            if not path.isfile(p) \
                    or p.replace('\\', '/')[len('public'):] != self.path:
                continue
            self.send_response(200)
            self.send_header('Content-Type', mime.get(path.splitext(p)[1], 'text/plain'))
            self.end_headers()
            mtime = path.getmtime(p)
            if p in public_cache and public_cache[p]['mtime'] == mtime:
                content = public_cache[p]['content']
            else:
                with open(p, 'rb') as file:
                    content = file.read()
                    public_cache[p] = {'mtime': mtime, 'content': content}
            self.wfile.write(content)
            return
        self.send_response(404)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'404: Not found')

    def do_POST(self):
        if self.path == '/auth':
            if 'pass' in self.headers:
                if hash_pass(self.headers['pass']) == password:
                    token = hash(random())
                    authenticated[self.client_address[0]] = token
                    self.send_response(200)
                    self.send_header('Set-Cookie', f'token={token}; Max-Age={24*3600}')
                else:
                    self.send_response(203)
            elif self.signed_in():
                self.send_response(200)
            else:
                self.send_response(203)
        elif self.path == '/init':
            if self.signed_in():
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', 'http://localhost:5000')  # cors
                self.send_header('Access-Control-Allow-Credentials', 'true')  # cors
                self.end_headers()
                self.wfile.write(init)
                return
            else:
                self.send_response(401)
        elif self.path == '/make':
            if self.signed_in():
                data = loads(self.rfile.read(int(self.headers['Content-Length'])))
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', 'http://localhost:5000')  # cors
                self.send_header('Access-Control-Allow-Credentials', 'true')  # cors
                self.end_headers()
                sch = makeSchedule(data)
                self.wfile.write(dumps(sch).encode())
                return
            else:
                self.send_response(401)
        elif self.path == '/save':
            if self.signed_in():
                save_key = self.headers['year'] + '-' + self.headers['semester']
                length = int(self.headers['Content-Length'])
                dpath = 'data'
                if length:  # overwrite
                    with open(path.join(dpath, save_key + '.json'), 'w') as file:
                        file.write(self.rfile.read(length).decode())
                    self.send_response(200)
                else:  # check if exists
                    if path.exists(path.join(dpath, save_key + '.json')):
                        self.send_response(409)
                    else:
                        self.send_response(200)
            else:
                self.send_response(401)
        elif self.path == '/get':
            if 'year' in self.headers:
                fpath = path.join('data', self.headers['year'] + '-' + self.headers['semester'] + '.json')
                if path.exists(fpath):
                    self.send_response(200)
                    self.send_header('Access-Control-Allow-Origin', 'http://localhost:5000')  # cors
                    self.send_header('Access-Control-Allow-Credentials', 'true')  # cors
                    self.end_headers()
                    with open(fpath, 'rb') as file:
                        self.wfile.write(file.read())
                    return
                else:
                    self.send_response(404)
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', 'http://localhost:5000')  # cors
            self.send_header('Access-Control-Allow-Credentials', 'true')  # cors
            self.end_headers()
            saved = {}
            for p in glob('data/*.json'):
                with open(p) as file:
                    saved[path.splitext(path.basename(p))[0]] = load(file)
            self.wfile.write(dumps(saved).encode())
            return
        elif self.path == '/curriculum':
            if self.signed_in() or 1:
                with open('public/subjects.xlsx', 'wb') as file:
                    file.write(self.rfile.read(int(self.headers['Content-Length'])))
                extract_subjects()
                self.send_response(200)
            else:
                self.send_response(401)
        else:
            self.send_response(404)
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:5000')  # cors
        self.send_header('Access-Control-Allow-Credentials', 'true')  # cors
        self.end_headers()

    def do_DELETE(self):
        if self.path == '/auth':  # logout
            del authenticated[self.client_address[0]]
            self.send_response(200)
            self.send_header('Set-Cookie', 'token=')
        elif self.path == '/':
            key = self.headers['year'] + '-' + self.headers['semester']
            sch_path = path.join('data', key + '.json')
            if path.exists(sch_path):
                remove(sch_path)
                self.send_response(200)
            else:
                self.send_response(404)
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:5000')  # cors
        self.send_header('Access-Control-Allow-Credentials', 'true')  # cors
        self.end_headers()

    def do_PATCH(self):
        if self.path == '/auth':
            old = hash_pass(self.headers['old'])
            global password
            if old == password:
                password = hash_pass(self.headers['new'])
                with open(pass_path, 'w') as file:
                    file.write(password)
                self.send_response(200)
            else:
                self.send_response(401)
        else:
            self.send_response(404)
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:5000')  # cors
        self.end_headers()

    def do_OPTIONS(self):  # cors
        self.send_response(200)  # cors
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:5000')  # cors
        self.send_header('Access-Control-Allow-Methods', 'POST,DELETE,PATCH')  # cors
        self.send_header('Access-Control-Allow-Headers', 'pass,year,semester,old,new')  # cors
        self.send_header('Access-Control-Allow-Credentials', 'true')  # cors
        self.end_headers()  # cors


# :%s,^.*cors\n,,g to remove cors lines
