# 一小时一张照片

一个按小时收集照片、生成四宫格时间卡片的小工具。项目分成两个版本:

- `offline/`:离线静态版,双击 `index.html` 即可使用,数据只保存在当前浏览器。
- `collaborative/`:远程协作版,使用 Netlify Functions + Supabase Storage/Database,同一 4 位房间号的人可以编辑同一份卡片。

## 功能

- 四宫格时间卡片
- 图片上传、压缩、裁剪、缩放
- 文字拖拽、字号、字色、底色
- 单张卡片导出 PNG
- 离线本地保存
- 房间号远程同步

## 版本选择

### 离线版

适合自己整理照片、临时生成图片、不需要多人同步的场景。

```text
offline/index.html
```

直接用浏览器打开即可。它不需要服务器、不需要 Supabase、不需要 Netlify。

### 远程协作版

适合多个人用同一个房间号一起填照片。

```text
collaborative/
```

部署到 Netlify 后,用户打开网页输入 4 位房间号,图片会上传到 Supabase Storage,卡片状态会保存到 Supabase 的 `room_states` 表。

## 部署协作版

1. 在 Supabase SQL Editor 运行 `collaborative/supabase/schema.sql`
2. 创建 public Storage bucket: `one-hour-photo`
3. 在 Netlify 配置环境变量:

```text
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=one-hour-photo
ADMIN_TOKEN=用于清空房间的管理员密码
```

4. 部署 `collaborative/` 目录到 Netlify。

## 开源说明

仓库不会包含任何真实 API key、Netlify token 或 Supabase service role key。请只把密钥放在部署平台的环境变量中。

## License

MIT
