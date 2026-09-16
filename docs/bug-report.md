# 功能测试 Bug 报告

## 1. 报告范围

本报告记录当前已经实际执行的登录、注册、小组管理、成员权限、任务管理、讨论实时消息、文件资料共享、通知、Dashboard 及个人资料与密码测试中发现的问题。各模块结果见对应 `test-execution-*.md`；个人资料与密码结果见 [`test-execution-profile.md`](./test-execution-profile.md)。未执行场景和仅通过源码推测的问题不列入本报告；没有明确需求依据的问题会标注为“业务规则缺口 / 可疑缺陷”或“需求待确认 / 权限与隐私风险候选”。

| 记录编号 | 问题标题 | 关联场景 | 问题性质 | 严重程度 | 优先级 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-LR-001 | 重复用户名或邮箱注册返回 500 | REGISTER-003、REGISTER-004 | 已确认缺陷 | 中 | P2 | 待修复 |
| BUG-LR-002 | 后端允许设置 1 位密码并成功登录 | REGISTER-011、PWD-005 | 已确认缺陷 | 高 | P1 | 待修复 |
| BUG-LR-003 | 后端用户接口缺少邮箱格式校验，可写入非法邮箱 | REGISTER-010、PROF-005 | 已确认缺陷 | 中 | P1 | 待修复 |
| BUG-PROF-001 | 旧用户资料接口数据库失败仍返回 HTTP 200 | PROF-005 | 已确认缺陷 | 中 | P2 | 待修复 |
| BUG-TASK-001 | 普通任务接口缺少小组成员权限校验 | TASK-006～TASK-010 | 已确认缺陷 | 高 | P0 | 待修复 |
| BUG-TASK-002 | 后端允许纯空格任务内容落库 | TASK-012 | 已确认缺陷 | 中 | P1 | 待修复 |
| BUG-TASK-003 | 普通任务接口错误状态码语义不正确 | TASK-013-B～TASK-013-E | 已确认缺陷 | 中 | P2 | 待修复 |
| BUG-TASK-004 | 非法 group_id 未提前校验并暴露数据库错误 | TASK-013-F | 已确认缺陷 | 中 | P1 | 待修复 |
| BUG-DISC-001 | 讨论REST接口缺少小组成员授权校验 | DISC-007、DISC-008、DISC-MENTION-006 | 已确认缺陷 | 高 | P0 | 待修复 |
| BUG-DISC-002 | Socket.IO缺少认证与房间成员授权 | DISC-006 | 已确认缺陷 | 高 | P0 | 待修复 |
| BUG-DISC-003 | 讨论group id及资源存在性校验不完整 | DISC-011、DISC-012 | 已确认缺陷 | 中 | P2 | 待修复 |
| BUG-FILE-001 | 普通文件REST接口缺少认证、小组成员与资源所有权授权 | FILE-005、FILE-006、FILE-012、FILE-013、FILE-014 | 已确认缺陷 | 高 | P0 | 待修复 |
| BUG-FILE-002 | 上传接口信任客户端uploader_id，允许匿名伪造资源归属 | FILE-007 | 已确认缺陷 | 高 | P0 | 待修复 |
| BUG-FILE-003 | 公开uploads静态资源缺少认证与小组授权 | FILE-008；FILE-010增强影响 | 已确认缺陷 | 高 | P0 | 待修复 |
| BUG-FILE-004 | 文件类型与MIME安全校验缺失 | FILE-010 | 已确认缺陷 | 高 | P0 | 待修复 |
| BUG-FILE-005 | groupId与fileId参数格式校验过宽 | FILE-011-B、FILE-014 | 已确认缺陷 | 中 | P1 | 待修复 |
| BUG-FILE-006 | 上传失败后未回滚物理文件 | FILE-011-A | 已确认缺陷 | 中 | P1 | 待修复 |
| BUG-FILE-007 | 资料集锦获取链接使用错误origin | FILE-004-B | 已确认缺陷 | 中 | P1 | 待修复 |
| BUG-NOTIF-001 | notification id使用宽松整数解析 | NOTIF-009 | 已确认缺陷 | 中 | P1 | 待修复 |
| BUG-GR-001 | 系统允许创建重复名称的小组 | GROUP-003 | 业务规则缺口 / 可疑缺陷 | 低（待确认） | P3 | 待产品确认 |
| RISK-GM-001 | 非成员可读取小组成员邮箱等信息 | GROUP-PERM-001-3 | 需求待确认 / 权限与隐私风险候选 | 待确认 | 待确认 | 待需求确认 |
| RISK-FILE-001 | 系统允许上传并保存零字节文件 | FILE-009-B | 需求待确认 / 风险候选 | 待确认 | 待确认 | 待需求确认 |
| RISK-FILE-002 | 文件上传未配置单文件大小限制 | FILE-017 | 需求待确认 / 安全风险候选 | 待确认 | 待确认 | 待需求确认 |
| RISK-PROF-001 | 密码修改后既有 token 仍然有效 | PWD-004 | 会话安全规则待确认 / 风险候选 | 待确认 | 待确认 | 待需求确认 |
| RISK-DISC-MENTION-001 | 讨论区允许用户提及自己 | DISC-MENTION-003 | 业务规则待确认 / 风险候选 | 待确认 | 待确认 | 待需求确认 |
| RISK-DISC-MENTION-002 | 后端不校验mention用户真实性和成员关系 | DISC-MENTION-004 | 真实性校验风险候选 | 待确认 | 待确认 | 待需求确认 |
| RISK-DISC-MENTION-003 | 重复mention和重复消息不去重 | DISC-MENTION-005 | 业务规则待确认 / 风险候选 | 待确认 | 待确认 | 待需求确认 |
| RISK-NOTIF-001 | pending邀请已读后仍计入“未读消息” | NOTIF-003 | 业务语义待确认 / 风险候选 | 待确认 | 待确认 | 待需求确认 |

## BUG-LR-001：重复用户名或邮箱注册返回 500

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 注册 |
| 关联用例 | REGISTER-003、REGISTER-004 |
| 严重程度 | 中 |
| 优先级 | P2 |
| 状态 | 待修复 |
| 执行环境 | Windows；前端 `http://localhost:5173`；后端端口 `3001`；本地 MySQL |

### 前置条件

- 场景一：数据库中已存在用户名 `qa_user01`，并准备一个未使用的邮箱。
- 场景二：数据库中已存在邮箱 `qa.user01@example.com`，并准备一个未使用的用户名。
- 前端、后端和数据库均已启动。

### 测试数据

| 字段 | 数据 |
| --- | --- |
| 重复用户名场景 | 用户名 `qa_user01`（已存在）；邮箱 `qa.user02@example.com`（未使用） |
| 重复邮箱场景 | 用户名 `qa_new_name`（未使用）；邮箱 `qa.user01@example.com`（已存在） |
| 密码 | 合法非空密码，截图中已遮罩 |

### 复现步骤

1. 打开注册页面。
2. 分别使用“已存在用户名 + 新邮箱”和“新用户名 + 已存在邮箱”填写注册信息。
3. 输入合法非空密码。
4. 点击“注册”。
5. 在浏览器 Network 面板查看每次 `register` 请求。

### 预期结果

- 系统不创建重复用户。
- 页面提示用户名或邮箱已存在。
- 接口使用 `409 Conflict` 表示唯一字段冲突，使客户端能够区分业务冲突和服务器内部错误。

### 实际结果

- 重复用户名与重复邮箱两次测试中，页面均显示“注册失败，用户名或邮箱可能已存在”。
- 两次 `register` 请求均实际返回 `500 Internal Server Error`。
- REGISTER-003 和 REGISTER-004 均判定为 Fail。

### 影响

- 客户端和接口测试无法通过状态码准确区分“用户输入重复”和“服务器内部异常”。
- 服务器监控中可能把正常的业务冲突统计为服务错误。
- 当前注册页虽然能显示提示，但其专门处理 409 的分支没有被使用。

### 代码关联

普通注册接口捕获所有数据库异常后统一返回 500，见 [`server/index.js`](../server/index.js#L499)；注册页已经存在针对 409 的处理，见 [`src/pages/Register.jsx`](../src/pages/Register.jsx#L33)。

### 测试证据

重复用户名注册提示和 Network 中 `register` 的 500 状态：

![BUG-LR-001：重复用户名注册返回 500](./screenshots/REGISTER-003-500.png)

重复邮箱注册提示和 Network 中 `register` 的 500 状态：

![BUG-LR-001：重复邮箱注册返回 500](./screenshots/REGISTER-004-500.png)

## BUG-LR-002：后端允许设置 1 位密码并成功登录

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 注册、登录、个人密码修改 |
| 关联用例 | REGISTER-011、PWD-005 |
| 严重程度 | 高 |
| 优先级 | P1 |
| 状态 | 待修复 |
| 执行环境 | Windows；前端 `http://localhost:5173`；后端端口 `3001`；本地 MySQL |

### 前置条件

- 测试用户名和邮箱尚未注册。
- 前端、后端和数据库均已启动。

### 测试数据

| 字段 | 数据 |
| --- | --- |
| 用户名 | `qa_pwd1` |
| 邮箱 | 本轮截图未记录 |
| 密码 | `1` |

### 复现步骤

1. 打开注册页面。
2. 输入未使用的用户名和邮箱。
3. 密码只输入 `1`。
4. 点击“注册”。
5. 在 Network 面板观察 `register` 请求。
6. 注册后，在登录页使用用户名 `qa_pwd1` 和密码 `1` 登录。
7. 在 Network 面板观察 `login` 请求和登录后的页面。

### 预期结果

- 注册时应执行密码最小长度校验。
- 对 1 位密码应拒绝注册并给出明确提示。
- 不应生成可使用 1 位密码登录的有效账号。

### 实际结果

- 1 位密码注册成功，`register` 返回 201。
- 随后使用该账号和密码 `1` 登录成功，`login` 返回 200。
- 页面进入“学习空间总览”，显示当前用户 `qa_pwd1`。
- PWD-005 中绕过个人设置页面直接调用 `PUT /api/user/profile`，接口同样接受1位新密码并返回200；随后使用该密码登录成功。
- 注册和个人改密两个独立入口均确认缺少后端最小长度校验；两个场景均判定为 Fail，按同一根因合并记录。

### 影响

- 用户可以设置极弱密码，账号更容易被猜中或被他人尝试登录。
- 注册规则与个人资料页面已有的“新密码至少 4 位”前端提示不一致。

### 代码关联

注册页面只有必填校验，注册接口只判断密码是否为空；个人设置页面要求新密码至少4位，但 profile 后端只判断是否非空。两个后端入口都没有执行最小长度校验，见 [`server/index.js`](../server/index.js#L476) 和 [`server/index.js`](../server/index.js#L1318)。

### 测试证据

注册请求返回 201：

![BUG-LR-002：1 位密码注册返回 201](./screenshots/REGISTER-011-201.png)

同一账号随后登录返回 200 并进入学习空间：

![BUG-LR-002：1 位密码账号登录成功](./screenshots/REGISTER-011-login-200.png)

个人改密接口接受1位密码并返回200：

![BUG-LR-002：个人改密接口接受1位密码](./screenshots/PWD-005-one-char-password-api.png)

使用修改后的1位密码可以实际登录：

![BUG-LR-002：个人改密后的1位密码登录成功](./screenshots/PWD-005-one-char-password-login-success.png)

## BUG-LR-003：后端用户接口缺少邮箱格式校验，可写入非法邮箱

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 注册接口、旧用户资料更新接口 |
| 关联用例 | REGISTER-010、PROF-005 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P1 |
| 状态 | 待修复 |
| 执行环境 | Windows；前端 `http://localhost:5173`；后端端口 `3001`；本地 MySQL |

### 缺陷描述

注册页面会利用浏览器的 `type="email"` 校验阻止明显的非法邮箱提交，但注册接口和旧 `PUT /api/users/:id` 更新接口都没有独立校验邮箱格式。REGISTER-010 已确认注册接口可创建非法邮箱账号；PROF-005 又确认旧资料接口接受 `not-an-email` 并写入已有用户。两者属于同一后端输入校验缺失，合并记录。

### 前置条件

- 用户名 `qa_bad_email_api` 和邮箱 `invalid-email` 尚未被使用。
- 后端和数据库已启动。
- 可通过浏览器开发者工具直接发送 HTTP 请求。

### 测试数据

```json
{
  "username": "qa_bad_email_api",
  "email": "invalid-email",
  "password": "Test@1234"
}
```

### 复现步骤

1. 打开浏览器开发者工具 Console。
2. 向 `POST http://localhost:3001/api/register` 发送上述 JSON 请求。
3. 查看 HTTP 状态码和响应体。
4. 确认接口是否成功创建该非法邮箱账号。

### 预期结果

- 后端独立校验邮箱格式，不依赖浏览器页面校验。
- 对 `invalid-email` 返回 400，并给出明确的格式错误提示。
- 不创建非法邮箱账号。

### 实际结果

- 接口返回 201。
- 响应体为 `{ success: true }`。
- SQL 查询确认 `qa_bad_email_api` 已存在于 `users` 表，邮箱为 `invalid-email`，角色为 `user`。
- 非法邮箱用户不只是收到成功响应，而是已经真实写入数据库。
- PROF-005 中旧资料接口返回200和 `success:true`，SQL确认 id 26 的邮箱被更新为 `not-an-email`。
- REGISTER-010 与 PROF-005 均判定为 Fail；PROF-005 后已恢复原邮箱。

### 影响

- 调用者可以绕过前端校验，把格式非法的邮箱写入用户数据。
- 接口与页面的校验规则不一致，会影响数据质量和后续依赖邮箱的功能。

### 代码关联

普通注册接口只检查字段是否为空，旧用户资料接口则直接把请求中的 `email` 写入 `users`，两处都没有邮箱格式校验，见 [`server/index.js`](../server/index.js#L478) 和 [`server/index.js`](../server/index.js#L1755)。本条缺陷已有两个独立接口的实际证据，不是仅由静态分析推断。

### 测试证据

Console 中显示向注册接口提交 `invalid-email` 后，状态码为 201，响应为 `{ success: true }`：

![BUG-LR-003：后端接受非法邮箱并返回 201](./screenshots/REGISTER-010-invalid-email-201.png)

SQL 查询结果确认 `qa_bad_email_api` 的非法邮箱数据已经写入 `users` 表：

![BUG-LR-003：非法邮箱账号已确认落库](./screenshots/REGISTER-SQL-user-data-validation.png)

旧资料接口接受非法邮箱并返回200：

![BUG-LR-003：旧资料接口接受非法邮箱](./screenshots/PROF-005-invalid-email-api.png)

SQL确认非法邮箱真实写入现有用户：

![BUG-LR-003：旧资料接口非法邮箱落库](./screenshots/PROF-005-invalid-email-sql.png)

## BUG-PROF-001：旧用户资料接口数据库失败仍返回 HTTP 200

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 个人资料、旧用户更新接口 |
| 关联场景 | PROF-005 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P2 |
| 状态 | 待修复 |

### 缺陷描述与实际结果

C调用 `PUT /api/users/26`，把邮箱改为已由A使用的 `qa.user01@example.com`。数据库唯一约束正确阻止了重复邮箱写入，但接口的异常分支仍返回HTTP 200，响应体为 `{ success:false, message:'服务器错误' }`。

### 预期结果

- 唯一字段冲突应返回409 Conflict，并给出可理解的重复邮箱提示；
- 服务器内部异常应返回500；
- 不应使用HTTP 200表达失败结果。

### 影响

- 前端和接口测试不能只根据HTTP状态码可靠判断更新是否成功；
- 业务冲突会被笼统表示为服务器错误；
- 调用方如果忽略JSON中的 `success`，可能错误地认为资料更新成功。

### 代码关联

旧 `PUT /api/users/:id` 接口的 catch 分支使用 `res.json(...)`，没有设置错误状态码，也没有单独处理 `ER_DUP_ENTRY`，见 [`server/index.js`](../server/index.js#L1755)。

### 测试证据

![BUG-PROF-001：重复邮箱失败但返回HTTP 200](./screenshots/PROF-005-duplicate-email-api.png)

## BUG-GR-001：系统允许创建重复名称的小组

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 小组管理 |
| 关联用例 | GROUP-003 |
| 问题性质 | 业务规则缺口 / 可疑缺陷 |
| 严重程度 | 低（待确认） |
| 优先级 | P3 |
| 状态 | 待产品确认 |
| 执行环境 | Windows；前端 `http://localhost:5173`；后端端口 `3001`；本地 MySQL |

### 缺陷描述

已存在名为 `qa_group01` 的小组时，再次使用相同名称创建，系统仍创建成功，并生成新的 group id。第一次创建记录为 id 31，第二次创建记录为 id 32，因此不是覆盖原小组，而是保留了两个同名小组。

当前项目没有明确规定“小组名称必须唯一”，所以该问题暂不直接认定为确定的功能错误，先作为业务规则缺口 / 可疑缺陷记录。

### 前置条件

- 用户 `qa_user01` 已登录。
- 当前用户已创建小组 `qa_group01`，其 group id 为 31。
- 前端、后端和数据库均已启动。

### 测试数据

| 字段 | 数据 |
| --- | --- |
| 已有小组名称 | `qa_group01` |
| 再次创建名称 | `qa_group01` |
| 本次简介 | `重复名称测试` |
| 原 group id | `31` |
| 新 group id | `32` |

### 复现步骤

1. 使用 `qa_user01` 登录系统。
2. 进入“我的小组”。
3. 确认已经存在名称为 `qa_group01` 的小组。
4. 点击“新建小组”。
5. 小组名称再次输入 `qa_group01`。
6. 简介输入“重复名称测试”。
7. 点击“创建”。
8. 观察创建结果、详情页和 Network 请求中的 group id。

### 预期结果

项目应先明确小组名称是否允许重复：

- 如果名称必须唯一，系统应拒绝创建并提示名称已存在。
- 如果允许重名，页面应有足够的区分信息，避免用户仅凭名称无法识别小组。

在规则未确认前，不把“必须拒绝重名”描述成已经存在的项目需求。

### 实际结果

- 第二次创建成功。
- 新小组名称仍为 `qa_group01`，简介为“重复名称测试”。
- 新小组使用 group id 32，原小组 group id 31 仍然存在。
- 用例记录为 Fail / 缺陷候选。

### 影响

- 小组列表中可能出现多个同名小组，用户仅凭名称难以区分。
- 邀请、任务、讨论或资料操作时，可能因名称相同而选错小组。
- 是否需要限制重复名称，仍需根据产品规则确认。

### 代码关联

创建小组接口直接写入名称、简介和 owner id，没有查询同名记录，见 [`server/index.js`](../server/index.js#L1871)。当前运行时建表代码也没有为小组名称设置唯一约束。

### 测试证据

第一次创建的小组 `qa_group01` 使用 group id 31：

![BUG-GR-001：原 qa_group01 使用 group id 31](./screenshots/GROUP-001-200.png)

再次创建同名小组后，页面进入新 group id 32：

![BUG-GR-001：重复名称小组创建成功并使用 group id 32](./screenshots/GROUP-003-duplicate-created.png)

## BUG-TASK-001：普通任务接口缺少小组成员权限校验

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 任务管理、权限 |
| 关联场景 | TASK-006～TASK-010 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 高 |
| 优先级 | P0 |
| 状态 | 待修复 |
| 测试角色 | C：`qa_nonmember01`，user id 26 |
| 目标数据 | group 31、task 44，以及权限测试临时任务 |

### 缺陷描述

C 已登录但不属于 group 31。使用 C 的有效登录状态直接调用普通任务接口时，后端允许读取 group 31 任务、向 group 31 创建任务、修改 task 44、删除 group 31 的任务；请求列表时不传 `group_id` 还会返回全站任务。说明普通任务 API 只验证“是否登录”，没有验证调用者是否属于任务或目标小组，形成横向越权和 IDOR 风险。

### 复现步骤与实际结果

1. 用 SQL 确认 C 不属于 group 31。
2. C 请求 `GET /api/tasks?group_id=31`，返回 200 和该组任务。
3. C 向 `POST /api/tasks` 提交 `group_id=31`，返回 200 并生成 task 48；SQL 确认落库。
4. C 向 `PUT /api/tasks/44` 提交合法状态，返回 200；SQL 确认 task 44 被修改。
5. C 向 `DELETE /api/tasks/49` 发起删除，返回 200；SQL 确认记录不存在。
6. C 请求 `GET /api/tasks` 且不传 `group_id`，返回 200 和 21 条全站任务；同期 SQL 显示 group 31 只有 4 条。

### 预期结果

- 查询指定小组任务前，应验证当前用户是该组 owner 或成员。
- 创建任务前，应验证当前用户属于请求中的 `group_id`。
- 修改和删除任务前，应先查询 task 所属 group，再验证当前用户属于该组。
- 普通用户不传 `group_id` 时，不应获得全站任务；可以返回其有权访问的小组任务，或返回明确的 400。
- 无权限操作应返回 403，且数据库不得发生改变。

### 影响

- 任意已登录用户可能读取其他小组的任务内容。
- 攻击者知道小组或任务 id 后，可以跨组创建、篡改或删除任务，破坏协作数据完整性。
- 不传筛选条件即可读取全站任务，扩大信息泄露范围。

### 代码关联

普通任务 GET、POST、PUT、DELETE 路由只使用 `requireAuthUser`，没有继续校验小组成员关系，见 [`server/index.js`](../server/index.js#L1663)、[`server/index.js`](../server/index.js#L1684)、[`server/index.js`](../server/index.js#L1788)、[`server/index.js`](../server/index.js#L1820)。本缺陷已由 TASK-006～TASK-010 的真实请求和 SQL 结果确认，不是仅靠源码推测。

### 测试证据

![BUG-TASK-001：非成员读取 group 31 任务](./screenshots/TASK-006-nonmember-read-api.png)

![BUG-TASK-001：非成员创建任务并落库](./screenshots/TASK-007-nonmember-create-sql.png)

![BUG-TASK-001：非成员修改 task 44](./screenshots/TASK-008-nonmember-update-task44-api.png)

![BUG-TASK-001：非成员删除任务](./screenshots/TASK-009-nonmember-delete-api.png)

![BUG-TASK-001：普通接口返回全站任务](./screenshots/TASK-010-unscoped-task-list-api.png)

## BUG-TASK-002：后端允许纯空格任务内容落库

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 任务管理、输入校验 |
| 关联场景 | TASK-012 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P1 |
| 状态 | 待修复 |

### 缺陷描述与复现步骤

页面会阻止完全空的任务内容提交，但直接向 `POST /api/tasks` 提交只包含空格的 content 时，接口返回 200 和 `success: true`，并生成 task 46。SQL 查询确认该纯空格内容真实写入 tasks 表。

### 预期结果

- 后端应对 content 执行去除首尾空格后的非空校验。
- 纯空格内容应返回 400，且不能写入数据库。
- 前端提示与后端规则应保持一致。

### 影响

调用者可以绕过页面校验创建看起来没有内容的任务，影响任务列表可读性和数据质量。

### 代码关联

任务创建接口只使用普通真假判断检查 content，没有对字符串执行 `trim()` 后再判断，见 [`server/index.js`](../server/index.js#L1684)。

### 测试证据

![BUG-TASK-002：纯空格内容被接口接受](./screenshots/TASK-012-whitespace-api.png)

![BUG-TASK-002：纯空格任务已落库](./screenshots/TASK-012-whitespace-sql.png)

## BUG-TASK-003：普通任务接口错误状态码语义不正确

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 任务管理接口 |
| 关联场景 | TASK-013-B～TASK-013-E |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P2 |
| 状态 | 待修复 |

### 缺陷描述与实际结果

以下四种明确失败均返回 HTTP 200，只在 JSON 中使用 `success: false`：

- 新建任务缺少 content；
- 新建任务缺少 group_id；
- PUT 修改不存在的 task 999999；
- DELETE 删除不存在的 task 999999。

### 预期结果

- 缺少必填参数应返回 400 Bad Request。
- 目标 task 不存在应返回 404 Not Found。
- 错误响应仍可保留结构化 `success: false` 和明确 message，但不能用 200 表示失败。

### 影响

- 前端、接口测试和监控不能只通过 HTTP 状态码判断请求是否成功。
- 调用方容易误把失败请求记作正常响应，增加错误处理复杂度。

### 代码关联

普通任务 POST、PUT、DELETE 路由的部分失败分支直接调用 `res.json(...)`，没有设置合适状态码，见 [`server/index.js`](../server/index.js#L1684)、[`server/index.js`](../server/index.js#L1788)、[`server/index.js`](../server/index.js#L1820)。

### 测试证据

![BUG-TASK-003：缺少 content 返回 HTTP 200](./screenshots/TASK-013-missing-content-api.png)

![BUG-TASK-003：缺少 group_id 返回 HTTP 200](./screenshots/TASK-013-missing-group-api.png)

![BUG-TASK-003：PUT 不存在任务返回 HTTP 200](./screenshots/TASK-013-not-found-put-api.png)

![BUG-TASK-003：DELETE 不存在任务返回 HTTP 200](./screenshots/TASK-013-not-found-delete-api.png)

## BUG-TASK-004：非法 group_id 未提前校验并暴露数据库错误

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 任务管理接口、输入校验 |
| 关联场景 | TASK-013-F |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P1 |
| 状态 | 待修复 |

### 缺陷描述与实际结果

向 `POST /api/tasks` 提交字符串 `abc` 作为 group_id 时，接口没有在进入数据库前拒绝该参数。请求最终使用 HTTP 200 返回 `success: false`，并在响应中暴露 MySQL 错误文本，包含具体列名、非法值和行信息。

### 预期结果

- 后端先校验 group_id 是有效的正整数，并校验目标小组存在及调用者有权访问。
- 非法类型返回 400 和面向调用者的通用提示。
- 不向客户端返回数据库驱动原始错误文本。

### 影响

- 暴露数据库类型、列名和错误细节，为外部调用者提供不必要的内部实现信息。
- HTTP 200 的错误语义还会干扰前端和监控判断。

### 代码关联

任务创建接口把请求中的 group_id 直接传给 INSERT，并在异常响应中返回原始 `err.message`，见 [`server/index.js`](../server/index.js#L1684)。

### 测试证据

![BUG-TASK-004：非法 group_id 返回 200 并暴露数据库错误](./screenshots/TASK-013-invalid-group-type-api.png)

## BUG-DISC-001：讨论REST接口缺少小组成员授权校验

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 讨论区、成员权限 |
| 关联场景 | DISC-007、DISC-008、DISC-MENTION-006 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 高 |
| 优先级 | P0 |
| 状态 | 待修复 |
| 测试角色 | C：`qa_nonmember01`，user id 26 |
| 目标小组 | group 31；测试前C不是成员 |

### 缺陷描述

非成员C使用有效登录状态即可读取group 31的完整历史讨论。C向该组发送消息时，后端不但没有拒绝，还自动向 `group_members` 插入成员关系，再把消息写入 `discussions`。这绕过了项目已经存在的邀请、接受流程。

### 复现步骤

1. 使用SQL确认 `group_id=31/user_id=26` 没有成员记录。
2. C请求 `GET /api/groups/31/discussions`。
3. 观察接口返回200、`success:true` 和4条历史讨论。
4. C向同一路径POST `disc20260908_nonmember_autojoin_001`。
5. 观察接口返回200、`success:true`。
6. 查询 discussions 和 group_members。

### 预期结果

- GET和POST均应验证当前用户是目标小组owner或成员。
- 非成员请求应返回403，不返回讨论内容、不写入消息，也不能改变成员关系。
- 加入小组必须沿用邀请和接受流程。

### 实际结果与影响

- GET返回200并暴露4条历史讨论。
- POST返回200，discussion id 130真实写入数据库。
- group_members新增 `group_id=31/user_id=26/role=成员`。
- 自动加入使用中文 `成员`，与邀请接受流程写入的英文 `member` 不一致。
- 任意已登录用户知道group id后，可以跨组读取讨论并绕过邀请加入小组，影响隐私和成员关系完整性。
- DISC-MENTION-006 使用带 `@[demo_user](20)` 标记的消息再次复现相同结果：discussion id 137落库，C再次被自动加入group 31；测试后异常成员关系已清理。

### 代码关联

GET只校验登录，未调用成员访问检查；POST发现没有成员记录时会主动插入成员，再保存消息，见 [`server/index.js`](../server/index.js#L2418) 和 [`server/index.js`](../server/index.js#L2454)。本缺陷由实际REST响应和SQL结果确认。

### 测试证据

![BUG-DISC-001：C不是group31成员](./screenshots/DISC-007-nonmember-proof-sql.png)

![BUG-DISC-001：非成员读取讨论返回200](./screenshots/DISC-007-nonmember-read-api.png)

![BUG-DISC-001：非成员发送讨论返回200](./screenshots/DISC-008-nonmember-post-api.png)

![BUG-DISC-001：非成员消息真实落库](./screenshots/DISC-008-nonmember-message-sql.png)

![BUG-DISC-001：后端自动新增成员关系](./screenshots/DISC-008-nonmember-autojoin-sql.png)

![BUG-DISC-001补充证据：非成员发送mention返回200](./screenshots/DISC-MENTION-006-nonmember-post-200.png)

![BUG-DISC-001补充证据：非成员被自动加入小组](./screenshots/DISC-MENTION-006-auto-join-sql.png)

## BUG-DISC-002：Socket.IO缺少认证与房间成员授权

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 实时消息、Socket.IO权限 |
| 关联场景 | DISC-006 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 高 |
| 优先级 | P0 |
| 状态 | 待修复 |

### 缺陷描述与复现步骤

1. 启动一个不携带token的匿名 Socket.IO 客户端。
2. 连接 `http://localhost:3001`，发送 `join_group(31)`。
3. 客户端成功连接并显示已经加入room 31。
4. A通过正常讨论页面发送 `disc20260908_socket_probe_001`。
5. 匿名客户端收到完整的 `new_message`，其中包含group id、user id、用户名、内容和时间。

### 预期结果

- Socket握手必须验证有效登录身份。
- `join_group` 必须检查当前Socket用户是否属于目标小组。
- 未登录或非成员客户端不能加入房间，也不能接收实时消息。

### 实际结果与影响

- 匿名客户端无token即可连接并加入room 31。
- A合法发送后，匿名端成功收到group 31实时消息。
- 外部调用者只要知道group id即可监听组内后续讨论，REST接口的登录校验无法保护Socket广播内容。

### 代码关联

Socket服务没有认证中间件；`join_group` 只把参数解析为正整数后执行 `socket.join`，没有用户或成员查询，见 [`server/index.js`](../server/index.js#L60)。

### 测试证据

![BUG-DISC-002：匿名客户端连接并加入room31](./screenshots/DISC-006-anonymous-socket-join-room.png)

![BUG-DISC-002：A合法发送测试消息](./screenshots/DISC-006-legit-send-post-200.png)

![BUG-DISC-002：匿名客户端收到实时消息](./screenshots/DISC-006-anonymous-socket-receive.png)

## BUG-DISC-003：讨论group id及资源存在性校验不完整

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 讨论REST接口、资源ID校验 |
| 关联场景 | DISC-011、DISC-012 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P2 |
| 状态 | 待修复 |

### 缺陷描述

讨论GET接口对group id使用宽松整数解析，并且查询历史前不确认小组是否存在。这导致 `31abc` 被当作group 31，同时不存在小组999999返回HTTP 200空数组；同一不存在小组的POST却正确返回404。

### 复现步骤与实际结果

1. 请求 `GET /api/groups/31abc/discussions`，实际返回200和group 31的5条讨论。
2. 请求 `GET /api/groups/999999/discussions`，实际返回200、`success:true` 和空数组。
3. 向 `/api/groups/999999/discussions` POST消息，实际返回404和“小组不存在”。

### 预期结果

- group id必须是完整的正整数字符串，`31abc` 应返回400。
- GET和POST都应先确认小组存在；不存在资源应统一返回404。

### 影响

- 非法路径可能被映射到真实小组，造成请求目标与调用者输入不一致。
- 客户端无法根据GET结果区分“不存在的小组”和“存在但没有讨论的小组”。

### 代码关联

GET和POST都使用 `Number.parseInt`；GET随后直接查询 discussions，没有查询 groups_table，而POST会先检查小组存在性，见 [`server/index.js`](../server/index.js#L2418) 和 [`server/index.js`](../server/index.js#L2454)。

### 测试证据

![BUG-DISC-003：31abc被解析成group31](./screenshots/DISC-011-prefixed-group-id-api.png)

![BUG-DISC-003：不存在小组GET和POST语义不一致](./screenshots/DISC-012-missing-group-api.png)

## BUG-FILE-001：普通文件REST接口缺少认证、小组成员与资源所有权授权

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 文件列表、上传、删除、成员权限 |
| 关联场景 | FILE-005、FILE-006、FILE-012、FILE-013、FILE-014 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 高 |
| 优先级 | P0 |
| 状态 | 待修复 |

### 缺陷描述与实际结果

普通 `group_files` REST 接口没有统一执行登录、小组成员和资源所有权校验，前端隐藏按钮无法形成有效的服务端权限边界：

- C 不是 group 31 成员，仍可 GET 文件列表并获得 3 条资料；
- C 可向 group 31 上传，SQL id 17 和物理文件均真实写入；
- B 看不到 A 文件的删除按钮，但直接 DELETE id 13 返回 200；
- C 可删除 B 的 id 14；
- 匿名用户可删除 id 20。以上删除均影响数据库和物理文件。

### 预期结果

- 列表、上传和删除均应先验证登录身份。
- 调用者应属于目标小组；删除还应按明确规则校验上传者、组长或管理员身份。
- 未登录返回 401，无组权限返回 403，不得读写数据库或物理文件。

### 代码关联

普通上传、列表和删除路由没有使用 `requireAuthUser`，删除逻辑也没有校验当前用户与文件的关系，见 [`server/index.js`](../server/index.js#L2632)。FILE-014 同时暴露 file id 格式校验问题，另记为 BUG-FILE-005。

### 测试证据

![BUG-FILE-001：非成员读取文件列表返回200](./screenshots/FILE-005-nonmember-list-api.png)

![BUG-FILE-001：非成员上传记录落库](./screenshots/FILE-006-nonmember-upload-sql.png)

![BUG-FILE-001：普通成员删除他人文件返回200](./screenshots/FILE-012-member-delete-other-api.png)

![BUG-FILE-001：非成员删除成员文件返回200](./screenshots/FILE-013-nonmember-delete-api.png)

![BUG-FILE-001：匿名删除返回200](./screenshots/FILE-014-anonymous-prefixed-delete-api.png)

## BUG-FILE-002：上传接口信任客户端uploader_id，允许匿名伪造资源归属

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 文件上传、身份可信性 |
| 关联场景 | FILE-007 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 高 |
| 优先级 | P0 |
| 状态 | 待修复 |

### 缺陷描述与实际结果

无痕窗口中 `localStorage` 没有 token。匿名调用者在 multipart 请求中传入 `uploader_id=21` 后，上传接口返回 200，数据库把文件记录归属到 `qa_user01`，物理文件也真实生成。外部调用者可以伪造合法用户发布资料。

### 预期结果

上传者身份必须从服务端验证后的 token 获得，不能接受客户端指定的任意用户 ID；匿名请求应返回 401，且不写数据库和磁盘。

### 代码关联

上传路由直接解析 `req.body.uploader_id`，未从认证上下文取得用户 ID，见 [`server/index.js`](../server/index.js#L2632)。接口缺少认证的共性同时归入 BUG-FILE-001，本条聚焦身份伪造根因。

### 测试证据

![BUG-FILE-002：匿名伪造上传者并上传](./screenshots/FILE-007-anonymous-spoof-upload.png)

![BUG-FILE-002：伪造归属写入数据库](./screenshots/FILE-007-spoof-sql.png)

## BUG-FILE-003：公开uploads静态资源缺少认证与小组授权

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 文件获取、静态资源权限 |
| 关联场景 | FILE-008；FILE-010增强影响 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 高 |
| 优先级 | P0 |
| 状态 | 待修复 |

### 缺陷描述与实际结果

未登录用户只要知道静态 URL，就能直接访问 `http://localhost:3001/uploads/...`。FILE-008 中无痕窗口得到 HTTP 200 和完整组内 TXT 内容；FILE-010 还确认上传的 HTML 会从同一公开目录以 `text/html` 提供。

### 预期结果

组内文件下载应经过认证和小组授权，未登录用户不能仅凭可猜测或泄露的 URL 获得内容。危险类型控制属于另一根因，另记为 BUG-FILE-004。

### 代码关联

服务将整个上传目录直接挂载为 Express 静态资源，见 [`server/index.js`](../server/index.js#L46)，该路径不经过业务 API 的认证与成员检查。

### 测试证据

![BUG-FILE-003：未登录静态访问返回200](./screenshots/FILE-008-anonymous-static-download.png)

![BUG-FILE-003：HTML通过公开静态URL渲染](./screenshots/FILE-010-dangerous-type-static.png)

## BUG-FILE-004：文件类型与MIME安全校验缺失

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 文件上传、内容安全 |
| 关联场景 | FILE-010 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 高 |
| 优先级 | P0 |
| 状态 | 待修复 |

### 缺陷描述与实际结果

无害测试 HTML 文件上传返回 200，数据库记录 id 16、size 65；随后静态服务以 `text/html; charset=utf-8` 返回并由浏览器正常渲染。当前上传入口没有文件类型白名单或 MIME 限制。

### 预期结果

应依据项目允许的资料类型建立服务端校验；至少不应把用户上传的主动内容直接作为同源可执行 HTML 提供。允许类型范围仍应由需求明确，但当前“任意类型上传并公开渲染”的安全结果已经实际确认。

### 代码关联

multer 仅配置磁盘存储和文件名，没有 `fileFilter`、MIME/扩展名校验或大小限制，见 [`server/index.js`](../server/index.js#L48)。

### 测试证据

![BUG-FILE-004：HTML上传成功](./screenshots/FILE-010-dangerous-type-upload.png)

![BUG-FILE-004：HTML作为text/html公开提供](./screenshots/FILE-010-dangerous-type-static.png)

## BUG-FILE-005：groupId与fileId参数格式校验过宽

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 文件API、路径参数校验 |
| 关联场景 | FILE-011-B、FILE-014 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P1 |
| 状态 | 待修复 |

### 缺陷描述与实际结果

- 上传路径中的 `groupId=31abc` 被当作 31，接口返回 200，SQL id 19 和物理文件均写入 group 31。
- 删除路径中的 `fileId=20abc` 被当作 20，匿名请求成功删除真实 id 20。

### 预期结果

路径 ID 应匹配完整的正整数字符串；包含字母或其他后缀时应返回 400，并且不得读写数据库或文件系统。

### 代码关联

普通文件路由对 `groupId` 和 `fileId` 使用 `Number.parseInt`，未验证原字符串被完整解析，见 [`server/index.js`](../server/index.js#L2632) 和 [`server/index.js`](../server/index.js#L2715)。FILE-014 的匿名删除权限问题同时归入 BUG-FILE-001。

### 测试证据

![BUG-FILE-005：31abc写入group31](./screenshots/FILE-011-prefixed-group-sql.png)

![BUG-FILE-005：20abc命中真实文件并删除](./screenshots/FILE-014-anonymous-prefixed-delete-api.png)

## BUG-FILE-006：上传失败后未回滚物理文件

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 文件上传、DB与文件系统一致性 |
| 关联场景 | FILE-011-A |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P1 |
| 状态 | 待修复 |

### 缺陷描述与实际结果

向 `/api/groups/abc/files` 上传时，接口对非法 group id 返回 400，数据库没有有效记录，但 multer 在参数校验前已经把文件写入 `server/uploads`，留下 `1788941472033-file_test_invalid_group_20260908.txt` 孤儿文件。

### 预期结果

参数应在可行范围内先校验；若文件已经写入而后续校验或数据库操作失败，服务端应删除临时物理文件，使数据库和磁盘保持一致。

### 代码关联

`upload.single('file')` 在路由处理函数解析 `groupId` 之前运行，错误分支没有清理 `req.file`，见 [`server/index.js`](../server/index.js#L2632)。

### 测试证据

![BUG-FILE-006：非法group id返回400](./screenshots/FILE-011-invalid-group-api.png)

![BUG-FILE-006：失败请求留下孤儿文件](./screenshots/FILE-011-invalid-group-orphan.png)

## BUG-FILE-007：资料集锦获取链接使用错误origin

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 资料集锦、文件获取 |
| 关联场景 | FILE-004-B |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P1 |
| 状态 | 待修复 |

### 缺陷描述与实际结果

在 `/all-files` 点击“获取”后，浏览器访问 `http://localhost:5173/uploads/...`。该 URL 返回 HTTP 200 和 Vite 前端 `index.html`，并非目标 TXT 内容；正确静态文件服务实际位于 3001。

### 预期结果

“获取”应生成正确的后端文件 URL，返回所选文件内容；前端不应把相对 `file_url` 直接解析到自身 origin。

### 代码关联

资料集锦页面把数据库返回的相对 `file.file_url` 直接赋给 `<a href>`，见 [`src/pages/AllFiles.jsx`](../src/pages/AllFiles.jsx#L156)。小组详情页已有拼接后端基地址的下载 URL 构造逻辑，可以作为行为对照。

### 测试证据

![BUG-FILE-007：资料集锦搜索正常](./screenshots/FILE-004-all-files-search-ui.png)

![BUG-FILE-007：获取链接返回前端index.html](./screenshots/FILE-004-all-files-download-wrong-port.png)

## BUG-NOTIF-001：notification id使用宽松整数解析

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 关联场景 | NOTIF-009 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P1 |
| 当前状态 | 待修复 |

### 缺陷描述与复现步骤

通知respond接口使用宽松整数解析路径参数。A拥有一条真实的id 72、类型为`invite_result`的通知时，使用有效登录状态提交：

```http
POST /api/notifications/72abc/respond
Content-Type: application/json

{"action":"accept"}
```

### 预期结果

- `72abc`不是合法整数ID，应直接返回400和“无效的通知ID”。
- 不应查询或进入真实id 72的业务处理分支。

### 实际结果与影响

- 接口返回400，但消息是“暂不支持该类型通知”。
- 该消息只会在查询到真实id 72并识别出其`invite_result`类型后返回，证明`72abc`已经被解析成72。
- 本轮实测的是respond接口。源码中DELETE通知接口使用相同的`Number.parseInt`方式，因此也存在同类风险，但DELETE数字前缀行为尚未单独实测，不能算作额外执行结果。
- 宽松ID解析可能让格式错误的URL意外命中真实资源，降低接口参数边界的可靠性。

### 代码关联

- [`server/index.js`](../server/index.js#L2260)：respond接口直接使用`Number.parseInt(req.params.id, 10)`。
- [`server/index.js`](../server/index.js#L2393)：DELETE接口使用相同解析方式，属于源码风险延伸。

### 测试证据

![BUG-NOTIF-001：72abc进入真实id 72的业务类型分支](./screenshots/NOTIF-009-prefixed-id-loose-parse.png)

## 2. 需求待确认 / 权限与隐私风险候选

### RISK-PROF-001：密码修改后既有 token 仍然有效

#### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 个人密码修改、登录会话 |
| 关联场景 | PWD-004 |
| 问题性质 | 会话安全规则待确认 / 风险候选 |
| 严重程度 | 待确认 |
| 优先级 | 待确认 |
| 状态 | 待需求确认 |

#### 实际执行结果

- 保留C修改密码前签发的旧token；
- 密码修改成功后继续使用该token请求 `GET /api/user/profile`；
- 接口返回HTTP 200和 `success:true`，旧会话未被撤销。

#### 判定边界

当前token只按签名和过期时间验证，没有密码版本、会话表或改密时间校验。项目需求未明确规定“修改密码后注销全部既有会话”，因此本场景不直接判确认缺陷。如果产品要求在密码泄露后通过改密收回旧会话，则该行为应升级为安全缺陷。

#### 测试证据

![RISK-PROF-001：改密前token在改密后仍返回200](./screenshots/PWD-004-old-token-still-valid.png)

### RISK-GM-001：非成员可读取小组成员邮箱等信息

#### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 小组成员与权限 |
| 关联场景 | GROUP-PERM-001-3 |
| 问题性质 | 需求待确认 / 权限与隐私风险候选 |
| 严重程度 | 待确认 |
| 优先级 | 待确认 |
| 状态 | 待需求确认 |
| 测试角色 | C：`qa_nonmember01`，user id 26 |
| 目标小组 | group 31；C 不属于该小组 |

#### 实际执行结果

- C 使用有效登录状态直接请求 `GET /api/groups/31/members`。
- 接口返回 200，响应中的 `members` 为包含 2 个对象的数组。
- 成员对象包含 `email`、`username`、`role`、`id`、`group_id`、`joined_at` 等字段。
- 已实际确认仅登录但不属于 group 31 的用户可以读取该小组成员邮箱及成员关系信息。

#### 风险与待确认事项

- 成员邮箱属于个人信息，向非成员返回可能扩大信息可见范围。
- 项目没有明确规定小组成员列表及邮箱是否只允许组内成员查看，因此当前不直接认定为已确认 Bug，也不判定该场景 Pass 或 Fail。
- 需要确认：非成员是否允许查看成员列表；如果允许，是否仍应隐藏邮箱、加入时间等字段。

#### 代码关联

成员列表接口要求用户登录，但没有继续校验当前用户是否为 group 31 的 owner 或成员，见 [`server/index.js`](../server/index.js#L1979)。本记录以 GROUP-PERM-001-3 的实际 200 响应为依据，不是仅由源码推测。

#### 测试证据

截图显示 C 调用成员列表接口返回 200，并在响应中看到成员邮箱等字段：

![RISK-GM-001：非成员读取成员列表及邮箱](./screenshots/GROUP-PERM-001-members-email-exposed-200.png)

### RISK-FILE-001：系统允许上传并保存零字节文件

#### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 文件上传、输入边界 |
| 关联场景 | FILE-009-B |
| 问题性质 | 需求待确认 / 风险候选 |
| 严重程度 | 待确认 |
| 优先级 | 待确认 |
| 状态 | 待需求确认 |

#### 实际执行结果

- B 上传 `file_test_zero_20260908.txt`，POST 返回 200。
- 页面显示文件大小 0 KB。
- SQL 确认 `group_files` id 15、group id 31、uploader id 20、`file_size=0`。

#### 风险与待确认事项

项目当前没有明确规定是否允许空文件，因此本结果不判 Fail，也不作为已确认缺陷。需要确认零字节资料是否具备业务价值，以及是否应在前端和后端统一拒绝。

#### 测试证据

![RISK-FILE-001：零字节上传返回200](./screenshots/FILE-009-zero-byte-upload-200.png)

![RISK-FILE-001：零字节文件真实落库](./screenshots/FILE-009-zero-byte-sql.png)

### RISK-FILE-002：文件上传未配置单文件大小限制

#### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 文件上传、容量边界与资源安全 |
| 关联场景 | FILE-017 |
| 问题性质 | 需求待确认 / 安全风险候选 |
| 严重程度 | 待确认 |
| 优先级 | 待确认 |
| 状态 | 待需求确认 |

#### 实际执行结果

- A 上传长度为 20971520 bytes（20 MiB）的 `FILE-017-large-20MB.bin`。
- `POST /api/groups/31/files` 返回 200，页面显示 20.00 MB。
- SQL 确认 `group_files` id 22 的 `file_size=20971520`；物理目录中对应文件长度也为 20971520 bytes。
- 当前 Multer 使用 `multer({ storage })`，未配置 `limits.fileSize` 或等价单文件大小限制。
- 测试后通过正常删除接口清理，数据库 id 22 和物理文件均不存在。

#### 风险与待确认事项

项目需求没有规定文件大小上限，因此本场景不判 Fail，也不作为已确认缺陷。若部署环境长期开放上传，缺少单文件限制可能造成磁盘空间耗尽、服务资源占用或拒绝服务风险；建议先确认业务允许的最大文件大小，再在前后端实施一致限制和明确错误提示。

#### 测试证据

![RISK-FILE-002：20 MiB文件上传返回200](./screenshots/FILE-017-large-file-upload-200.png)

![RISK-FILE-002：数据库记录完整大小](./screenshots/FILE-017-large-file-sql.png)

![RISK-FILE-002：磁盘文件长度一致](./screenshots/FILE-017-large-file-disk.png)

![RISK-FILE-002：删除后数据库无记录](./screenshots/FILE-017-large-file-delete-sql.png)

### RISK-DISC-MENTION-001：讨论区允许用户提及自己

#### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 讨论区 `@` 提及 |
| 关联场景 | DISC-MENTION-003 |
| 问题性质 | 业务规则待确认 / 风险候选 |
| 严重程度 | 待确认 |
| 优先级 | 待确认 |
| 状态 | 待需求确认 |

#### 实际执行结果

- A 输入 `@qa` 时，候选列表包含当前账号 `qa_user01`。
- A 成功发送 `@[qa_user01](21) selfmention20260909_003`。
- 请求成功，页面按 mention 样式高亮自己。

#### 风险与待确认事项

当前没有明确需求禁止用户提及自己。该行为可能没有协作价值，但也不会自然构成功能错误，因此不判 Bug；需要产品确认候选列表是否应排除当前用户。

#### 测试证据

![RISK-DISC-MENTION-001：候选出现当前用户](./screenshots/DISC-MENTION-003-self-suggestion-ui.png)

![RISK-DISC-MENTION-001：自我提及发送成功](./screenshots/DISC-MENTION-003-self-mention.png)

### RISK-DISC-MENTION-002：后端不校验mention用户真实性和成员关系

#### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 讨论区 `@` 提及、数据真实性 |
| 关联场景 | DISC-MENTION-004 |
| 问题性质 | 真实性校验风险候选 |
| 严重程度 | 待确认 |
| 优先级 | 待确认 |
| 状态 | 待需求确认 |

#### 实际执行结果

- 前端候选列表正确排除了非成员 C 和不存在的用户名。
- A 绕过页面直接 POST `@[qa_nonmember01](26) mention20260909_004`，接口返回 200，页面高亮，SQL id 133 完整落库。
- A 直接 POST `@[不存在用户](999999) mention20260909_004b`，接口同样返回 200，页面高亮，SQL id 134 完整落库。
- 两种情况都没有创建 notifications 记录。

#### 风险与待确认事项

后端和展示层把 mention 标记当作可信文本，未验证用户是否存在、显示名和 ID 是否匹配、用户是否属于当前小组。当前 `@` 只承担文本高亮，不会触发通知或权限动作，因此先作为真实性校验风险候选；若以后 mention 参与通知或权限流程，应提升处理优先级。

#### 代码关联

讨论 POST 只对完整 content 执行 `trim()` 后落库；页面展示仅用正则解析 `@[显示名](id)`，见 [`server/index.js`](../server/index.js#L2454) 和 [`src/pages/GroupDetail.jsx`](../src/pages/GroupDetail.jsx#L749)。

#### 测试证据

![RISK-DISC-MENTION-002：非成员不在前端候选](./screenshots/DISC-MENTION-004-nonmember-not-in-suggestions.png)

![RISK-DISC-MENTION-002：伪造非成员mention成功](./screenshots/DISC-MENTION-004-forged-nonmember-mention-api-ui.png)

![RISK-DISC-MENTION-002：伪造不存在用户mention成功](./screenshots/DISC-MENTION-004-forged-missing-user-api-ui.png)

### RISK-DISC-MENTION-003：重复mention和重复消息不去重

#### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 讨论区 `@` 提及、重复输入 |
| 关联场景 | DISC-MENTION-005 |
| 问题性质 | 业务规则待确认 / 风险候选 |
| 严重程度 | 待确认 |
| 优先级 | 待确认 |
| 状态 | 待需求确认 |

#### 实际执行结果

- 同一消息可连续选择两次 B，两个 `@[demo_user](20)` 均完整保存和高亮。
- 完全相同的消息再次 POST 仍返回 200。
- SQL id 135、136 内容相同，证明系统没有重复消息去重。
- 由于 mention 不生成 notifications，重复发送也没有产生重复 mention 通知。

#### 风险与待确认事项

当前没有明确要求去重同一接收者，也没有要求阻止用户连续发送相同文本。该行为可能造成讨论噪声，但在需求确认前不判 Bug。

#### 测试证据

![RISK-DISC-MENTION-003：两个相同mention发送成功](./screenshots/DISC-MENTION-005-duplicate-mention-send-200.png)

![RISK-DISC-MENTION-003：重复消息形成两条记录](./screenshots/DISC-MENTION-005-duplicate-message-sql.png)

### RISK-NOTIF-001：pending邀请已读后仍计入“未读消息”

#### 基本信息

| 项目 | 内容 |
| --- | --- |
| 关联场景 | NOTIF-003 |
| 问题性质 | 业务语义待确认 / 风险候选 |
| 当前状态 | 待需求确认 |

#### 实际结果

- 进入通知页后，`PUT /api/notifications/mark-read`返回200。
- SQL确认pending invite的`is_read`已经持久化为1，刷新后仍为1。
- 页面“未读消息”和侧边栏红点仍显示1。

#### 判定边界

当前前端把pending邀请和未读通知同时计入红点。如果红点表示“待处理事项”，该行为可以成立；但页面文案明确写“未读消息”，与`is_read=1`存在语义冲突。需求尚未明确，因此不判确认缺陷。

#### 测试证据

![RISK-NOTIF-001：mark-read成功后页面仍显示未读1](./screenshots/NOTIF-003-mark-read-ui-count-mismatch.png)

![RISK-NOTIF-001：数据库is_read已经为1](./screenshots/NOTIF-003-mark-read-sql.png)

## 3. 问题统计

| 问题分类 | 数量 |
| --- | ---: |
| 已确认缺陷 | 19 |
| 业务规则缺口 / 可疑缺陷 | 1 |
| 需求待确认 / 权限与隐私风险候选 | 8 |
| **问题记录合计** | **28** |

19个已确认缺陷中，高严重程度8个、中严重程度11个。另有9个没有明确需求依据的问题：BUG-GR-001为小组名称规则缺口；RISK-PROF-001、RISK-GM-001、RISK-FILE-001、RISK-FILE-002、3个RISK-DISC-MENTION记录和RISK-NOTIF-001均属于需求待确认 / 风险候选。PWD-005扩展BUG-LR-002，PROF-005的非法邮箱扩展BUG-LR-003；只有旧资料接口错误状态码新增BUG-PROF-001，因此本轮新增确认缺陷1个、风险候选1个。所有问题均未修改代码；当前也没有执行修复后的回归测试。
