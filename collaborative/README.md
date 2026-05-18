# 一小时一张照片

按小时记录生活的小红书风格九宫格生成器。

## 快速开始

直接用浏览器打开 `index.html` 即可运行,无需任何构建或依赖安装。

推荐用 Chrome / Safari / Edge 最新版,移动端也支持。

如果想用本地服务器(可选,某些浏览器对 file:// 协议有限制):

```bash
# Python 3
python3 -m http.server 8080

# 或者用 Node
npx serve .
```

然后访问 `http://localhost:8080`。

## 功能

- **封面卡片**:四宫格,每格写"职业 + 坐标"
- **时间卡片**:四宫格图片 + 中间时间标签,每张图可加文字、调底色、字色和字号
- **拖拽文字**:时间卡上的文字可以直接拖到任意位置
- **图片裁剪**:上传后的图片可以放大/缩小,也可以横向、纵向调整裁剪位置
- **添加 / 删除时间卡片**:点底部按钮添加,每张可单独删除
- **单卡导出 PNG**:每张卡片右上角"导出"按钮,2 倍清晰度
- **房间协作**:进入网页先输入 4 位房间号,同一个房间的人会同步同一份卡片
- **分享**:点右上角"分享",复制带房间号的短链接

## 项目结构

```
one-hour-photo/
├── index.html      主页面
├── styles.css      所有样式(支持深色模式)
├── storage.js      数据持久化层(localStorage + URL 分享)
├── app.js          主逻辑
├── netlify.toml    Netlify 部署配置
├── netlify/functions/
│   ├── room.js     读取 / 保存房间卡片状态
│   └── upload.js   上传房间图片到 Supabase Storage
├── supabase/
│   └── schema.sql  数据表结构
└── README.md       本文件
```

## 数据存储

房间数据存在 Supabase 的 `room_states` 表。浏览器 `localStorage` 只作为离线兜底使用。没有 `?room=1234` 的网址会显示房间输入页,不会自动进入上一次房间。

## 分享和协作机制

现在项目已经接入 Netlify + Supabase,点"分享"会复制带房间号的短链接,例如 `/?room=1024`。图片存在 Supabase Storage,卡片状态存在 Supabase 的 `room_states` 表,朋友打开同一个房间链接即可看到并编辑同一份卡片。

如果要多人在线协作,推荐方案是:前端部署到 Vercel / Netlify,图片上传到 Supabase Storage / Cloudflare R2 / S3,卡片 JSON 存到 Supabase / Firebase / 自建 API,再用实时订阅或 WebSocket 同步编辑。

## 房间同步

房间号是 4 位数字。它不是强密码,更像一个轻量协作码:知道房间号的人都能进入同一份卡片。

后端接口:

- `/.netlify/functions/room?code=1024`:读取房间状态
- `/.netlify/functions/room`:保存房间状态
- `/.netlify/functions/upload`:上传房间图片到 Supabase Storage
- `/.netlify/functions/clear-room`:用管理员密码清空房间状态和图片

需要在 Supabase SQL Editor 重新执行 `supabase/schema.sql`,以创建 `room_states` 表。

### Netlify 环境变量

在 Netlify Site settings -> Environment variables 中配置:

```text
SUPABASE_URL=你的 Supabase Project URL
SUPABASE_PUBLISHABLE_KEY=你的 Supabase publishable key
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role key
SUPABASE_BUCKET=one-hour-photo
ADMIN_TOKEN=你的管理员密码
```

`SUPABASE_SERVICE_ROLE_KEY` 和 `ADMIN_TOKEN` 只能放在 Netlify 环境变量里,不要写进前端文件。房间保存、图片上传和清空房间会通过 Netlify Functions 完成。

### Supabase 设置

1. 在 Supabase SQL Editor 执行 `supabase/schema.sql`
2. 创建公开 Storage bucket: `one-hour-photo`
3. Netlify Functions 会把网页上传的图片存入这个 bucket,并把房间状态写入 `room_states` 表

## 依赖

- [html2canvas](https://html2canvas.hertzen.com/) 1.4.1 — 用于卡片导出图片,通过 CDN 加载

无其他依赖。

## 浏览器兼容

需要支持的 Web API:
- ES2017+ (async/await)
- Clipboard API(分享功能,旧浏览器会降级为弹窗复制)
- Canvas / FileReader(图片处理)

主流浏览器近 5 年版本均可。
