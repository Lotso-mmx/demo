import requests
from typing import Optional, Dict
import json

class MusicHandler:
    def __init__(self):
        # ALAPI 音乐接口
        self.music_search_url = 'https://v2.alapi.cn/api/music/search'
        self.music_url_api = 'https://v2.alapi.cn/api/music/url'
        self.api_token = 'ubsihtf1qt3vg5f8juy2jxgvgeh5ij'
    
    def _id_to_url(self, pic_id):
        """
        将picId转换为网易云CDN URL路径
        网易云封面URL格式: https://p[1-4].music.126.net/[enc_id]/[pic_id].jpg
        """
        # 直接使用picId，不需要复杂的加密
        return str(pic_id)
    
    def search_music(self, keyword: str, limit: int = 1) -> Optional[Dict]:
        """
        搜索音乐
        """
        try:
            print(f"搜索音乐: {keyword}")
            
            # 请求参数
            params = {
                'token': self.api_token,
                'keyword': keyword,
                'limit': limit
            }
            
            # 添加请求头
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            # 发送请求
            response = requests.post(self.music_search_url, data=params, headers=headers, timeout=10)
            print(f"搜索API响应状态: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"搜索API响应数据: {data}")
                
                # 检查API返回状态
                if data.get('code') == 200 and data.get('data'):
                    # ALAPI返回的数据结构: data.data.songs
                    songs = data['data'].get('songs', [])
                    if songs and len(songs) > 0:
                        music_info = songs[0]
                        return music_info
                    else:
                        print("未找到歌曲")
                        return None
                else:
                    error_msg = data.get('msg', '未知错误')
                    print(f"搜索音乐失败: {error_msg}")
                    return None
            else:
                print(f"搜索API请求失败: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"搜索音乐错误: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_music_url(self, music_id: str) -> Optional[str]:
        """
        获取音乐播放地址
        """
        try:
            print(f"获取音乐URL: music_id={music_id}")
            
            # 请求参数
            params = {
                'token': self.api_token,
                'id': music_id
            }
            
            # 添加请求头
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            # 发送请求
            response = requests.post(self.music_url_api, data=params, headers=headers, timeout=10)
            print(f"音乐URL API响应状态: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"音乐URL API响应: {data}")
                
                # 检查API返回状态
                if data.get('code') == 200 and data.get('data'):
                    music_url = data['data'].get('url', '')
                    print(f"获取到音乐URL: {music_url}")
                    return music_url
                else:
                    error_msg = data.get('msg', '未知错误')
                    print(f"获取音乐URL失败: {error_msg}")
                    return None
            else:
                print(f"音乐URL API请求失败: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"获取音乐URL错误: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def handle_music_command(self, message: str) -> Optional[Dict]:
        """
        处理@听音乐命令
        """
        try:
            if message.startswith('@听音乐'):
                # 解析歌名和歌手
                parts = message.replace('@听音乐', '').strip().split()
                if not parts:
                    return None
                
                keyword = ' '.join(parts)
                print(f"处理音乐命令: 关键词={keyword}")
                
                # 搜索音乐
                music_info = self.search_music(keyword)
                if not music_info:
                    return None
                
                # 获取音乐ID
                music_id = music_info.get('id', '')
                if not music_id:
                    print("未找到音乐ID")
                    return None
                
                # 直接返回歌曲ID，前端用iframe显示
                result = {
                    'id': music_id,
                    'name': music_info.get('name', '未知歌曲'),
                    'artist': ', '.join([a.get('name', '') for a in music_info.get('artists', [])]) or '未知歌手',
                }
                
                print(f"成功获取音乐信息: {result['name']} - {result['artist']}, ID: {music_id}")
                return result
            
            return None
            
        except Exception as e:
            print(f"处理音乐命令错误: {e}")
            import traceback
            traceback.print_exc()
            return None

# 创建全局实例
music_handler = MusicHandler()
