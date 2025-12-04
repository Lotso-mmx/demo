document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginSubtitle = document.getElementById('login-subtitle');
    
    // 登录表单
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    
    // 注册表单
    const regUsername = document.getElementById('reg-username');
    const regPassword = document.getElementById('reg-password');
    const regNickname = document.getElementById('reg-nickname');
    const registerBtn = document.getElementById('register-btn');
    
    // 切换按钮
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    
    // 切换到注册表单
    showRegister.addEventListener('click', function(e) {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        loginSubtitle.textContent = '创建您的账号';
    });
    
    // 切换到登录表单
    showLogin.addEventListener('click', function(e) {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        loginSubtitle.textContent = '请登录或注册账号';
    });
    
    // 注册功能
    async function handleRegister() {
        const username = regUsername.value.trim();
        const password = regPassword.value.trim();
        const nickname = regNickname.value.trim();
        
        // 验证输入
        if (!username || !password || !nickname) {
            alert('请填写所有必填项');
            return;
        }
        
        if (username.length < 3) {
            alert('用户名至少3个字符');
            return;
        }
        
        if (password.length < 6) {
            alert('密码至少6个字符');
            return;
        }
        
        registerBtn.disabled = true;
        registerBtn.textContent = '注册中...';
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username, password, nickname })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('注册成功！请登录');
                // 切换到登录表单并自动填充用户名
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
                loginSubtitle.textContent = '请登录或注册账号';
                loginUsername.value = username;
                loginPassword.focus();
                // 清空注册表单
                regUsername.value = '';
                regPassword.value = '';
                regNickname.value = '';
            } else {
                alert('注册失败：' + result.message);
            }
        } catch (error) {
            console.error('注册错误:', error);
            alert('注册失败，请稍后再试');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = '注册';
        }
    }
    
    // 登录功能
    async function handleLogin() {
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();
        
        if (!username || !password) {
            alert('请输入用户名和密码');
            return;
        }
        
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 保存用户信息到localStorage
                localStorage.setItem('chat_username', result.user.username);
                localStorage.setItem('chat_nickname', result.user.nickname);
                localStorage.setItem('chat_user', JSON.stringify(result.user));
                
                // 跳转到聊天室
                window.location.href = '/chat';
            } else {
                alert('登录失败：' + result.message);
            }
        } catch (error) {
            console.error('登录错误:', error);
            alert('登录失败，请稍后再试');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = '登录';
        }
    }
    
    // 事件监听
    registerBtn.addEventListener('click', handleRegister);
    loginBtn.addEventListener('click', handleLogin);
    
    // 回车键提交
    loginPassword.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    
    regNickname.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleRegister();
    });
});