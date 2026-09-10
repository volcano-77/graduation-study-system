# 文件上传、下载与资料共享模块测试执行报告

## 1. 测试范围

本报告只记录已经手工执行并留有证据的文件模块场景，覆盖：

- 小组资料上传、列表、下载和删除；
- 中文文件名、未选择文件、零字节文件、HTML 文件和 20 MiB 大文件；
- 资料集锦搜索与“获取”链接；
- 普通成员、非成员、匿名用户和管理员的权限边界；
- `groupId`、`fileId` 参数校验；
- 数据库记录与 `server/uploads` 物理文件的一致性；
- 管理员资料列表、搜索、预览和销毁。

没有把未执行的源码风险计入实际结果。TXT 文件点击后由浏览器直接打开、管理员预览源文件、管理员销毁文件等均按当前实现记录，不在没有需求依据时判为缺陷。

## 2. 测试环境与角色

| 项目 | 实际环境 |
| --- | --- |
| 项目路径 | `D:\my-study-system` |
| 前端 | Vite 开发服务，`http://localhost:5173` |
| 后端 | Express，`http://localhost:3001` |
| 数据库 | MySQL，本地测试库 |
| 浏览器工具 | 浏览器 DevTools：Network、Console、Application |
| 文件系统校验 | `server/uploads` |
| A | `qa_user01`，user id 21，group 31 owner |
| B | `demo_user`，user id 20，group 31 member |
| C | `qa_nonmember01`，user id 26，不属于 group 31 |
| D | `admin`，user id 3，管理员 |
| 目标小组 | group 31：`qa_group01` |

公开报告不记录任何账号密码、登录 token、数据库口令或 `.env` 内容。

## 3. 测试数据

本轮只使用无隐私的专用测试文件：

| 文件 | 用途 |
| --- | --- |
| `file_test_20260908.txt` | owner 正常上传、成员下载、跨用户删除 |
| `文件测试_20260908.txt` | 中文文件名与成员上传 |
| `file_test_zero_20260908.txt` | 零字节边界 |
| `file_test_type_20260908.html` | 危险类型和静态提供方式 |
| `file_test_cross_20260908.txt` | 非成员跨组上传 |
| `file_test_spoof_20260908.txt` | 匿名身份伪造 |
| `file_test_invalid_group_20260908.txt` | 完全非法 group id 与失败回滚 |
| `file_test_prefixed_group_20260908.txt` | 带后缀 group id |
| `file_test_delete_anonymous_20260908.txt` | 匿名带后缀 file id 删除 |
| `FILE-017-large-20MB.bin` | 单文件大小限制与数据库、磁盘完整性验证 |

## 4. 实际执行结果

为保持统计互斥，FILE-004 中已经独立执行并得到不同结论的两个行为拆为 `FILE-004-A`（搜索）和 `FILE-004-B`（获取）。SQL、哈希和磁盘检查只是对应场景的证据链，不单独计数。

| 编号 | 场景 | 实际结果摘要 | 结论 | 关联问题 |
| --- | --- | --- | --- | --- |
| FILE-001 | A 正常上传 TXT | POST 返回 200；SQL id 13、size 43；物理文件存在且 size 43 | Pass | — |
| FILE-002 | B 上传中文文件名 | POST 返回 200；UI 中文无乱码，上传者为 B | Pass | — |
| FILE-003 | B 获取 A 文件并校验内容 | 静态 URL 返回 200；下载内容与源文件 SHA256 一致 | Pass | — |
| FILE-004-A | 资料集锦搜索 | 搜索 `file_test` 后只显示匹配文件 | Pass | — |
| FILE-004-B | 资料集锦获取 | 链接跳到前端 5173；返回 Vite `index.html`，不是目标 TXT | Fail | BUG-FILE-007 |
| FILE-009-A | 未选择文件提交 | UI 提示“请选择要上传的文件”；没有上传请求 | Pass | — |
| FILE-009-B | 上传零字节文件 | POST 返回 200；SQL id 15、`file_size=0` | Risk / 待确认 | RISK-FILE-001 |
| FILE-010 | 上传并访问 HTML | 上传返回 200；HTML 落库，并由公开 `/uploads` 以 `text/html` 提供 | Fail | BUG-FILE-004；影响亦关联 BUG-FILE-003 |
| FILE-008 | 未登录静态访问组内文件 | 无痕窗口直接访问 `/uploads/...` 返回 200 和正确内容 | Fail | BUG-FILE-003 |
| FILE-012 | B 删除 A 上传的文件 | UI 无删除按钮；直接 DELETE 返回 200，DB 和物理文件均被删除 | Fail | BUG-FILE-001 |
| FILE-005 | C 读取 group 31 文件列表 | 已确认 C 非成员；GET 返回 200 和 3 条文件 | Fail | BUG-FILE-001 |
| FILE-006 | C 向 group 31 上传 | POST 返回 200；SQL id 17 和物理文件均真实写入 | Fail | BUG-FILE-001 |
| FILE-013 | C 删除 B 的文件 | DELETE 返回 200；DB 记录和物理文件均被删除 | Fail | BUG-FILE-001 |
| FILE-007 | 匿名上传并伪造 uploader | 无 token；传 `uploader_id=21` 后返回 200，并归属到 A | Fail | BUG-FILE-002；认证缺失亦关联 BUG-FILE-001 |
| FILE-011-A | `groupId=abc` 上传 | API 正确返回 400，但 multer 已留下无 DB 记录的物理文件 | Fail | BUG-FILE-006 |
| FILE-011-B | `groupId=31abc` 上传 | 返回 200，并按 group 31 写入 SQL id 19 和物理文件 | Fail | BUG-FILE-005 |
| FILE-014 | 匿名用 `fileId=20abc` 删除 | 无 token；DELETE 返回 200，并删除真实 id 20 | Fail | BUG-FILE-001、BUG-FILE-005 |
| FILE-015-A | 普通用户访问管理员资料 API | GET `/api/admin/files` 返回 403 | Pass | — |
| FILE-015-B | 管理员访问资料 API | GET `/api/admin/files` 返回 200 和文件数组 | Pass | — |
| FILE-015-C | 管理员搜索资料 | 搜索后只显示目标 HTML 文件及正确小组、上传者、大小 | Pass | — |
| FILE-015-D | 管理员预览源文件 | 通过资料审查入口打开正确源文件 | Pass | 当前设计 |
| FILE-015-E | 管理员销毁资料 | DELETE 返回 200；页面、SQL 和磁盘均确认删除 | Pass | 当前设计 |
| FILE-016 | 管理员删除不存在资料 | DELETE id 999999 返回 404 和“资料不存在” | Pass | — |
| FILE-017 | 20 MiB 大文件上传限制 | POST 返回 200；UI 显示 20.00 MB；DB 与磁盘均为 20971520 bytes | Risk / 待确认 | RISK-FILE-002 |

## 5. 主要执行记录与证据

### 5.1 正常上传、中文文件名和下载一致性

FILE-001 验证 owner 上传后，页面、HTTP、数据库和磁盘四层结果一致：

![FILE-001：正常上传返回200](./screenshots/FILE-001-upload-200.png)

![FILE-001：上传记录写入数据库](./screenshots/FILE-001-upload-sql.png)

![FILE-001：物理文件存在](./screenshots/FILE-001-upload-disk.png)

FILE-002 验证普通成员可以上传中文文件名，页面没有乱码：

![FILE-002：普通成员上传中文文件名](./screenshots/FILE-002-member-chinese-upload-200.png)

FILE-003 验证 B 可以取得 A 的组内文件；静态响应内容正确，源文件与服务器文件哈希一致：

![FILE-003：成员获取文件返回200](./screenshots/FILE-003-member-download-200.png)

![FILE-003：源文件与服务器文件哈希一致](./screenshots/FILE-003-hash-match.png)

TXT 在浏览器中直接打开而非强制弹出下载，这是浏览器对响应的当前处理方式；项目没有明确要求 `Content-Disposition: attachment`，因此不判 Bug。

### 5.2 资料集锦搜索与获取

搜索行为符合预期：

![FILE-004-A：资料集锦搜索](./screenshots/FILE-004-all-files-search-ui.png)

点击“获取”却使用了当前前端 origin，最终访问 5173 的 `/uploads` 并收到 HTML 页面，而不是后端 3001 的目标文件：

![FILE-004-B：获取链接指向错误端口](./screenshots/FILE-004-all-files-download-wrong-port.png)

### 5.3 未选择文件和零字节边界

未选择文件时，前端阻止提交，没有产生上传请求：

![FILE-009-A：未选择文件提示](./screenshots/FILE-009-empty-file-ui.png)

零字节文件被接受且真实落库。由于当前没有明确业务规则禁止空文件，本次只记录为需求待确认：

![FILE-009-B：零字节上传返回200](./screenshots/FILE-009-zero-byte-upload-200.png)

![FILE-009-B：零字节记录落库](./screenshots/FILE-009-zero-byte-sql.png)

### 5.4 文件类型和公开静态资源

无害 HTML 测试文件可上传、落库，并以 `text/html` 从公开静态目录提供：

![FILE-010：HTML上传成功](./screenshots/FILE-010-dangerous-type-upload.png)

![FILE-010：HTML文件写入数据库](./screenshots/FILE-010-dangerous-type-sql.png)

![FILE-010：HTML通过静态URL渲染](./screenshots/FILE-010-dangerous-type-static.png)

在未登录无痕窗口中，直接访问一个已知 `/uploads` URL 也能获得组内文件内容：

![FILE-008：未登录静态访问返回200](./screenshots/FILE-008-anonymous-static-download.png)

### 5.5 普通成员、非成员和匿名访问权限

B 查看 A 的文件时，UI 不显示删除按钮；但直接请求普通删除 API 成功：

![FILE-012：普通成员看不到他人文件删除按钮](./screenshots/FILE-012-member-no-delete-button-ui.png)

![FILE-012：普通成员直接删除他人文件返回200](./screenshots/FILE-012-member-delete-other-api.png)

![FILE-012：数据库记录已删除](./screenshots/FILE-012-member-delete-other-sql.png)

![FILE-012：物理文件已删除](./screenshots/FILE-012-member-delete-other-disk.png)

![FILE-012：原静态URL不可访问](./screenshots/FILE-012-member-delete-other-url.png)

测试前已通过 SQL 确认 C 不属于 group 31：

![权限预检查：C不是group31成员](./screenshots/FILE-PRECHECK-nonmember-sql.png)

C 仍能读取文件列表：

![FILE-005：非成员读取文件列表返回200](./screenshots/FILE-005-nonmember-list-api.png)

C 还能上传文件，数据库和磁盘均发生写入：

![FILE-006：非成员上传返回200](./screenshots/FILE-006-nonmember-upload-api.png)

![FILE-006：非成员上传记录落库](./screenshots/FILE-006-nonmember-upload-sql.png)

![FILE-006：非成员上传物理文件存在](./screenshots/FILE-006-nonmember-upload-disk.png)

C 可直接删除 B 的文件：

![FILE-013：非成员删除成员文件返回200](./screenshots/FILE-013-nonmember-delete-api.png)

![FILE-013：被删记录从数据库消失](./screenshots/FILE-013-nonmember-delete-sql.png)

![FILE-013：被删物理文件消失](./screenshots/FILE-013-nonmember-delete-disk.png)

匿名用户没有 token 时也能上传，并通过请求体把上传者伪造成 A：

![FILE-007：匿名伪造上传者并上传](./screenshots/FILE-007-anonymous-spoof-upload.png)

![FILE-007：伪造归属写入数据库](./screenshots/FILE-007-spoof-sql.png)

![FILE-007：伪造上传物理文件存在](./screenshots/FILE-007-spoof-disk.png)

### 5.6 ID 格式和失败回滚

`groupId=abc` 时接口返回 400，但上传中间件已经写入文件，形成孤儿文件：

![FILE-011-A：非法group id返回400](./screenshots/FILE-011-invalid-group-api.png)

![FILE-011-A：失败请求留下孤儿物理文件](./screenshots/FILE-011-invalid-group-orphan.png)

`groupId=31abc` 被宽松解析为 31，接口、数据库和磁盘均显示上传成功：

![FILE-011-B：带后缀group id上传返回200](./screenshots/FILE-011-prefixed-group-api.png)

![FILE-011-B：记录实际写入group31](./screenshots/FILE-011-prefixed-group-sql.png)

![FILE-011-B：物理文件真实存在](./screenshots/FILE-011-prefixed-group-disk.png)

FILE-014 先正常建立 id 20 的删除目标，再由匿名用户用 `20abc` 命中该记录并删除：

![FILE-014：建立匿名删除目标](./screenshots/FILE-014-setup-upload-200.png)

![FILE-014：匿名带后缀file id删除返回200](./screenshots/FILE-014-anonymous-prefixed-delete-api.png)

![FILE-014：数据库记录被删除](./screenshots/FILE-014-anonymous-prefixed-delete-sql.png)

![FILE-014：物理文件被删除](./screenshots/FILE-014-anonymous-prefixed-delete-disk.png)

### 5.7 管理员资料审查

普通用户访问管理员资料接口被正确拒绝：

![FILE-015-A：普通用户访问管理员资料接口返回403](./screenshots/FILE-015-user-admin-files-forbidden-403.png)

管理员能够获取资料列表、搜索并预览目标文件：

![FILE-015-B：管理员资料接口返回200](./screenshots/FILE-015-admin-files-200.png)

![FILE-015-C：管理员搜索资料](./screenshots/FILE-015-admin-file-search-ui.png)

![FILE-015-D：管理员预览源文件](./screenshots/FILE-015-admin-preview-source.png)

管理员销毁目标后，接口、数据库和物理目录结果一致：

![FILE-015-E：管理员销毁资料返回200](./screenshots/FILE-015-admin-destroy-file-200.png)

![FILE-015-E：管理员销毁后数据库无记录](./screenshots/FILE-015-admin-destroy-file-sql.png)

![FILE-015-E：管理员销毁后物理文件不存在](./screenshots/FILE-015-admin-destroy-file-disk.png)

删除不存在的资料返回 404：

![FILE-016：管理员删除不存在资料返回404](./screenshots/FILE-016-admin-delete-missing-404.png)

### 5.8 大文件上传限制与清理

FILE-017 使用 PowerShell 生成无隐私的 `FILE-017-large-20MB.bin`，源文件长度为 20971520 bytes（20 MiB）。A 将其上传到 group 31 后：

- `POST /api/groups/31/files` 返回 200；
- 页面显示文件大小为 20.00 MB；
- `group_files` 新增 id 22，`group_id=31`、`uploader_id=21`、`file_name=FILE-017-large-20MB.bin`、`file_size=20971520`；
- `server/uploads` 中对应物理文件长度同为 20971520 bytes。

当前 Multer 仅配置 `multer({ storage })`，没有 `limits.fileSize` 或等价单文件大小限制；`express.json({ limit: '50mb' })` 不适用于本次 `multipart/form-data` 文件上传。由于项目需求未定义最大文件大小，FILE-017 判定为 **Risk / 待确认**，不计入 Fail 或已确认缺陷。

![FILE-017：20 MiB源文件大小](./screenshots/FILE-017-large-file-source-20mb.png)

![FILE-017：大文件上传返回200并显示20.00 MB](./screenshots/FILE-017-large-file-upload-200.png)

![FILE-017：大文件数据库记录完整](./screenshots/FILE-017-large-file-sql.png)

![FILE-017：物理文件长度为20971520 bytes](./screenshots/FILE-017-large-file-disk.png)

收尾时通过正常 UI 删除该测试文件，`DELETE /api/groups/31/files/22` 返回 200。最终 SQL 查询 id 22 为 0 行，`server/uploads` 中也没有对应物理文件。

![FILE-017：通过页面删除大文件成功](./screenshots/FILE-017-large-file-delete-ui.png)

![FILE-017：删除后数据库无id 22](./screenshots/FILE-017-large-file-delete-sql.png)

![FILE-017：删除后物理文件不存在](./screenshots/FILE-017-large-file-delete-disk.png)

## 6. 数据库与文件系统一致性

- FILE-001、FILE-006、FILE-007、FILE-009-B、FILE-010 和 FILE-011-B 均使用 SQL 或磁盘证据确认上传不是只改变页面状态。
- FILE-012、FILE-013、FILE-014 和 FILE-015-E 均确认正常/越权删除会同时删除数据库记录和物理文件。
- FILE-011-A 确认失败请求可能只写磁盘、不写数据库，形成孤儿文件。
- 收尾前只读确认 `group_files` 中仍存在 id 15、17、18、19，并记录了各自 `file_url`。
- 收尾时只删除上述 4 条专用测试记录及其 4 个物理文件；另单独删除 FILE-011-A 的孤儿物理文件。
- 收尾后再次查询 id 13～20，结果为 0 行；5 个明确清理目标均不再存在于 `server/uploads`。
- id 13、14、16、20 已在对应正式测试中删除，本次没有重复删除；没有删除测试前已有资料、旧 SQL、未知文件或其他小组资料。
- FILE-017 上传时数据库与磁盘均记录 20971520 bytes；删除后 id 22 和对应物理文件均不存在，测试数据已彻底清理。

## 7. 缺陷与风险归类

本轮按根因记录 7 个已确认缺陷：

| 问题编号 | 根因摘要 | 覆盖场景 |
| --- | --- | --- |
| BUG-FILE-001 | 普通文件 REST API 缺少认证、成员和资源所有权授权 | FILE-005、FILE-006、FILE-012、FILE-013、FILE-014 |
| BUG-FILE-002 | 上传接口信任客户端 `uploader_id`，可伪造归属 | FILE-007 |
| BUG-FILE-003 | `/uploads` 静态资源缺少认证和小组授权 | FILE-008；FILE-010 增强影响 |
| BUG-FILE-004 | 缺少文件类型和 MIME 安全校验 | FILE-010 |
| BUG-FILE-005 | `groupId` / `fileId` 使用宽松整数解析 | FILE-011-B、FILE-014 |
| BUG-FILE-006 | 上传失败后没有清理已落盘文件 | FILE-011-A |
| BUG-FILE-007 | 资料集锦“获取”链接使用错误 origin | FILE-004-B |

FILE-009-B 单独记录为 RISK-FILE-001：零字节文件可上传并落库。是否禁止零字节文件属于需求待确认，不计 Fail，也不计已确认缺陷。

FILE-017 单独记录为 RISK-FILE-002：当前未配置单文件大小限制，20 MiB 文件可完整写入数据库和磁盘。需求未定义最大文件大小，因此暂不判定为功能缺陷；但该行为存在磁盘空间耗尽、服务资源占用和拒绝服务风险。

## 8. 测试统计

### 8.1 文件模块

| 状态 | 数量 | 占比 |
| --- | ---: | ---: |
| 实际执行场景 | 24 | 100% |
| Pass | 11 | 45.8% |
| Fail | 11 | 45.8% |
| Risk / 待确认 | 2 | 8.3% |

通过率按 `Pass / 实际执行场景` 计算：`11 / 24 = 45.8%`。

### 8.2 项目累计

| 测试报告 | 实际执行场景 | Pass | Fail | 需求待确认 / 风险候选 |
| --- | ---: | ---: | ---: | ---: |
| 登录注册 | 11 | 7 | 4 | 0 |
| 小组管理第一批 | 4 | 3 | 0 | 1 |
| 小组邀请与成员权限 | 8 | 7 | 0 | 1 |
| 任务管理 | 21 | 10 | 11 | 0 |
| 讨论与实时消息 | 13 | 8 | 5 | 0 |
| 文件上传、下载与资料共享 | 24 | 11 | 11 | 2 |
| 讨论区 `@` 提及补充 | 6 | 2 | 1 | 3 |
| 通知模块 | 10 | 8 | 1 | 1 |
| Dashboard 数据联动 | 9 | 9 | 0 | 0 |
| **累计** | **106** | **65** | **33** | **8** |

截至 Dashboard 与 FILE-017 补测完成，项目累计有18个已确认缺陷、1个业务规则缺口 / 可疑缺陷、7个需求待确认 / 风险候选，共26条问题记录。Dashboard 详情见 [`test-execution-dashboard.md`](./test-execution-dashboard.md)。

## 9. 本轮结论

本轮已用 24 个互斥的实际场景覆盖文件模块的核心业务、角色权限、匿名访问、输入格式、危险类型、大文件边界、静态资源和 DB/磁盘一致性。正常上传、中文文件名、内容一致性和管理员审查主流程可用；主要风险集中在普通文件 REST API 无授权、公开静态目录、上传者身份由客户端决定、文件类型与大小未限制、ID 宽松解析以及失败上传不回滚。

本轮没有修改或修复业务代码。所有 Fail 仍待开发修复和后续回归测试；零字节与单文件大小上限继续等待需求确认。
