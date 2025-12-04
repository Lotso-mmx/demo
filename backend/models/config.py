import json
import os
from typing import Dict, List, Any

class ConfigManager:
    def __init__(self, config_path='config/config.json'):
        """初始化配置管理器"""
        self.config_path = config_path
        self.config = {}
        self.init_config()
    
    def init_config(self):
        """初始化配置文件，如果不存在则创建默认配置"""
        # 确保配置目录存在
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        
        if os.path.exists(self.config_path):
            # 加载现有配置
            self.load_config()
            print(f"配置文件已加载: {self.config_path}")
        else:
            # 创建默认配置
            self.create_default_config()
            print(f"默认配置文件已创建: {self.config_path}")
    
    def create_default_config(self):
        """创建默认配置文件"""
        default_config = {
            "app": {
                "secret_key": "your-secret-key-here-change-it"
            },
            "servers": [
                {
                    "name": "本地服务器",
                    "url": "http://localhost:5000"
                },
                {
                    "name": "局域网服务器",
                    "url": "http://192.168.1.100:5000"
                }
            ],
            "apis": {
                "weather": {
                    "provider": "wttr.in",
                    "wttr_url": "https://wttr.in",
                    "qweather_key": "",
                    "qweather_url": "https://devapi.qweather.com/v7"
                },
                "news": {
                    "provider": "alapi",
                    "alapi_token": "ubsihtf1qt3vg5f8juy2jxgvgeh5ij",
                    "alapi_url": "https://v2.alapi.cn/api"
                },
                "music": {
                    "provider": "alapi",
                    "alapi_token": "ubsihtf1qt3vg5f8juy2jxgvgeh5ij",
                    "alapi_search_url": "https://v2.alapi.cn/api/music/search",
                    "alapi_url_api": "https://v2.alapi.cn/api/music/url",
                    "player_url": "https://v3.alapi.cn/api/music/url"
                },
                "ai": {
                    "provider": "siliconflow",
                    "api_key": "sk-curqupvhfgebshadtwltojqmuhaxlkxmfqgpcptxxazpqqgb",
                    "base_url": "https://api.siliconflow.cn/v1/",
                    "model": "Qwen/Qwen2.5-7B-Instruct"
                }
            },
            "themes": {
                "weather_backgrounds": {
                    "sunny": "weather-sunny",
                    "cloudy": "weather-cloudy",
                    "rainy": "weather-rainy",
                    "snowy": "weather-snowy"
                }
            },
            "features": {
                "enable_music": True,
                "enable_weather": True,
                "enable_news": True,
                "enable_ai": True,
                "enable_movie": True
            }
        }
        
        self.config = default_config
        self.save_config()
    
    def load_config(self):
        """从文件加载配置"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        except Exception as e:
            print(f"加载配置文件失败: {e}")
            print("使用默认配置")
            self.create_default_config()
    
    def save_config(self):
        """保存配置到文件"""
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=4)
            print(f"配置已保存: {self.config_path}")
            return True
        except Exception as e:
            print(f"保存配置文件失败: {e}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """获取配置项（支持点号分隔的路径）"""
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key: str, value: Any) -> bool:
        """设置配置项（支持点号分隔的路径）"""
        keys = key.split('.')
        config = self.config
        
        # 遍历到倒数第二层
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        
        # 设置最后一层的值
        config[keys[-1]] = value
        return self.save_config()
    
    def get_servers(self) -> List[Dict]:
        """获取服务器列表"""
        return self.get('servers', [])
    
    def add_server(self, name: str, url: str) -> bool:
        """添加服务器"""
        servers = self.get_servers()
        servers.append({"name": name, "url": url})
        return self.set('servers', servers)
    
    def get_api_config(self, api_name: str) -> Dict:
        """获取API配置"""
        return self.get(f'apis.{api_name}', {})
    
    def update_api_config(self, api_name: str, config: Dict) -> bool:
        """更新API配置"""
        return self.set(f'apis.{api_name}', config)
    
    def is_feature_enabled(self, feature: str) -> bool:
        """检查功能是否启用"""
        return self.get(f'features.enable_{feature}', False)
    
    def get_weather_theme(self, weather: str) -> str:
        """获取天气对应的主题样式"""
        themes = self.get('themes.weather_backgrounds', {})
        return themes.get(weather.lower(), 'weather-sunny')

# 创建全局实例
config_manager = ConfigManager()
