import sqlite3
import bcrypt
from typing import Optional, Dict
import os

class UserModel:
    def __init__(self, db_path='db/users.db'):
        """初始化用户模型"""
        self.db_path = db_path
        # 确保数据库目录存在
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.init_db()
    
    def init_db(self):
        """初始化数据库表"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 创建用户表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                nickname TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_login TEXT,
                status TEXT DEFAULT 'offline'
            )
        ''')
        
        conn.commit()
        conn.close()
        print(f"数据库初始化完成: {self.db_path}")
    
    def register(self, username: str, password: str, nickname: str) -> Dict:
        """
        注册新用户
        返回: {'success': bool, 'message': str, 'user': dict}
        """
        try:
            # 验证输入
            if not username or not password or not nickname:
                return {'success': False, 'message': '用户名、密码和昵称不能为空'}
            
            if len(username) < 3:
                return {'success': False, 'message': '用户名至少3个字符'}
            
            if len(password) < 6:
                return {'success': False, 'message': '密码至少6个字符'}
            
            # 检查用户名是否已存在
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
            if cursor.fetchone():
                conn.close()
                return {'success': False, 'message': '用户名已存在'}
            
            # 密码加密
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            # 插入新用户
            cursor.execute(
                'INSERT INTO users (username, password_hash, nickname, status) VALUES (?, ?, ?, ?)',
                (username, password_hash, nickname, 'offline')
            )
            
            user_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            print(f"用户注册成功: {username} (昵称: {nickname})")
            
            return {
                'success': True,
                'message': '注册成功',
                'user': {
                    'id': user_id,
                    'username': username,
                    'nickname': nickname,
                    'status': 'offline'
                }
            }
            
        except Exception as e:
            print(f"注册失败: {e}")
            return {'success': False, 'message': f'注册失败: {str(e)}'}
    
    def login(self, username: str, password: str) -> Dict:
        """
        用户登录验证
        返回: {'success': bool, 'message': str, 'user': dict}
        """
        try:
            if not username or not password:
                return {'success': False, 'message': '用户名和密码不能为空'}
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 查询用户
            cursor.execute(
                'SELECT id, username, password_hash, nickname, status FROM users WHERE username = ?',
                (username,)
            )
            
            user_data = cursor.fetchone()
            
            if not user_data:
                conn.close()
                return {'success': False, 'message': '用户名或密码错误'}
            
            user_id, username, password_hash, nickname, status = user_data
            
            # 验证密码
            if not bcrypt.checkpw(password.encode('utf-8'), password_hash):
                conn.close()
                return {'success': False, 'message': '用户名或密码错误'}
            
            # 更新最后登录时间
            from datetime import datetime
            last_login = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute(
                'UPDATE users SET last_login = ? WHERE username = ?',
                (last_login, username)
            )
            
            conn.commit()
            conn.close()
            
            print(f"用户登录成功: {username} (昵称: {nickname})")
            
            return {
                'success': True,
                'message': '登录成功',
                'user': {
                    'id': user_id,
                    'username': username,
                    'nickname': nickname,
                    'status': status,
                    'last_login': last_login
                }
            }
            
        except Exception as e:
            print(f"登录失败: {e}")
            return {'success': False, 'message': f'登录失败: {str(e)}'}
    
    def update_status(self, username: str, status: str) -> bool:
        """
        更新用户在线状态
        status: 'online' 或 'offline'
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'UPDATE users SET status = ? WHERE username = ?',
                (status, username)
            )
            
            conn.commit()
            conn.close()
            
            print(f"用户状态更新: {username} -> {status}")
            return True
            
        except Exception as e:
            print(f"更新状态失败: {e}")
            return False
    
    def get_user(self, username: str) -> Optional[Dict]:
        """获取用户信息"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'SELECT id, username, nickname, status FROM users WHERE username = ?',
                (username,)
            )
            
            user_data = cursor.fetchone()
            conn.close()
            
            if user_data:
                return {
                    'id': user_data[0],
                    'username': user_data[1],
                    'nickname': user_data[2],
                    'status': user_data[3]
                }
            
            return None
            
        except Exception as e:
            print(f"获取用户信息失败: {e}")
            return None

# 创建全局实例
user_model = UserModel()
