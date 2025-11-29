document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const serverSelect = document.getElementById('server');
    const loginBtn = document.getElementById('login-btn');
    const usernameHint = document.getElementById('username-hint');
    let socket = null;
    let selectedServer = null;

    // 加载服务器列表
    function loadServers() {
        fetch('/api/servers')
            .then(response => response.json())
            .then(servers => {
                serverSelect.innerHTML = '';
                servers.forEach(server => {
                    const option = document.createElement('option');
                    option.value = JSON.stringify(server);
                    option.textContent = server.name;
                    serverSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('加载服务器列表失败:', error);
                serverSelect.innerHTML = '<option value="">加载服务器列表失败</option>';
            });
    }

    // 验证用户名
    function validateUsername(username) {
        if (!username || username.trim().length === 0) {
            usernameHint.textContent = '请输入昵称';
            usernameHint.style.visibility = 'visible';
            return false;
        }
        if (username.length > 20) {
            usernameHint.textContent = '昵称长度不能超过20个字符';
            usernameHint.style.visibility = 'visible';
            return false;
        }
        usernameHint.style.visibility = 'hidden';
        return true;
    }

    // 检查用户名是否可用
    function checkUsernameAvailability(username) {
        return fetch('/api/check_username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: username })
        })
        .then(response => response.json())
        .then(data => data.available);
    }

    // 处理登录
    async function handleLogin() {
        const username = usernameInput.value.trim();
        const serverOption = serverSelect.value;

        // 验证输入
        if (!validateUsername(username)) return;
        if (!serverOption) {
            alert('请选择服务器');
            return;
        }

        // 解析服务器信息
        selectedServer = JSON.parse(serverOption);

        // 检查用户名可用性
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';

        try {
            const isAvailable = await checkUsernameAvailability(username);
            if (!isAvailable) {
                usernameHint.textContent = '该昵称已被使用';
                usernameHint.style.visibility = 'visible';
                return;
            }

            // 保存用户信息到localStorage
            localStorage.setItem('chat_username', username);
            localStorage.setItem('chat_server', serverOption);

            // 跳转页面
            window.location.href = '/chat';
        } catch (error) {
            console.error('登录失败:', error);
            alert('登录失败，请稍后重试');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = '登录';
        }
    }

    // 事件监听
    usernameInput.addEventListener('input', function() {
        validateUsername(this.value);
    });

    loginBtn.addEventListener('click', handleLogin);

    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });

    // 初始化
    loadServers();

    // 检查是否已经登录过
    const savedUsername = localStorage.getItem('chat_username');
    const savedServer = localStorage.getItem('chat_server');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        if (savedServer) {
            serverSelect.value = savedServer;
        }
    }
});