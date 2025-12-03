import requests
from typing import Optional, Dict
import json

class NewsHandler:
    def __init__(self):
        # ALAPI 每日早报接口
        self.news_api_url = 'https://v2.alapi.cn/api/zaobao'
        self.api_token = 'ubsihtf1qt3vg5f8juy2jxgvgeh5ij'
    
    def get_daily_news(self) -> Optional[Dict]:
        """
        获取每天60s新闻（ALAPI每日早报）
        """
        try:
            print(f"请求ALAPI每日早报: {self.news_api_url}")
            
            # 请求参数
            params = {
                'token': self.api_token,
                'format': 'json'
            }
            
            # 添加请求头
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            # 发送请求
            response = requests.post(self.news_api_url, data=params, headers=headers, timeout=10)
            print(f"新闻API响应状态: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"新闻API响应数据: {data}")
                
                # 检查API返回状态
                if data.get('code') == 200 and data.get('data'):
                    news_data = data['data']
                    
                    # ALAPI返回的数据包含图片URL和新闻列表
                    result = {
                        'type': 'image',
                        'url': news_data.get('image', ''),  # 新闻图片URL
                        'title': '每天60秒读懂世界',
                        'date': self._get_today_date(),
                        'news_list': news_data.get('news', []),  # 15条新闻列表
                        'weiyu': news_data.get('weiyu', '')  # 每日微语
                    }
                    print(f"成功获取新闻: 图片={result['url']}, 新闻条数={len(result['news_list'])}")
                    return result
                else:
                    error_msg = data.get('msg', '未知错误')
                    print(f"ALAPI返回错误: {error_msg}")
                    return None
            else:
                print(f"新闻API请求失败: {response.status_code}")
                print(f"响应内容: {response.text}")
                return None
                
        except Exception as e:
            print(f"获取新闻信息错误: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _get_today_date(self) -> str:
        """获取今天的日期"""
        from datetime import datetime
        return datetime.now().strftime('%Y年%m月%d日')
    
    def handle_news_command(self, message: str) -> Optional[Dict]:
        """
        处理@每天60s命令
        """
        if message.startswith('@每天60s') or message.startswith('@每天60秒'):
            return self.get_daily_news()
        return None

# 创建全局实例
news_handler = NewsHandler()
