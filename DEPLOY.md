# Vercel 部署

1. 登录 Vercel，导入 GitHub 仓库 jeanlee961008/renovation_workbench。
2. 使用仓库根目录，框架选择 Other。vercel.json 指定构建 npm run build:vercel，公开输出目录 public。
3. 在安全环境变量中填写 WORKBENCH_PASSWORD（至少12字符）及 WORKBENCH_SESSION_SECRET（至少32字符独立随机值），点击 Deploy。不要提交真实环境文件。
4. 部署后先检查未登录页面和附件均被阻止，再验证登录、退出及分享。更新同一个项目可保持生产域名不变。

GitHub导入默认只有脱敏模板，没有真实附件。要恢复个人资料，必须使用包含private目录的私有部署包，或者另行配置私有存储，不能把个人资料加到公开Git历史。

本地可通过官方Vercel CLI登录授权并部署；.vercelignore排除原始根目录的公开静态副本和ZIP，但允许private目录打包到服务函数。Vercel运行时包含私有页面和文件，不把它们复制到public。

附件采用流式响应；生产上的大附件读取和微信浏览器访问尚需实际上线验证。官方平台限制和方案费用以账号为准。

如果此前发布过静态公开版，请删除旧站点和旧公开部署。新服务不能保护旧链接。

详见README.md中的能力与限制。Render备用部署配置仍保留。
