# 学习协作系统

基于 React + Node.js 的在线学习小组协作系统，包含任务管理、资料共享、讨论、通知和权限控制等功能。

## 项目简介

学习协作系统用于组织小组内的日常学习活动。用户可以创建或加入小组，在同一个空间中分配任务、共享资料、参与讨论并接收通知；管理员可以查看系统概况并管理用户、小组、任务和文件。

项目同时保留了功能、接口、权限和回归测试记录，便于了解当前版本的行为、已修复问题和已知限制。

## 技术栈

### Frontend

- React 19
- Vite
- React Router
- Axios

### Backend

- Node.js
- Express
- Socket.IO
- Multer

### Database

- MySQL
- mysql2

### Authentication / Authorization

- Bearer Token + HMAC-SHA256 签名与有效期校验
- bcrypt 密码哈希
- RBAC 与小组级权限控制

### Testing

- Functional Testing
- API Testing
- Permission Testing
- Regression Testing
- Chrome DevTools
- MySQL / SQL

## 核心功能

- 注册与登录
- 学习小组与成员管理
- 三状态任务看板
- 资料上传、获取与共享
- 小组讨论与 `@` 提及
- 消息通知
- 个人资料与密码修改
- 管理后台
- 角色及小组级权限控制

## 项目截图

| Dashboard | 小组任务看板 |
| --- | --- |
| ![Dashboard](docs/screenshots/DASH-002-member-baseline-ui.png) | ![小组任务看板](docs/screenshots/TASK-004-member-drag-ui.png) |

| 小组讨论 | 资料共享 |
| --- | --- |
| ![小组讨论](docs/screenshots/DISC-MENTION-001-mention-suggestion-ui.png) | ![资料共享](docs/screenshots/FILE-004-all-files-search-ui.png) |

![管理后台](docs/screenshots/TASK-015-admin-task-management-ui.png)

## 测试实践

| 项目 | 结果 |
| --- | ---: |
| 正式功能测试 | 124 |
| Pass | 77 |
| Fail | 37 |
| Risk | 10 |
| 确认缺陷 | 21 |
| 已修复并验证 | 9 |
| 当前未修复 | 12 |
| 修复后核心回归 | 15 / 15 Pass |

修复重点缺陷后，对登录、权限、任务、讨论、文件和后台等核心路径进行了 15 条回归验证，全部通过。这 15 条回归独立统计，不计入 124 条正式功能测试。

## 代表性缺陷

- **文件接口权限缺失与上传身份伪造**：原接口允许匿名或非成员操作文件，上传者身份也可由客户端指定。现已改为从认证信息获取用户身份，并在文件操作前校验小组成员关系，已修复并验证。
- **任务跨组越权**：非成员曾可读取和修改其他小组任务。现按任务真实归属执行成员授权，已修复并验证。
- **讨论跨组访问及发送后自动入组**：非成员曾可读取或发送讨论消息，发送路径还会自动建立成员关系。现已补充 REST 接口成员校验并移除自动入组逻辑，已修复并验证。
- **管理员删除小组后物理文件残留**：删除小组时数据库记录会清理，但磁盘文件仍然存在。现已在删除流程中同步清理对应文件，已修复并验证。
- **文件获取链接错误**：资料链接曾指向前端开发端口并返回 HTML。现已统一使用后端资源地址，已修复并验证。

详细复现、修复记录和验证证据见 [Bug 报告](docs/bug-report.md)。

## 文档

- [测试执行与覆盖](docs/test-analysis.md)
- [Bug 报告](docs/bug-report.md)
- [回归测试](docs/test-execution-final-regression.md)
- [测试文档索引](docs/README.md)

## 本地运行

环境要求：Node.js 20.19+ 或 22.12+、MySQL 8.x、npm。

```bash
npm install
```

将 `.env.example` 复制为 `.env`，填写本地 MySQL 连接信息，并设置 `AUTH_TOKEN_SECRET`。`.env` 已被 Git 忽略。

启动后端：

```bash
node server/index.js
```

另开一个终端启动前端：

```bash
npm run dev
```

前端开发地址通常为 `http://localhost:5173`，后端默认监听 `http://localhost:3001`。

## Known Issues

当前版本仍有以下已知限制：

- `BUG-DISC-002`：Socket.IO 握手认证与房间授权仍待完善。
- `BUG-FILE-003`：`uploads` 静态资源仍可通过直接 URL 匿名访问。
- `BUG-FILE-004`：文件类型和 MIME 限制仍需完善。

其他未修复问题及复现证据见 [Bug 报告](docs/bug-report.md)。当前版本主要用于学习、测试实践和本地运行。
