# 私密装修工作台

面向手机和微信浏览器的装修工作台，包含施工、采购、选购知识、费用与文件。Node.js 在服务器验证共享密码，未登录不能读取 HTML、PDF、DWG、图片或数据文件。页面采用蓝紫色仪表盘设计。

## 仓库范围

**本仓库只包含服务器代码和脱敏页面模板，不包含真实合同、发票、施工图、个人信息或部署密码。** `private/`、原始文件目录、环境文件及压缩包均由 `.gitignore` 排除。不要把真实资料加入公开 Git 仓库；以后更改可见性也无法收回已被克隆的数据。

`templates/index.html` 保留施工与采购流程、主材选购知识（含按用户截图整理的6项木地板建议）；个人项目资料、账单和附件清单已移除。

## 开发

需要 Node.js 22，不依赖第三方运行包。

```sh
npm run setup
npm test
npm start
```

启动前在进程环境或托管平台的安全设置中配置 `WORKBENCH_PASSWORD`（至少12字符）和 `WORKBENCH_SESSION_SECRET`（至少32字符随机值）。生产设 `NODE_ENV=production` 并使用 HTTPS；服务读取 `PORT`。未配置时返回503，不会开放文件。`.env.example` 仅提供变量名，不会自动加载。

`setup` 只在 `private/index.html` 不存在时从模板生成页面，已有私有内容不会被覆盖。真实资料需要放到私有部署存储，再维护 `private/index.html` 的对应入口；此仓库部署后默认只有脱敏模板，没有原来的合同和发票。

## 使用 Vercel 部署

[在 Vercel 创建密码保护站点](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjeanlee961008%2Frenovation_workbench&env=WORKBENCH_PASSWORD%2CWORKBENCH_SESSION_SECRET&envDescription=%E8%AE%BE%E7%BD%AE%E8%AE%BF%E9%97%AE%E5%AF%86%E7%A0%81%EF%BC%88%E8%87%B3%E5%B0%9112%E5%AD%97%E7%AC%A6%EF%BC%89%E5%8F%8A%E7%8B%AC%E7%AB%8B%E9%9A%8F%E6%9C%BA%E4%BC%9A%E8%AF%9D%E5%AF%86%E9%92%A5%EF%BC%88%E8%87%B3%E5%B0%9132%E5%AD%97%E7%AC%A6%EF%BC%89%E3%80%82%E4%B8%8D%E8%A6%81%E6%8A%8A%E5%AF%86%E9%92%A5%E5%86%99%E8%BF%9B%E4%BB%A3%E7%A0%81%E3%80%82)

已提供 vercel.json：使用 Vercel Services 的 workbench 服务，入口 server.mjs，Node 22，构建命令 npm run setup。所有请求直接进入 Node 密码验证服务；不公开静态资料目录。api/index.mjs 保留为可测试的函数适配器，但当前服务部署不使用它。

在 Vercel 安全环境变量中设置 WORKBENCH_PASSWORD（至少12字符，建议16位以上随机密码）和独立 WORKBENCH_SESSION_SECRET（至少32字符随机值），然后部署。不要把真实密码发到聊天、写进Git或加入链接。未配置返回503，不能访问文件。更换密码/密钥后需要重新部署。

从 GitHub 导入会使用脱敏模板，不会自动取得真实合同、发票、施工图和账单。本地原始内容可通过授权后的 Vercel CLI 部署到鉴权函数包中；.vercelignore 保留 private/，而 .gitignore 仍排除它，避免真实内容进入Git。更新项目现有的生产部署，固定域名保持不变。

附件使用 Node ReadableStream 响应并保留 Range/HEAD 支持，已本地验证17MB读取；Vercel生产环境的函数限制、请求响应大小、执行时长和平台带宽计费仍需上线后核验，不应将本地通过称为云端附件验证。函数文件系统只读，真实文件需要随私有部署包重新部署；没有文件上传管理界面或云存储同步。

如 Vercel 项目本身还启用了团队身份验证保护，分享者可能需要Vercel账号；如需家人仅输入工作台密码，应在项目 Deployment Protection 中确认生产域名没有额外的 Vercel Authentication。保留本项目自己的密码验证。

当前配置不代表站点已在你的 Vercel 账号上线。首次账号授权和环境变量填写需要在Vercel完成。不能用Netlify Drop或GitHub Pages运行此服务器。

也保留 Render Blueprint 配置作为其他 Node 托管方式：构建 npm run setup，启动 npm start，健康检查 /health。

## 权限及限制

登录有效期7天；Cookie 使用 HttpOnly、生产 Secure 和 SameSite=Lax。更换密码或密钥并重启/重新部署会使旧登录失效。共享密码可被转发；获准访问者仍能截图和下载。单进程IP登录失败限流为10次/15分钟，跨实例统一防护应由托管平台WAF提供。未声称经过第三方安全审计或微信真机测试。

`npm test` 使用临时测试文件，不需要真实附件：覆盖未登录访问、密码验证、跨站与过大提交、Cookie标志、附件读取与PDF Range/HEAD、过期或篡改会话、改密撤销、路径穿越及退出。此前也已在本地真实HTTP服务器验证手机登录、17MB附件完整读取与退出拦截。

当前 Vercel 项目名 renovation-workbench，已建立账号绑定。CLI 部署以项目为单位更新生产链接。完整资料的首次外传仍需单独明确授权；已有成功的账号授权不等于允许上传合同等敏感资料。
