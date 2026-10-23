# dsh-zentao-bugs

DeepSeek Harness（DSH）Web 客户端插件：在右侧栏面板中查询禅道（ZenTao）**「我的地盘 → 指派给我 → Bug」**，支持分页列表与详情（含历史记录、评论、步骤截图）。

## 功能

- **双入口**：左侧栏「开始界面」面板与右侧边栏「开始」页均有 **禅道** 入口，可同时打开一边看 Bug 一边工作
- **分页列表**（每页 20 条，按 Bug ID 倒序）：
  - ID、严重程度（S1–S4 标识色）、状态（激活/已解决/已关闭 标识色）、标题、产品
  - **点击标题** → 在当前面板内打开详情页
  - **点击「详情」** → 用系统默认浏览器打开禅道的 Bug 页面（`bug-view-<id>.html`）
- **详情页**：标题、状态/严重程度、产品、所属模块、类型、优先级、创建人、指派信息、解决信息、截止日期、重现步骤（含内网截图）、**历史记录与评论**时间线
- **图片代理**：步骤与评论里的图片由 Host 代理加载（浏览器无禅道会话也能显示）
- **设置页**：`设置 → 禅道` 配置内网地址、用户名、密码，失焦自动保存；另有两个开关分别控制左/右侧栏入口的展示（即时生效）
- 会话过期自动重新登录；列表结果缓存 30 秒

## 界面位置

| 位置 | 内容 |
|---|---|
| 左侧栏面板列表 | 「禅道」图标 → 主面板打开列表/详情 |
| 右侧边栏「开始」页 | 「禅道」胶囊 → 右侧边栏内打开列表/详情 |
| 设置 | 「禅道」分区：地址、用户名、密码、左右侧栏入口开关 |

> 说明：左侧栏注册在 `sidebar.panellist`（入口）与 root 作用域 `main` keyed slot（页面）；右侧栏通过 `sidebarRightTabs` 注册页类型与 guide 入口，正文在 `sidebar.right.pane.tab`。界面文案为中文。

## 安装

### 方式一：DSH「添加插件」（推荐）

在 DSH 的 **插件页 → 添加插件** 对话框中直接填入本仓库地址：

```
https://github.com/legendaryduty/dsh-zentao-bugs
```

安装器会用 `pnpm` 从 GitHub 拉取本包、加入当前 profile 的 bundles 并重载插件，随后在 **设置 → 禅道** 填入地址与账号即可。包名为 `dsh-zentao-bugs`。

> 提示：本包没有构建步骤（纯 JS + 直接服务的 `client.js`），也不需要网络代理之外的额外配置；若提示无法访问 GitHub，可改用「安装源 / 国内镜像」，或改用下面的本地路径方式。

### 方式二：插件管理器（本地目录）

在具备 `plugin_manager` 工具的 DSH 会话中执行 `install_bundle`，`target` 指向本仓库目录（先克隆）：

```
git clone https://github.com/legendaryduty/dsh-zentao-bugs.git
```

### 方式三：手动安装到 profile

1. 克隆本仓库
2. 把包链接/复制到 profile 的 `node_modules/dsh-zentao-bugs`
3. 在 profile 的 `package.json` 中：

```json
"dependencies": { "dsh-zentao-bugs": "0.4.0" },
"dsh": { "profile": { "bundles": [ "...", "dsh-zentao-bugs" ] } }
```

4. 在 profile 的 `cordis.patch.yml` 末尾追加：

```yaml
- insert:
    - id: zentao-bugs
      name: dsh-zentao-bugs
      config:
        baseUrl: http://zentao.example.com/zentao
        username: your-account
        password: your-password
```

5. 重载插件（`patchReload: live` 会监听 patch 文件；首次加载无需重启 DSH）

## 配置

| 字段 | 说明 | 默认 |
|---|---|---|
| `baseUrl` | 禅道地址，含 `/zentao` 路径，如 `http://zentao.example.com/zentao` | 空（必填） |
| `username` | 禅道账号 | 空 |
| `password` | 禅道密码 | 空 |

**安全提示**：密码以**明文**保存在本机 DSH profile 配置文件与浏览器设置表单中，没有额外加密层。请仅在受控的个人机器上使用，并在 `baseUrl` 中避免使用公网暴露的地址。

## 数据来源与口径

插件通过禅道自身的 Web JSON 接口取数（登录会话 `zentaosid`）：

| 用途 | 禅道接口 |
|---|---|
| 获取会话 | `GET /api-getsessionid.json` |
| 登录 | `POST /user-login.json?zentaosid=...`（`account` / `password` 表单） |
| 指派给我的 Bug | `GET /my-work-bug.json` —— 即界面上的**我的地盘 → 指派给我** |
| Bug 详情 + 历史/评论 | `GET /bug-view-<id>.json` |
| 产品名映射 | `GET /product-all.json` |
| 附件/图片 | `GET /file-<name>` |

> 为什么不用 `api.php/v1` REST API：它的 `bugs` 接口按产品可见性过滤，会漏掉「我的地盘」里能看到的 Bug（实测同账号 REST 只能查到部分记录），因此改用「我的地盘」同源接口，数据与界面完全一致。

## 插件暴露的 Host 路由

浏览器半通过同源路径访问 Host 代理（避免 CORS 与浏览器端携带禅道凭据）：

| 路由 | 说明 |
|---|---|
| `GET /zentao-plugin/bugs` | 指派给我的 Bug 列表（30 秒缓存） |
| `GET /zentao-plugin/bug/<id>` | Bug 详情 + 历史记录/评论 |
| `GET /zentao-plugin/file/<file-*>` | 步骤/评论图片代理（带禅道会话，5 分钟缓存） |

### 安全边界

- 路由只监听本机回环地址（DSH Web 服务的绑定地址）
- 该前缀路由**不校验 DSH Web 的登录 token**（token 只保护 SPA 页面），同机其他进程可直接调用；仅适合内网单机场景
- 禅道账号密码只保存在 Host 侧配置中，浏览器端从不持有凭据

## 开发

```
zentao-bugs/
├── index.js           # Host 半：配置 schema、同源 HTTP 路由、禅道会话与代理
├── client.js          # 浏览器半：侧栏入口、列表/详情页、设置分区
├── cordis.patch.yml   # bundle patch：插入插件行
├── icon.svg           # 插件卡片图标
├── locale/{en,zh}.json # 插件卡片标题与描述
└── package.json       # dsh.bundle / dsh.client 声明
```

启用 Host 侧热重载（编辑 `index.js` 自动生效，无需重启 DSH），在 profile 的 `cordis.patch.yml` 中覆盖 HMR 配置：

```yaml
- id: hmr
  config:
    root:
      - /absolute/path/to/zentao-bugs
```

> 修改 `client.js` 后，打开中的页面可能会自动重载插件；若行为未更新，刷新窗口即可。

语法自检：

```
node --check index.js
node --check client.js
```

## 兼容性

- 禅道开源版 **22.3**（实测；依赖 `my-work-bug.json`、`bug-view-<id>.json` 这些 Web JSON 接口，较老版本可能字段不同）
- 禅道账号需具备「我的地盘」访问权限，且能直接访问内网地址
- DSH Desktop / Web（Web 客户端插件体系：`sidebar.panellist`、`main`、`settings.section`）

## 许可

本仓库未声明开源许可证；如需对外复用，请自行补充许可证文件。
