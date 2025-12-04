document.addEventListener('DOMContentLoaded', function() {
    // 默认封面图片 - 使用可访问的占位图
    const DEFAULT_COVER = 'https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg';
    
    // 获取DOM元素
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userList = document.getElementById('user-list');
    const onlineCount = document.getElementById('online-count');
    const toggleEmojiBtn = document.getElementById('toggle-emoji');
    const emojiPanel = document.getElementById('emoji-panel');
    
    // 添加调试信息，显示DOM元素是否正确获取
    console.log('DOM元素获取结果:');
    console.log('chatMessages:', chatMessages);
    console.log('messageInput:', messageInput);
    console.log('sendBtn:', sendBtn);
    console.log('logoutBtn:', logoutBtn);
    console.log('userList:', userList);
    console.log('onlineCount:', onlineCount);
    console.log('toggleEmojiBtn:', toggleEmojiBtn);
    console.log('emojiPanel:', emojiPanel);

    // 从localStorage获取用户信息
    const username = localStorage.getItem('chat_username');

    // 检查是否已登录
    if (!username) {
        console.log('未登录，跳转到登录页');
        window.location.href = '/';
        return;
    }
    
    console.log('当前登录用户:', username);

    // 创建WebSocket连接
    let socket = io(window.location.origin, {
        transports: ['polling', 'websocket'],
        timeout: 5000
    });
    let connected = false;
    
    // 添加调试信息，显示socket连接状态
    console.log('Socket初始化状态:', socket);
    socket.on('connect_error', function(error) {
        console.error('连接错误:', error);
    });
    socket.on('connect_timeout', function() {
        console.error('连接超时');
    });

    // 常用emoji列表
    const commonEmojis = [
        '😊', '😂', '😍', '🤔', '😎', '😢', '😡', '👍', '👎', '❤️',
        '🎉', '🔥', '🤣', '🙄', '😱', '🤗', '😴', '🤩', '😘', '🙏',
        '👋', '🎉', '🎂', '🎁', '🎈', '🎯', '🎲', '🎮', '🎸', '🎵',
        '🎤', '🎧', '🎨', '🍕', '🍔', '🍟', '🍿', '🥤', '🍺', '🍷',
        '☕', '🍵', '🥗', '🍰', '🍦', '🌮', '🌯', '🍜', '🍝', '🍣'
    ];

    // 初始化emoji面板
    function initEmojiPanel() {
        emojiPanel.innerHTML = '';
        commonEmojis.forEach(emoji => {
            const emojiItem = document.createElement('div');
            emojiItem.className = 'emoji-item';
            emojiItem.textContent = emoji;
            emojiItem.addEventListener('click', function() {
                messageInput.value += emoji;
                messageInput.focus();
            });
            emojiPanel.appendChild(emojiItem);
        });
    }

    // 格式化时间
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // 添加消息到聊天区域
    function addMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-item ${data.username === username ? 'own' : 'other'}`;

        // 创建消息头部
        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';
        
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'message-username';
        usernameSpan.textContent = data.username;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = data.timestamp ? formatTime(new Date(data.timestamp)) : formatTime(new Date());
        
        messageHeader.appendChild(usernameSpan);
        messageHeader.appendChild(timeSpan);

        // 创建消息内容
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // 根据消息类型处理
        if (data.type === 'movie') {
            const originalUrl = data.additional_data?.url || '';
            messageContent.innerHTML = `<strong>分享了电影：</strong><br>${originalUrl}`;
            
            // 创建电影播放器iframe
            const movieContainer = document.createElement('div');
            movieContainer.className = 'movie-container';
            
            if (originalUrl) {
                // 验证URL格式
                let urlToParse = originalUrl;
                if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
                    urlToParse = 'https://' + urlToParse;
                }
                
                // 生成解析URL
                const parsedUrl = `https://jx.m3u8.tv/jiexi/?url=${encodeURIComponent(urlToParse)}`;
                
                // 添加加载状态
                movieContainer.innerHTML = `<div class="movie-loading">正在加载电影播放器...</div>`;
                
                // 创建iframe
                const iframe = document.createElement('iframe');
                iframe.src = parsedUrl;
                iframe.width = '400';
                iframe.height = '400';
                iframe.style.border = 'none';
                iframe.style.borderRadius = '8px';
                iframe.style.boxShadow = '0 2px 8px rgba(156, 39, 176, 0.3)';
                iframe.title = '电影播放';
                
                // 监听iframe加载完成，移除加载状态
                iframe.onload = function() {
                    const loadingElement = movieContainer.querySelector('.movie-loading');
                    if (loadingElement) {
                        loadingElement.remove();
                    }
                };
                
                // 监听iframe加载错误
                iframe.onerror = function() {
                    movieContainer.innerHTML = `<div class="movie-error">电影播放器加载失败，请检查链接是否有效</div>`;
                };
                
                movieContainer.appendChild(iframe);
            } else {
                movieContainer.innerHTML = `<div class="movie-placeholder">无效的电影链接</div>`;
            }
            
            messageContent.appendChild(movieContainer);
        } else if (data.type === 'ai_chat') {
            messageContent.textContent = data.message;
            
            // 组装并添加用户消息
            messageDiv.appendChild(messageHeader);
            messageDiv.appendChild(messageContent);
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // 准备接收AI响应
            const messageId = `ai-${Date.now()}`;
            // 添加正在思考的状态
            const thinkingMessage = document.createElement('div');
            thinkingMessage.id = `ai-message-${messageId}`;
            thinkingMessage.className = 'ai-message thinking';
            thinkingMessage.innerHTML = `
                <div class="message-header"><span class="message-username">川小农</span></div>
                <div class="message-content"><span class="thinking-dots">正在思考...</span></div>
            `;
            chatMessages.appendChild(thinkingMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // 存储当前AI消息ID，用于流式更新
            window.currentAIMessageId = messageId;
            
            // 阻止后续的消息添加逻辑
            return;
        } else if (data.type === 'mention') {
            messageContent.className = 'message-content mention';
            // 高亮@用户部分
            let formattedMessage = data.message.replace(/@(\w+)/g, '<span style="color: #fbbf24;">@$1</span>');
            messageContent.innerHTML = formattedMessage;
        } else {
            // 处理普通消息，保留换行
            messageContent.textContent = data.message;
        }

        // 组装消息元素
        messageDiv.appendChild(messageHeader);
        messageDiv.appendChild(messageContent);

        // 添加到聊天区域
        chatMessages.appendChild(messageDiv);
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 添加AI消息，支持流式更新
    function addAIMessage(sender, content, isStreaming = false, messageId = null) {
        let aiMessageDiv;
        
        // 如果是流式更新，查找现有的AI消息元素
        if (isStreaming && messageId) {
            aiMessageDiv = document.getElementById(`ai-message-${messageId}`);
            if (!aiMessageDiv) return;
            
            // 更新内容
            const contentDiv = aiMessageDiv.querySelector('.message-content');
            if (contentDiv) {
                contentDiv.textContent = content;
            }
        } else {
            // 创建新的AI消息元素
            const messageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            aiMessageDiv = document.createElement('div');
            aiMessageDiv.id = `ai-message-${messageId}`;
            aiMessageDiv.className = 'ai-message';
            
            const header = document.createElement('div');
            header.className = 'message-header';
            header.innerHTML = `<span class="message-username">${sender}</span>`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;
            
            aiMessageDiv.appendChild(header);
            aiMessageDiv.appendChild(contentDiv);
            
            chatMessages.appendChild(aiMessageDiv);
        }
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageId;
    }

    // 更新在线用户列表
    function updateUserList(users) {
        userList.innerHTML = '';
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            // 创建头像（使用用户名首字母）
            const initial = user.charAt(0).toUpperCase();
            userItem.innerHTML = `
                <div class="user-avatar">${initial}</div>
                <div class="user-info">
                    <div class="user-name">${user}</div>
                    <div class="user-status">在线</div>
                </div>
            `;
            
            userList.appendChild(userItem);
        });
        
        // 更新在线人数
        onlineCount.textContent = `${users.length} 人在线`;
    }

    // 发送消息
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // 检查socket连接状态
        if (!socket.connected) {
            console.error('无法发送消息：Socket连接已断开');
            alert('无法发送消息：网络连接已断开，请刷新页面重试');
            return;
        }

        const timestamp = Date.now();
        const data = {
            username: username,
            message: message,
            timestamp: timestamp
        };

        // 添加调试信息
        console.log('尝试发送消息...');
        console.log('当前socket连接状态:', socket.connected);
        console.log('socket ID:', socket.id);
        console.log('准备发送的消息数据:', data);
        
        // 发送消息
        try {
            // 添加回调函数以获取服务器确认
            socket.emit('send_message', data, function(response) {
                console.log('服务器对send_message的响应:', response);
            });
            console.log('消息已发送到服务器');
            messageInput.value = '';
        } catch (error) {
            console.error('发送消息时发生错误:', error);
            console.error('错误详情:', error.stack);
            alert('发送消息时发生错误: ' + error.message);
        }
    }

    // 处理退出登录
    function handleLogout() {
        if (socket) {
            socket.disconnect();
        }
        // 清除所有用户相关的localStorage
        localStorage.removeItem('chat_username');
        localStorage.removeItem('chat_nickname');
        localStorage.removeItem('chat_user');
        localStorage.removeItem('chat_server');
        window.location.href = '/';
    }

    // 检查用户是否登录
    function checkLogin() {
        console.log('检查登录状态: connected=' + connected + ', username=' + username);
        if (!connected) {
            console.log('尚未连接，等待连接后再登录');
            return;
        }
        // 发送登录信息
        console.log('发送登录信息:', { username: username });
        socket.emit('login', { username: username });
    }

    // 事件监听 - Socket.IO
    socket.on('connect', function() {
        console.log('连接成功');
        connected = true;
        checkLogin();
    });
    
    socket.on('login_success', function(data) {
        console.log('登录成功:', data);
        updateUserList(data.online_users);
    });
    
    socket.on('login_failed', function(data) {
        console.error('登录失败:', data);
        alert('登录失败: ' + data.message);
        window.location.href = '/';
    });
    
    // 监听系统消息（上线/下线通知）
    socket.on('system_message', function(data) {
        console.log('收到系统消息:', data);
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = data.message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    // 添加调试信息，监听消息发送成功的确认
    socket.on('message_sent', function(data) {
        console.log('消息发送确认:', data);
    });
    
    // 添加调试信息，监听任何可能的错误
    socket.on('error', function(error) {
        console.error('Socket错误:', error);
    });
    
    // 添加调试信息，监听消息发送事件的响应
    socket.on('send_message_response', function(data) {
        console.log('消息发送响应:', data);
    });

    // 监听消息发送确认事件
    socket.on('message_sent', function(data) {
        console.log('消息发送成功确认:', data);
    });

    socket.on('disconnect', function() {
        console.log('连接断开');
        connected = false;
    });

    socket.on('login_success', function(data) {
        console.log('登录成功');
        updateUserList(data.online_users);
    });

    socket.on('history_messages', function(messages) {
        console.log('收到历史消息:', messages.length);
        // 清空聊天区域，只保留欢迎信息
        const welcomeMessages = chatMessages.querySelectorAll('.welcome-message');
        chatMessages.innerHTML = '';
        // 重新添加欢迎信息
        welcomeMessages.forEach(msg => {
            chatMessages.appendChild(msg);
        });
        // 显示历史消息
        messages.forEach(message => {
            addMessage(message);
        });
    });

    socket.on('login_failed', function(data) {
        alert('登录失败: ' + data.message);
        window.location.href = '/';
    });

    socket.on('new_message', function(data) {
        addMessage(data);
    });

    socket.on('user_joined', function(data) {
        updateUserList(data.online_users);
        // 添加系统消息
        const systemMessage = document.createElement('div');
        systemMessage.className = 'welcome-message';
        systemMessage.innerHTML = `<p>${data.username} 加入了聊天室</p>`;
        chatMessages.appendChild(systemMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    socket.on('user_left', function(data) {
        updateUserList(data.online_users);
        // 添加系统消息
        const systemMessage = document.createElement('div');
        systemMessage.className = 'welcome-message';
        systemMessage.innerHTML = `<p>${data.username} 离开了聊天室</p>`;
        chatMessages.appendChild(systemMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    // 监听AI响应流
    socket.on('ai_response_chunk', function(data) {
        const sender = data.sender || '川小农';
        const fullResponse = data.full_response || '';
        
        // 获取当前AI消息ID
        const messageId = window.currentAIMessageId;
        if (messageId) {
            // 查找现有的AI消息元素
            const aiMessageDiv = document.getElementById(`ai-message-${messageId}`);
            if (aiMessageDiv) {
                // 移除正在思考的状态
                aiMessageDiv.classList.remove('thinking');
                
                // 更新内容
                const contentDiv = aiMessageDiv.querySelector('.message-content');
                if (contentDiv) {
                    // 使用textContent确保没有HTML标签被解析
                    contentDiv.textContent = fullResponse;
                }
            }
        }
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    // 监听天气卡片
    socket.on('weather_card', function(data) {
        console.log('收到天气数据:', data);
        
        // 根据天气类型选择图标
        let weatherIcon = '☀️'; // 默认晴天
        if (data.bgClass === 'sunny') {
            weatherIcon = '☀️';
        } else if (data.bgClass === 'cloudy') {
            weatherIcon = '☁️';
        } else if (data.bgClass === 'rainy') {
            weatherIcon = '🌧️';
        } else if (data.bgClass === 'snowy') {
            weatherIcon = '❄️';
        }
        
        // 创建天气卡片
        const weatherCard = document.createElement('div');
        weatherCard.className = 'weather-card';
        weatherCard.innerHTML = `
            <div class="weather-card-header">
                <span class="weather-icon">${weatherIcon}</span>
                <span class="weather-city">${data.city}</span>
            </div>
            <div class="weather-card-body">
                <div class="weather-temp">${data.temp}°C</div>
                <div class="weather-text">${data.text}</div>
                <div class="weather-details">
                    <div class="weather-detail-item">
                        <span class="detail-label">💧 湿度</span>
                        <span class="detail-value">${data.humidity}%</span>
                    </div>
                    <div class="weather-detail-item">
                        <span class="detail-label">💨 风速</span>
                        <span class="detail-value">${data.wind}</span>
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(weatherCard);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 切换聊天室背景
        changeWeatherBackground(data.bgClass);
        
        // 显示背景切换提示
        showWeatherNotification(data.text, data.bgClass);
    });
    
    // 监听天气错误
    socket.on('weather_error', function(data) {
        console.log('天气查询错误:', data);
        alert(data.message);
    });
    
    // 监听新闻卡片
    socket.on('news_card', function(data) {
        console.log('收到新闻数据:', data);
        
        // 创建新闻卡片
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';
        
        if (data.type === 'image') {
            // 图片类型新闻
            newsCard.innerHTML = `
                <div class="news-card-header">
                    <span class="news-icon">📰</span>
                    <div class="news-title-info">
                        <h3 class="news-title">${data.title}</h3>
                        <span class="news-date">${data.date}</span>
                    </div>
                </div>
                <div class="news-card-body">
                    <img src="${data.url}" alt="每天60秒新闻" class="news-image" />
                    <div class="news-description">
                        <p>点击图片查看大图</p>
                    </div>
                </div>
            `;
            
            // 添加图片点击放大功能
            const newsImage = newsCard.querySelector('.news-image');
            newsImage.addEventListener('click', function() {
                window.open(data.url, '_blank');
            });
        } else {
            // JSON类型新闻（备用）
            newsCard.innerHTML = `
                <div class="news-card-header">
                    <span class="news-icon">📰</span>
                    <div class="news-title-info">
                        <h3 class="news-title">${data.title}</h3>
                        <span class="news-date">${data.date}</span>
                    </div>
                </div>
                <div class="news-card-body">
                    <p>新闻内容加载成功</p>
                </div>
            `;
        }
        
        chatMessages.appendChild(newsCard);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    // 监听新闻错误
    socket.on('news_error', function(data) {
        console.log('新闻查询错误:', data);
        alert(data.message);
    });
    
    // 全局音乐播放器
    let currentAudio = null;
    let currentMusicId = null;
    
    // 监听音乐卡片
    socket.on('music_card', function(data) {
        console.log('收到音乐数据:', data);
        
        // 创建音乐卡片
        const musicCard = document.createElement('div');
        musicCard.className = 'music-card';
        musicCard.setAttribute('data-music-id', data.id);
        
        // 构造播放器URL
        const apiKey = 'f2bb172fe78e0ecf5846468e4ddd4686';
        const playerUrl = `https://api.oick.cn/api/wyy?id=${data.id}&apikey=${apiKey}`;
        
        musicCard.innerHTML = `
            <div class="music-card-info">
                <h3 class="music-name">${data.name}</h3>
                <p class="music-artist">${data.artist}</p>
            </div>
            <iframe src="${playerUrl}" 
                    style="width:100%; height:66px; border:none; border-radius:8px; margin-top:10px;"
                    frameborder="0" 
                    allow="autoplay">
            </iframe>
        `;
        
        chatMessages.appendChild(musicCard);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    // 格式化时间
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // 监听音乐错误
    socket.on('music_error', function(data) {
        console.log('音乐搜索错误:', data);
        alert(data.message);
    });
    
    // 切换天气背景函数
    function changeWeatherBackground(bgClass) {
        const body = document.querySelector('.chat-body');
        
        if (!body) {
            console.error('找不到.chat-body元素');
            return;
        }
        
        // 移除所有天气背景类
        body.classList.remove('weather-sunny', 'weather-cloudy', 'weather-rainy', 'weather-snowy');
        
        // 添加新的天气背景类
        if (bgClass) {
            const weatherClass = `weather-${bgClass}`;
            body.classList.add(weatherClass);
            console.log(`已切换背景为: ${weatherClass}`);
            console.log(`当前body的class: ${body.className}`);
        }
    }
    
    // 显示天气通知
    function showWeatherNotification(weatherText, bgClass) {
        const notification = document.createElement('div');
        notification.className = 'weather-notification';
        notification.textContent = `背景已切换为: ${weatherText}`;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(156, 39, 176, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: slideInRight 0.5s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动消失
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    // 事件监听 - DOM
    try {
        console.log('添加事件监听器...');
        sendBtn.addEventListener('click', function() {
            console.log('发送按钮被点击');
            sendMessage();
        });
        console.log('发送按钮事件监听器添加成功');

        messageInput.addEventListener('keypress', function(e) {
            console.log('键盘按键:', e.key);
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                console.log('Enter键被按下，调用sendMessage');
                sendMessage();
            }
        });
        console.log('消息输入框事件监听器添加成功');

        logoutBtn.addEventListener('click', handleLogout);
        console.log('退出按钮事件监听器添加成功');

        toggleEmojiBtn.addEventListener('click', function() {
            console.log('表情按钮被点击');
            emojiPanel.classList.toggle('active');
        });
        console.log('表情按钮事件监听器添加成功');
    } catch (error) {
        console.error('添加事件监听器时发生错误:', error);
    }

    // 点击其他地方关闭emoji面板
    document.addEventListener('click', function(e) {
        if (!toggleEmojiBtn.contains(e.target) && !emojiPanel.contains(e.target)) {
            emojiPanel.classList.remove('active');
        }
    });

    // 初始化
    initEmojiPanel();
    checkLogin();

    // 页面卸载时断开连接
    window.addEventListener('beforeunload', function() {
        if (socket) {
            socket.disconnect();
        }
    });
});