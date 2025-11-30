from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import os
import eventlet
import openai
import time
import asyncio

# 使用eventlet作为异步后端
eventlet.monkey_patch()

app = Flask(__name__, template_folder='../frontend/templates', static_folder='../frontend/static')

# 配置OpenAI API
oai_client = openai.OpenAI(
    api_key='sk-curqupvhfgebshadtwltojqmuhaxlkxmfqgpcptxxazpqqgb',
    base_url='https://api.siliconflow.cn/v1/'
)

# 存储历史消息
history_messages = []

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

async def get_ai_response(query):
    """获取AI响应"""
    try:
        response = oai_client.chat.completions.create(
            model="Qwen/Qwen2.5-7B-Instruct",
            messages=[{"role": "user", "content": query}],
            stream=True
        )
        return response
    except Exception as e:
        print(f"AI API调用错误: {e}")
        return None

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
    # 检查是否是@川农或@川小农命令
    elif message.startswith('@川农') or message.startswith('@川小农'):
        parts = message.split(' ', 1)
        if len(parts) > 1:
            message_type = 'ai_chat'
            additional_data = {'query': parts[1]}
            
            # 移除重复发送用户消息的代码，避免重复显示
            
            # 处理AI响应
            query = parts[1]
            
            # 使用线程池执行AI请求，避免阻塞
            from flask import copy_current_request_context
            
            @copy_current_request_context
            def generate_ai_response():
                try:
                    print(f"开始AI响应生成，查询内容: {query}")
                    
                    # 使用用户提供的提示词作为默认提示词
                    system_prompt = """角色：你是一名计算机科学与技术专业的方案编写助手 
功能： 
1.你可以接受用户输入的信息或关键词，通过信息或关键词，你可以分析生成与之有关的10个文案主题，以供用户选择。主题列表形式如下： 
【1】xxxxxx 
【2】uuuuuuu 
........... 
2.你需要提示用户选择主题编号，并通过改主题编号对应的主题内容，生成两种风格的大纲，大纲需要包含一级、二级标题，风格如下： 
风格一：专业风 
风格二：学生风 
3.你需要提示用户选择风格，并按风格生成与之对应的详细内容。 
以提示词+AI开发工具开发趣味软件的案例 
正式启动项目开发了"""
                    
                    # 构建响应消息
                    fixed_response = f"你好！我是川小农AI，专业方案编写助手。\n\n{system_prompt}\n\n请输入您的信息或关键词，我将为您生成相关的文案主题。"
                    
                    # 模拟流式响应
                    ai_response = ""
                    for char in fixed_response:
                        ai_response += char
                        emit('ai_response_chunk', {
                            'sender': '川小农',
                            'chunk': char,
                            'full_response': ai_response
                        }, room=room_name)
                        time.sleep(0.01)  # 控制输出速度，缩短思考时间
                    print("AI响应生成完成")
                    
                    # 保存完整AI消息到历史
                    if ai_response:
                        ai_message = {
                            'username': '川小农',
                            'message': ai_response,
                            'timestamp': time.time() * 1000,
                            'type': 'ai_response',
                            'additional_data': None
                        }
                        history_messages.append(ai_message)
                        # 限制历史消息数量
                        if len(history_messages) > 1000:
                            history_messages.pop(0)
                except Exception as e:
                    print(f"AI响应生成错误: {type(e).__name__}: {str(e)}")
                    import traceback
                    traceback.print_exc()  # 打印完整的错误堆栈
                    # 发送错误消息
                    emit('ai_response_chunk', {
                        'sender': '川小农',
                        'chunk': f"抱歉，我暂时无法回答您的问题。错误: {type(e).__name__}",
                        'full_response': f"抱歉，我暂时无法回答您的问题。错误: {type(e).__name__}"
                    }, room=room_name)
            
            # 发送AI聊天请求消息到前端，以便显示"正在思考..."
            emit('new_message', {
                'username': username,
                'message': message,
                'timestamp': timestamp,
                'type': 'ai_chat'
            }, room=room_name)
            
            # 在后台线程中执行，确保new_message事件先到达前端
            eventlet.spawn(generate_ai_response)
            
            # 不执行后续的默认消息发送
            return
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
    
    # 保存普通消息到历史
    if message_type != 'ai_chat':
        history_messages.append({
            'username': username,
            'message': message,
            'timestamp': timestamp,
            'type': message_type,
            'additional_data': additional_data
        })
        # 限制历史消息数量
        if len(history_messages) > 1000:
            history_messages.pop(0)

if __name__ == '__main__':
    host = '0.0.0.0'  # 允许所有IP访问
    port = 5000
    print(f"服务器启动在 http://{host}:{port}")
    socketio.run(app, host=host, port=port, debug=config['app']['debug'])