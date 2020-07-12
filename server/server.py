# -{cd .. | python -m server}
from http.server import BaseHTTPRequestHandler
from http.cookies import BaseCookie
from glob import glob
from os import path, remove
from random import random
from json import dumps, load, loads, dump
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
        fpath = path.join('public', self.path[1:])
        if path.isfile(fpath) and path.exists(fpath):
            self.send_response(200)
            self.send_header('Content-Type', mime.get(path.splitext(fpath)[1], 'text/plain'))
            self.end_headers()
            mtime = path.getmtime(fpath)
            if fpath in public_cache and public_cache[fpath]['mtime'] == mtime:
                content = public_cache[fpath]['content']
            else:
                with open(fpath, 'rb') as file:
                    content = file.read()
                    public_cache[fpath] = {'mtime': mtime, 'content': content}
            self.wfile.write(content)
            return
        self.send_response(404)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'404: Not found')

    def do_POST(self):
        if self.path == '/auth':
            self.auth()
        elif self.path == '/get':
            self.get()
        elif self.signed_in():
            if self.path == '/init':
                self.init()
            elif self.path == '/make':
                self.make()
            elif self.path == '/save':
                self.save()
            elif self.path == '/curriculum':
                self.curriculum()
            else:
                self.send_response(404)
                self.end_headers()
        else:
            self.send_response(404)
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
        self.end_headers()

    def do_OPTIONS(self):  # cors
        self.send_response(200)  # cors
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:5000')  # cors
        self.send_header('Access-Control-Allow-Methods', 'POST,DELETE,PATCH')  # cors
        self.send_header('Access-Control-Allow-Headers', 'pass,year,semester,old,new')  # cors
        self.send_header('Access-Control-Allow-Credentials', 'true')  # cors
        self.end_headers()  # cors

    def auth(self):
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
        self.end_headers()

    def init(self):
        self.send_response(200)
        self.end_headers()
        init_data = extract_subjects()  # for input
        input_cache_file = path.join('data', 'input-cache.json')
        if path.exists(input_cache_file):
            with open(input_cache_file) as file:
                init_data['input_cache'] = load(file)
        self.wfile.write(dumps(init_data).encode())

    def make(self):
        data = loads(self.rfile.read(int(self.headers['Content-Length'])))
        self.send_response(200)
        self.end_headers()
        sch = makeSchedule(data)
        self.wfile.write(dumps(sch).encode())
        # save input cache
        input_cache_file = path.join('data', 'input-cache.json')
        with open(input_cache_file, 'w') as file:
            dump(data, file)

    def save(self):
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
        self.end_headers()

    def curriculum(self):
        with open('public/subjects.xlsx', 'wb') as file:
            file.write(self.rfile.read(int(self.headers['Content-Length'])))
        extract_subjects()
        self.send_response(200)
        self.end_headers()

    def get(self):
        if 'year' in self.headers:  # specific semester
            fpath = path.join('data', self.headers['year'] + '-' + self.headers['semester'] + '.json')
            if path.exists(fpath):
                self.send_response(200)
                self.end_headers()
                with open(fpath, 'rb') as file:
                    self.wfile.write(file.read())
            else:
                self.send_response(404)
                self.end_headers()
            return
        # a list
        self.send_response(200)
        self.end_headers()
        saved = {}
        for p in glob('data/*.json'):
            with open(p) as file:
                saved[path.splitext(path.basename(p))[0]] = load(file)
        self.wfile.write(dumps(saved).encode())


# :%s,^.*cors\n,,g to remove cors lines
