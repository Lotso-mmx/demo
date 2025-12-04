import requests
import json
import os
from typing import Dict, Optional
from models.config import config_manager

class WeatherHandler:
    def __init__(self):
        # 使用配置管理器加载配置
        weather_config = config_manager.get_api_config('weather')
        self.api_key = weather_config.get('qweather_key', '')
        self.api_url = weather_config.get('qweather_url', 'https://devapi.qweather.com/v7') + '/weather/now'
        
        # 天气背景映射
        themes = config_manager.get('themes.weather_backgrounds', {})
        # 转换为反向映射（关键词 -> 背景类）
        self.weather_bg_map = {
            'sunny': ['晴', 'Sunny', 'Clear'],
            'cloudy': ['云', 'Cloudy', '阴', 'Overcast', '雾', 'Fog', '霞', 'Haze'],
            'rainy': ['雨', 'Rain', '雷', 'Thunder', '阵雨', 'Shower'],
            'snowy': ['雪', 'Snow']
        }
    
    def get_city_location(self, city: str) -> Optional[str]:
        """
        获取城市的location ID（和风天气支持中文城市名直接查询）
        这里直接返回城市名，和风天气API支持中文
        """
        return city
    
    def get_weather(self, city: str) -> Optional[Dict]:
        """
        调用天气API获取实时天气数据，使用多个API备用方案
        """
        # 尝试多个API源
        weather_data = None
        
        # 1. 优先尝试wttr.in API（免费无需密钥，更稳定）
        weather_data = self._try_wttr_api(city)
        if weather_data:
            return weather_data
        
        # 2. 如果wttr.in失败，尝试和风天气API
        weather_data = self._try_qweather_api(city)
        if weather_data:
            return weather_data
        
        # 3. 如果所有API都失败，返回None
        print("所有天气API请求失败")
        return None
    
    def _try_qweather_api(self, city: str) -> Optional[Dict]:
        """尝试使用和风天气API"""
        try:
            location = self.get_city_location(city)
            if not location:
                return None
            
            # 构建API请求
            params = {
                'location': location,
                'key': self.api_key
            }
            
            # 添加请求头
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            print(f"尝试和风天气API: {self.api_url}")
            
            # 发送请求
            response = requests.get(self.api_url, params=params, headers=headers, timeout=10)
            print(f"和风天气API响应状态: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # 棆查API返回状态
                if data.get('code') == '200':
                    weather_now = data.get('now', {})
                    
                    # 提取天气数据
                    weather_text = weather_now.get('text', '未知')
                    temp = weather_now.get('temp', 'N/A')
                    humidity = weather_now.get('humidity', 'N/A')
                    wind_dir = weather_now.get('windDir', '')
                    wind_scale = weather_now.get('windScale', '0')
                    wind_speed = weather_now.get('windSpeed', '0')
                    
                    # 根据天气状况映射背景类型
                    bg_class = self._get_background_class(weather_text)
                    
                    result = {
                        'city': city,
                        'temp': temp,
                        'text': weather_text,
                        'humidity': humidity,
                        'wind': f"{wind_dir} {wind_scale}级",
                        'wind_speed': wind_speed,
                        'bgClass': bg_class
                    }
                    
                    print(f"和风天气API成功: {result}")
                    return result
                else:
                    print(f"和风天气API错误: {data.get('code')}")
            else:
                print(f"和风天气HTTP错误: {response.status_code}")
                
        except Exception as e:
            print(f"和风天气API异常: {e}")
        
        return None
    
    def _try_wttr_api(self, city: str) -> Optional[Dict]:
        """尝试使用wttr.in API（免费无需密钥）"""
        try:
            url = f"https://wttr.in/{city}?format=j1"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            print(f"尝试wttr.in API: {url}")
            
            response = requests.get(url, headers=headers, timeout=10)
            print(f"wttr.in API响应状态: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                current_condition = data.get('current_condition', [{}])[0]
                
                # 提取天气数据
                temp = current_condition.get('temp_C', 'N/A')
                humidity = current_condition.get('humidity', 'N/A')
                weather_desc = current_condition.get('weatherDesc', [{}])[0].get('value', '未知')
                wind_dir = current_condition.get('winddir16Point', '')
                wind_speed_kmph = current_condition.get('windspeedKmph', '0')
                
                # 转换风速为风级
                wind_scale = self._convert_wind_speed_to_scale(wind_speed_kmph)
                
                # 根据天气状况映射背景类型
                bg_class = self._get_background_class(weather_desc)
                
                result = {
                    'city': city,
                    'temp': temp,
                    'text': weather_desc,
                    'humidity': humidity,
                    'wind': f"{wind_dir} {wind_scale}级",
                    'wind_speed': wind_speed_kmph,
                    'bgClass': bg_class
                }
                
                print(f"wttr.in API成功: {result}")
                return result
            else:
                print(f"wttr.in HTTP错误: {response.status_code}")
                
        except Exception as e:
            print(f"wttr.in API异常: {e}")
        
        return None
    
    def _convert_wind_speed_to_scale(self, wind_speed_kmph):
        """将风速（km/h）转换为风力等级"""
        try:
            speed = float(wind_speed_kmph)
            if speed < 1:
                return 0
            elif speed < 6:
                return 1
            elif speed < 12:
                return 2
            elif speed < 20:
                return 3
            elif speed < 29:
                return 4
            elif speed < 39:
                return 5
            elif speed < 50:
                return 6
            elif speed < 62:
                return 7
            elif speed < 75:
                return 8
            elif speed < 89:
                return 9
            elif speed < 103:
                return 10
            elif speed < 117:
                return 11
            else:
                return 12
        except (ValueError, TypeError):
            return 0
    
    def _get_background_class(self, weather_text: str) -> str:
        """
        根据天气文本返回对应的背景类名
        """
        # 遍历配置的天气背景映射
        for bg_class, keywords in self.weather_bg_map.items():
            for keyword in keywords:
                if keyword in weather_text:
                    return bg_class
        
        # 默认返回晴天背景
        return 'sunny'
    
    def handle_weather_command(self, message: str) -> Optional[Dict]:
        """
        处理@天气命令
        """
        if message.startswith('@天气'):
            parts = message.split(' ', 1)
            if len(parts) > 1:
                city = parts[1].strip()
                if city:
                    return self.get_weather(city)
        return None

# 创建全局实例
weather_handler = WeatherHandler()
