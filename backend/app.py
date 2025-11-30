from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import os
import eventlet

# 使用eventlet作为异步后端
eventlet.monkey_patch()

app = Flask(__name__, template_folder='../frontend/templates', static_folder='../frontend/static')

# 从配置文件加载配置
config_path = os.path.join(os.path.dirname(__file__), '../config/config.json')
with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

app.config['SECRET_KEY'] = config['app']['secret_key']
socketio = SocketIO(app, async_mode='eventlet')

# 存储在线用户信息
online_users = {}
room_name = 'default_room'

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/api/servers')
def get_servers():
    return jsonify(config['servers'])

@app.route('/api/check_username', methods=['POST'])
def check_username():
    username = request.json.get('username')
    if username in online_users:
        return jsonify({'available': False})
    return jsonify({'available': True})

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    # 查找断开连接的用户
    for username, user_info in online_users.items():
        if user_info['sid'] == sid:
            # 从房间移除用户
            leave_room(room_name, sid)
            # 从在线用户列表移除
            del online_users[username]
            # 通知房间内其他用户
            emit('user_left', {
                'username': username,
                'online_users': list(online_users.keys())
            }, room=room_name)
            break

@socketio.on('login')
def handle_login(data):
    username = data['username']
    sid = request.sid
    
    # 检查用户名是否已存在
    if username in online_users:
        emit('login_failed', {'message': '用户名已存在'})
        return
    
    # 保存用户信息并加入房间
    online_users[username] = {'sid': sid}
    join_room(room_name, sid)
    
    # 通知用户登录成功
    emit('login_success', {
        'username': username,
        'online_users': list(online_users.keys())
    })
    
    # 发送历史消息给新登录用户
    emit('history_messages', history_messages, room=sid)
    
    # 通知房间内其他用户有新用户加入
    emit('user_joined', {
        'username': username,
        'online_users': list(online_users.keys())
    }, room=room_name, skip_sid=sid)

@socketio.on('send_message')
def handle_message(data):
    username = data['username']
    message = data['message']
    timestamp = data['timestamp']
    
    # 处理特殊命令
    message_type = 'text'
    additional_data = None
    
    # 检查是否是@电影命令
    if message.startswith('@电影'):
        parts = message.split(' ', 1)
        if len(parts) > 1:
            message_type = 'movie'
            additional_data = {'url': parts[1]}
    # 检查是否是@川农命令
    elif message.startswith('@川农'):
        parts = message.split(' ', 1)
        if len(parts) > 1:
            message_type = 'ai_chat'
            additional_data = {'query': parts[1]}
    # 检查是否是@其他用户
    elif message.startswith('@'):
        message_type = 'mention'
    
    # 发送消息给房间内所有用户
    emit('new_message', {
        'username': username,
        'message': message,
        'timestamp': timestamp,
        'type': message_type,
        'additional_data': additional_data
    }, room=room_name)

if __name__ == '__main__':
    host = '0.0.0.0'  # 允许所有IP访问
    port = 5000
    print(f"服务器启动在 http://{host}:{port}")
    socketio.run(app, host=host, port=port, debug=config['app']['debug'])