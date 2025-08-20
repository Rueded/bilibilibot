require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const http = require('http');

// 创建简单的HTTP服务器防止休眠
const server = http.createServer((req, res) => {
    const now = new Date().toISOString();
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    // 记录访问
    console.log(`🌐 收到HTTP请求: ${req.url} - ${now}`);
    
    res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*' 
    });
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>B站开播通知机器人</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .status { color: #28a745; font-weight: bold; }
            .info { margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 B站开播通知Discord机器人</h1>
            <div class="info">状态: <span class="status">运行中</span></div>
            <div class="info">启动时间: ${new Date(Date.now() - uptime * 1000).toLocaleString('zh-CN')}</div>
            <div class="info">运行时长: ${hours}小时 ${minutes}分钟</div>
            <div class="info">当前时间: ${new Date().toLocaleString('zh-CN')}</div>
            <div class="info">监控UP主数量: ${config.bilibiliUsers.length}</div>
            <div class="info">Discord连接: ${client.readyAt ? '正常' : '异常'}</div>
            <p>机器人正在正常运行，监控B站UP主的直播状态并发送Discord通知。</p>
        </div>
        <script>
            // 每30秒自动刷新页面状态
            setTimeout(() => location.reload(), 30000);
        </script>
    </body>
    </html>
    `;
    
    res.end(html);
});

// 启动HTTP服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🌐 HTTP服务器启动在端口 ${PORT}`);
});

// 自我ping防止休眠（每14分钟）
const keepAlive = () => {
    // 尝试多种方式获取URL
    let url = process.env.RENDER_EXTERNAL_URL;
    
    if (!url) {
        // 如果没有设置环境变量，尝试从Render自动生成
        const serviceName = process.env.RENDER_SERVICE_NAME || 'bilibilibot';
        url = `https://${serviceName}.onrender.com`;
    }
    
    console.log(`🔗 设置心跳URL: ${url}`);
    console.log(`📋 环境检查 - NODE_ENV: ${process.env.NODE_ENV}, RENDER_EXTERNAL_URL: ${process.env.RENDER_EXTERNAL_URL || '未设置'}`);
    
    // 立即发送第一次心跳测试
    axios.get(url, { timeout: 10000 })
        .then(() => console.log('✅ 初始心跳测试成功'))
        .catch(error => console.log(`⚠️ 初始心跳测试失败: ${error.message}`));
    
    // 设置定期心跳
    const heartbeatInterval = setInterval(async () => {
        try {
            console.log(`💓 发送心跳请求到: ${url}`);
            const response = await axios.get(url, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'BilibiliBot-KeepAlive/1.0'
                }
            });
            console.log(`✅ 心跳成功 - 状态码: ${response.status}, 时间: ${new Date().toISOString()}`);
        } catch (error) {
            console.log(`⚠️ 心跳失败: ${error.message}, 时间: ${new Date().toISOString()}`);
            // 心跳失败不影响程序运行
        }
    }, 14 * 60 * 1000); // 14分钟
    
    console.log('🔄 防休眠心跳已启用，间隔14分钟');
    return heartbeatInterval;
};

// 总是启用心跳功能（不管是生产环境还是开发环境）
const heartbeatInterval = keepAlive();

// 配置信息 - 使用环境变量保护敏感信息
const config = {
    token: process.env.DISCORD_TOKEN,
    channelId: process.env.CHANNEL_ID,
    bilibiliUsers: [
        {
            uid: process.env.BILIBILI_UID_1,
            name: process.env.BILIBILI_NAME_1 || 'UP主1',
            isRoomId: process.env.BILIBILI_UID_1_IS_ROOM === 'true' // 标记是否为直播间ID
        },
        {
            uid: process.env.BILIBILI_UID_2,
            name: process.env.BILIBILI_NAME_2 || 'UP主2',
            isRoomId: process.env.BILIBILI_UID_2_IS_ROOM === 'true'
        },
        {
            uid: process.env.BILIBILI_UID_3,
            name: process.env.BILIBILI_NAME_3 || 'UP主3',
            isRoomId: process.env.BILIBILI_UID_3_IS_ROOM === 'true' // 标记是否为直播间ID
        },
        {
            uid: process.env.BILIBILI_UID_4,
            name: process.env.BILIBILI_NAME_4 || 'UP主4',
            isRoomId: process.env.BILIBILI_UID_4_IS_ROOM === 'true' // 标记是否为直播间ID
        },
        {
            uid: process.env.BILIBILI_UID_5,
            name: process.env.BILIBILI_NAME_5 || 'UP主5',
            isRoomId: process.env.BILIBILI_UID_5_IS_ROOM === 'true' // 标记是否为直播间ID
        },
        {
            uid: process.env.BILIBILI_UID_6,
            name: process.env.BILIBILI_NAME_6 || 'UP主6',
            isRoomId: process.env.BILIBILI_UID_6_IS_ROOM === 'true' // 标记是否为直播间ID
        },
        {
            uid: process.env.BILIBILI_UID_7,
            name: process.env.BILIBILI_NAME_7 || 'UP主7',
            isRoomId: process.env.BILIBILI_UID_7_IS_ROOM === 'true' // 标记是否为直播间ID
        },
        {
            uid: process.env.BILIBILI_UID_8,
            name: process.env.BILIBILI_NAME_8 || 'UP主8',
            isRoomId: process.env.BILIBILI_UID_8_IS_ROOM === 'true' // 标记是否为直播间ID
        },
        {
            uid: process.env.BILIBILI_UID_9,
            name: process.env.BILIBILI_NAME_9 || 'UP主9',
            isRoomId: process.env.BILIBILI_UID_9_IS_ROOM === 'true' // 标记是否为直播间ID
        },
        {
            uid: process.env.BILIBILI_UID_10,
            name: process.env.BILIBILI_NAME_10 || 'UP主10',
            isRoomId: process.env.BILIBILI_UID_10_IS_ROOM === 'true' // 标记是否为直播间ID
        }
        // 在环境变量中添加更多UP主: BILIBILI_UID_3, BILIBILI_NAME_3 等
    ].filter(user => user.uid), // 过滤掉未设置的UP主
    checkInterval: parseInt(process.env.CHECK_INTERVAL) || 60000 // 默认60秒检查一次
};

// 创建Discord客户端
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 存储UP主的直播状态
let liveStatus = new Map();

// 机器人启动时的事件
client.once('ready', () => {
    console.log(`✅ 机器人已启动: ${client.user.tag}`);
    console.log(`🔍 开始监控 ${config.bilibiliUsers.length} 位UP主的直播状态...`);
    
    // 打印监控的UP主列表
    config.bilibiliUsers.forEach((user, index) => {
        console.log(`📺 ${index + 1}. ${user.name} (UID: ${user.uid})`);
    });
    
    // 初始化所有UP主的状态为未开播
    config.bilibiliUsers.forEach(user => {
        liveStatus.set(user.uid, false);
    });
    
    // 开始定时检查
    startLiveCheck();
});

// 检查B站直播状态的函数 - 支持UP主UID和直播间ID
async function checkBilibiliLive(uid, isRoomId = false) {
    try {
        console.log(`🔍 正在检查${isRoomId ? '直播间ID' : 'UP主UID'} ${uid} 的直播状态...`);
        
        if (isRoomId) {
            // 如果是直播间ID，直接使用房间API
            const roomResponse = await axios.get(`https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${uid}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://live.bilibili.com/'
                },
                timeout: 10000
            });
            
            if (roomResponse.data && roomResponse.data.code === 0) {
                const roomInfo = roomResponse.data.data.room_info;
                const isLive = roomInfo.live_status === 1;
                
                console.log(`📊 直播间状态 - Live Status: ${roomInfo.live_status} (${isLive ? '直播中' : '未开播'})`);
                console.log(`📊 直播标题: ${roomInfo.title}`);
                
                return {
                    isLive: isLive,
                    title: roomInfo.title || '无标题',
                    cover: roomInfo.cover || roomInfo.keyframe || '',
                    url: `https://live.bilibili.com/${uid}`,
                    roomid: uid,
                    online: roomInfo.online || 0
                };
            } else {
                console.log(`⚠️ 直播间API返回错误: ${roomResponse.data ? roomResponse.data.message : '未知错误'}`);
            }
        } else {
            // 原有的UP主UID逻辑
            const roomResponse = await axios.get(`https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${uid}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://live.bilibili.com/'
                },
                timeout: 10000
            });
            
            if (roomResponse.data && roomResponse.data.code === 0) {
                const roomInfo = roomResponse.data.data;
                const roomId = roomInfo.roomid;
                
                console.log(`📋 房间信息 - RoomID: ${roomId}, LiveStatus: ${roomInfo.liveStatus}, Title: ${roomInfo.title || '无标题'}`);
                
                if (roomId && roomId !== 0) {
                    // 方法2: 使用房间ID获取更详细的直播状态
                    const detailResponse = await axios.get(`https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${roomId}`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Referer': 'https://live.bilibili.com/'
                        },
                        timeout: 10000
                    });
                    
                    if (detailResponse.data && detailResponse.data.code === 0) {
                        const detailInfo = detailResponse.data.data;
                        const isLive = detailInfo.room_info.live_status === 1;
                        
                        console.log(`📊 详细状态 - Live Status: ${detailInfo.room_info.live_status} (${isLive ? '直播中' : '未开播'})`);
                        
                        return {
                            isLive: isLive,
                            title: detailInfo.room_info.title || '无标题',
                            cover: detailInfo.room_info.cover || detailInfo.room_info.keyframe || '',
                            url: `https://live.bilibili.com/${roomId}`,
                            roomid: roomId,
                            online: detailInfo.room_info.online || 0
                        };
                    }
                }
                
                // 如果详细API失败，使用基础信息
                return {
                    isLive: roomInfo.liveStatus === 1,
                    title: roomInfo.title || '无标题',
                    cover: roomInfo.cover || '',
                    url: roomInfo.url || `https://live.bilibili.com/${roomInfo.roomid}`,
                    roomid: roomInfo.roomid
                };
            } else {
                console.log(`⚠️ UP主API返回错误: ${roomResponse.data ? roomResponse.data.message : '未知错误'}`);
            }
        }
    } catch (error) {
        console.error(`❌ 检查${isRoomId ? '直播间ID' : 'UP主UID'} ${uid} 时出错:`, error.message);
        
        if (!isRoomId) {
            // 尝试备用API（仅对UP主UID）
            try {
                console.log(`🔄 尝试备用API...`);
                const backupResponse = await axios.get(`https://api.live.bilibili.com/room/v1/Room/room_init?id=${uid}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.bilibili.com/'
                    },
                    timeout: 10000
                });
                
                if (backupResponse.data && backupResponse.data.code === 0) {
                    const roomData = backupResponse.data.data;
                    console.log(`🔄 备用API结果 - Live Status: ${roomData.live_status}`);
                    
                    return {
                        isLive: roomData.live_status === 1,
                        title: roomData.title || '无标题',
                        cover: '',
                        url: `https://live.bilibili.com/${roomData.room_id}`,
                        roomid: roomData.room_id
                    };
                }
            } catch (backupError) {
                console.error(`❌ 备用API也失败了:`, backupError.message);
            }
        }
    }
    
    return null;
}

// 发送开播通知
async function sendLiveNotification(userInfo, liveData) {
    try {
        const channel = client.channels.cache.get(config.channelId);
        if (!channel) {
            console.error('❌ 找不到指定的频道');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🔴 直播开始啦!')
            .setDescription(`**${userInfo.name}** 正在直播`)
            .addFields(
                { name: '直播标题', value: liveData.title, inline: false },
                { name: '直播间链接', value: liveData.url, inline: false }
            )
            .setColor(0x00D4FF)
            .setTimestamp()
            .setFooter({ text: 'B站直播通知' });

        if (liveData.cover) {
            embed.setImage(liveData.cover);
        }

        await channel.send({ 
            content: `@everyone ${userInfo.name} 开播啦！快来围观~ 🎉`,
            embeds: [embed] 
        });
        
        console.log(`✅ 已发送 ${userInfo.name} 的开播通知`);
    } catch (error) {
        console.error('❌ 发送通知时出错:', error);
    }
}

// 发送测试通知的函数
async function sendTestNotification() {
    try {
        const channel = client.channels.cache.get(config.channelId);
        if (!channel) {
            console.error('❌ 找不到指定的频道，请检查CHANNEL_ID是否正确');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🤖 测试通知')
            .setDescription('机器人运行正常！这是一条测试消息。')
            .setColor(0x00FF00)
            .setTimestamp()
            .setFooter({ text: '机器人测试' });

        await channel.send({ 
            content: `✅ 机器人测试成功！正在监控 ${config.bilibiliUsers.length} 位UP主`,
            embeds: [embed] 
        });
        
        console.log(`✅ 测试通知发送成功`);
    } catch (error) {
        console.error('❌ 发送测试通知时出错:', error);
    }
}

// 开始定时检查直播状态
function startLiveCheck() {
    // 可选：启动后发送测试通知（设置为false可关闭）
    const sendStartupNotification = process.env.SEND_STARTUP_TEST === 'true';
    
    if (sendStartupNotification) {
        setTimeout(() => {
            sendTestNotification();
        }, 5000);
    }

    setInterval(async () => {
        console.log('🔍 检查直播状态中...');
        
        for (const user of config.bilibiliUsers) {
            console.log(`🔎 检查 ${user.name} (${user.isRoomId ? '直播间ID' : 'UP主UID'}: ${user.uid}) 的直播状态...`);
            const liveData = await checkBilibiliLive(user.uid, user.isRoomId);
            
            if (liveData) {
                const wasLive = liveStatus.get(user.uid);
                const isNowLive = liveData.isLive;
                
                console.log(`📊 ${user.name} 当前状态: ${isNowLive ? '🔴直播中' : '⚫未开播'} (之前: ${wasLive ? '直播中' : '未开播'})`);
                
                // 如果之前未开播，现在开播了，则发送通知
                if (!wasLive && isNowLive) {
                    console.log(`🎉 ${user.name} 开播了!`);
                    await sendLiveNotification(user, liveData);
                    liveStatus.set(user.uid, true);
                } else if (wasLive && !isNowLive) {
                    // 如果之前开播，现在停播了，更新状态
                    console.log(`📺 ${user.name} 已停播`);
                    liveStatus.set(user.uid, false);
                }
            } else {
                console.log(`⚠️ 无法获取 ${user.name} 的直播信息`);
            }
            
            // 每个UP主之间间隔一点时间，避免请求太频繁
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('✅ 本轮检查完成\n');
        
        // 在每次检查后也发送一次心跳（双重保险）
        if (Math.random() < 0.3) { // 30%概率发送额外心跳
            const url = process.env.RENDER_EXTERNAL_URL || `https://bilibilibot.onrender.com`;
            axios.get(url, { timeout: 5000 })
                .then(() => console.log('💓 额外心跳发送成功'))
                .catch(() => {}); // 忽略错误
        }
    }, config.checkInterval);
}

// 错误处理和自动重连
client.on('error', error => {
    console.error('❌ Discord客户端错误:', error);
    console.log('🔄 尝试重新连接...');
    
    // 延迟重连，避免频繁重试
    setTimeout(() => {
        client.login(config.token).catch(loginError => {
            console.error('❌ 重新登录失败:', loginError);
        });
    }, 5000);
});

client.on('shardError', error => {
    console.error('❌ Shard错误:', error);
});

// 进程异常处理
process.on('unhandledRejection', (error, promise) => {
    console.error('❌ 未处理的Promise拒绝:', error);
    console.error('Promise:', promise);
    // 不退出进程，继续运行
});

process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    // 记录错误但不退出，让进程管理器处理
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('📴 收到SIGTERM信号，正在优雅关闭...');
    client.destroy();
    server.close(() => {
        console.log('✅ 服务已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 收到SIGINT信号，正在优雅关闭...');
    client.destroy();
    server.close(() => {
        console.log('✅ 服务已关闭');
        process.exit(0);
    });
});

// 启动机器人
client.login(config.token).catch(error => {
    console.error('❌ 机器人登录失败:', error);
});
