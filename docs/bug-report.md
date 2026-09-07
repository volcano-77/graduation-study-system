# 功能测试 Bug 报告

## 1. 报告范围

本报告记录当前已经实际执行的登录、注册、小组管理、成员权限和任务管理测试中发现的问题。登录注册结果见 [`test-execution-login-register.md`](./test-execution-login-register.md)，小组管理结果见 [`test-execution-groups.md`](./test-execution-groups.md)，邀请与成员权限结果见 [`test-execution-group-members.md`](./test-execution-group-members.md)，任务管理结果见 [`test-execution-tasks.md`](./test-execution-tasks.md)。未执行场景和仅通过源码推测的问题不列入本报告；没有明确需求依据的问题会标注为“业务规则缺口 / 可疑缺陷”或“需求待确认 / 权限与隐私风险候选”。

| 记录编号 | 问题标题 | 关联场景 | 问题性质 | 严重程度 | 优先级 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-LR-001 | 重复用户名或邮箱注册返回 500 | REGISTER-003、REGISTER-004 | 已确认缺陷 | 中 | P2 | 待修复 |
| BUG-LR-002 | 允许 1 位密码注册并成功登录 | REGISTER-011 | 已确认缺陷 | 高 | P1 | 待修复 |
| BUG-LR-003 | 后端缺少邮箱格式校验，可绕过前端创建非法邮箱账号 | REGISTER-010 | 已确认缺陷 | 中 | P1 | 待修复 |
| BUG-TASK-001 | 普通任务接口缺少小组成员权限校验 | TASK-006～TASK-010 | 已确认缺陷 | 高 | P0 | 待修复 |
| BUG-TASK-002 | 后端允许纯空格任务内容落库 | TASK-012 | 已确认缺陷 | 中 | P1 | 待修复 |
| BUG-TASK-003 | 普通任务接口错误状态码语义不正确 | TASK-013-B～TASK-013-E | 已确认缺陷 | 中 | P2 | 待修复 |
| BUG-TASK-004 | 非法 group_id 未提前校验并暴露数据库错误 | TASK-013-F | 已确认缺陷 | 中 | P1 | 待修复 |
| BUG-GR-001 | 系统允许创建重复名称的小组 | GROUP-003 | 业务规则缺口 / 可疑缺陷 | 低（待确认） | P3 | 待产品确认 |
| RISK-GM-001 | 非成员可读取小组成员邮箱等信息 | GROUP-PERM-001-3 | 需求待确认 / 权限与隐私风险候选 | 待确认 | 待确认 | 待需求确认 |

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

## BUG-LR-002：允许 1 位密码注册并成功登录

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 注册、登录 |
| 关联用例 | REGISTER-011 |
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
- 用例判定为 Fail。

### 影响

- 用户可以设置极弱密码，账号更容易被猜中或被他人尝试登录。
- 注册规则与个人资料页面已有的“新密码至少 4 位”前端提示不一致。

### 代码关联

注册页面只有必填校验，没有最小长度限制，见 [`src/pages/Register.jsx`](../src/pages/Register.jsx#L57)；注册接口只判断密码是否为空，没有检查长度，见 [`server/index.js`](../server/index.js#L476)。

### 测试证据

注册请求返回 201：

![BUG-LR-002：1 位密码注册返回 201](./screenshots/REGISTER-011-201.png)

同一账号随后登录返回 200 并进入学习空间：

![BUG-LR-002：1 位密码账号登录成功](./screenshots/REGISTER-011-login-200.png)

## BUG-LR-003：后端缺少邮箱格式校验，可绕过前端创建非法邮箱账号

### 基本信息

| 项目 | 内容 |
| --- | --- |
| 所属模块 | 注册接口 |
| 关联用例 | REGISTER-010 |
| 问题性质 | 已确认缺陷 |
| 严重程度 | 中 |
| 优先级 | P1 |
| 状态 | 待修复 |
| 执行环境 | Windows；前端 `http://localhost:5173`；后端端口 `3001`；本地 MySQL |

### 缺陷描述

注册页面会利用浏览器的 `type="email"` 校验阻止明显的非法邮箱提交，但直接调用注册接口时可以绕过该校验。后端接受 `invalid-email` 并创建账号；补充 SQL 查询已确认该账号真实写入 `users` 表，说明关键输入校验只存在于客户端，接口本身没有执行邮箱格式校验，并会造成非法邮箱数据落库。

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
- REGISTER-010 判定为 Fail。

### 影响

- 调用者可以绕过前端校验，把格式非法的邮箱写入用户数据。
- 接口与页面的校验规则不一致，会影响数据质量和后续依赖邮箱的功能。

### 代码关联

普通注册接口只检查用户名、邮箱和密码是否为空，随后直接写入邮箱，没有校验邮箱格式，见 [`server/index.js`](../server/index.js#L478)。本条缺陷以 REGISTER-010 的实际接口响应为确认依据，不是仅由静态分析推断。

### 测试证据

Console 中显示向注册接口提交 `invalid-email` 后，状态码为 201，响应为 `{ success: true }`：

![BUG-LR-003：后端接受非法邮箱并返回 201](./screenshots/REGISTER-010-invalid-email-201.png)

SQL 查询结果确认 `qa_bad_email_api` 的非法邮箱数据已经写入 `users` 表：

![BUG-LR-003：非法邮箱账号已确认落库](./screenshots/REGISTER-SQL-user-data-validation.png)

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

## 2. 需求待确认 / 权限与隐私风险候选

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

## 3. 问题统计

| 问题分类 | 数量 |
| --- | ---: |
| 已确认缺陷 | 7 |
| 业务规则缺口 / 可疑缺陷 | 1 |
| 需求待确认 / 权限与隐私风险候选 | 1 |
| **问题记录合计** | **9** |

7 个已确认缺陷中，高严重程度 2 个、中严重程度 5 个。另有 2 个没有明确需求依据的问题：BUG-GR-001 为小组名称规则缺口，RISK-GM-001 为成员信息权限与隐私风险候选。TASK-006～TASK-010 属于同一根因——普通任务接口没有小组成员权限校验——已合并到 BUG-TASK-001，没有按接口重复计数；TASK-013-B～E 属于相同的 HTTP 状态码语义问题，已合并到 BUG-TASK-003。所有问题均未修改代码；当前也没有执行修复后的回归测试。
