document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userList = document.getElementById('user-list');
    const onlineCount = document.getElementById('online-count');
    const toggleEmojiBtn = document.getElementById('toggle-emoji');
    const emojiPanel = document.getElementById('emoji-panel');

    // 从localStorage获取用户信息
    const username = localStorage.getItem('chat_username');
    const serverStr = localStorage.getItem('chat_server');

    // 检查是否已登录
    if (!username || !serverStr) {
        window.location.href = '/';
        return;
    }

    // 解析服务器信息
    const server = JSON.parse(serverStr);

    // 创建WebSocket连接
    let socket = io();
    let connected = false;

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
            messageContent.innerHTML = `<strong>分享了电影：</strong><br>${data.additional_data?.url || data.message}`;
            // 这里可以添加电影播放器的初始化代码
            const movieContainer = document.createElement('div');
            movieContainer.className = 'movie-container';
            movieContainer.innerHTML = `<div class="movie-placeholder">电影播放器将在这里显示</div>`;
            messageContent.appendChild(movieContainer);
        } else if (data.type === 'ai_chat') {
            messageContent.textContent = data.message;
            // 模拟AI回复
            setTimeout(() => {
                addAIMessage('川农', '您好！我是AI助手川农，很高兴为您服务。');
            }, 1000);
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

    // 添加AI消息
    function addAIMessage(sender, content) {
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'ai-message';
        
        const header = document.createElement('div');
        header.className = 'message-header';
        header.innerHTML = `<span class="message-username">${sender}</span>`;
        
        const contentDiv = document.createElement('div');
        contentDiv.textContent = content;
        
        aiMessageDiv.appendChild(header);
        aiMessageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(aiMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
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

        const data = {
            username: username,
            message: message,
            timestamp: new Date().toISOString()
        };

        // 发送消息
        socket.emit('send_message', data);
        
        // 清空输入框
        messageInput.value = '';
    }

    // 处理退出登录
    function handleLogout() {
        if (socket) {
            socket.disconnect();
        }
        localStorage.removeItem('chat_username');
        localStorage.removeItem('chat_server');
        window.location.href = '/';
    }

    // 检查用户是否登录
    function checkLogin() {
        if (!connected) {
            // 发送登录信息
            socket.emit('login', { username: username });
        }
    }

    // 事件监听 - Socket.IO
    socket.on('connect', function() {
        console.log('连接成功');
        connected = true;
        checkLogin();
    });

    socket.on('disconnect', function() {
        console.log('连接断开');
        connected = false;
    });

    socket.on('login_success', function(data) {
        console.log('登录成功');
        updateUserList(data.online_users);
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

    // 事件监听 - DOM
    sendBtn.addEventListener('click', sendMessage);

    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    logoutBtn.addEventListener('click', handleLogout);

    toggleEmojiBtn.addEventListener('click', function() {
        emojiPanel.classList.toggle('active');
    });

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