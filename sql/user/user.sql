-- ============================================================
-- SanaTura 用户体系 DDL v2
-- 设计原则: 一张表一件事, 每个表必有 created_at + updated_at,
--           高频读取列放前面, 审计/扩展列放后面, credits 最后。
-- ============================================================

-- ── 1. user_account: 用户账户主表 ──
drop table if exists user_account;
create table user_account (
    id          bigint       not null auto_increment,
    uuid        char(36)     not null,
    email       varchar(255) not null,
    password_hash varchar(255) not null,
    nickname    varchar(100) default null               comment '昵称',
    phone_number varchar(20)  default null,
    avatar_id   bigint       default null               comment '当前头像 id → user_avatar.id',

    role        varchar(32)  default 'user'            comment '角色: user/spectator/admin/super_admin',
    status      enum('active','inactive','suspended','banned') default 'active'
                                                            comment '账号状态（与 user_account_status.status 应用层同步）',

    -- 用户协议
    agreed_terms_version varchar(20) default null       comment '用户同意的协议版本 → user_terms.version',

    -- 审计
    created_at  datetime not null default current_timestamp,
    updated_at  datetime not null default current_timestamp
                on update current_timestamp,
    deleted_at  datetime default null                   comment '软删除时间',

    -- 最后 (之后迁移至 AI 聚合表)
    credits     bigint not null default 0               comment 'AI 用量累计 (将迁移)',

    primary key (id),
    unique key uk_uuid  (uuid),
    unique key uk_email (email),
    key idx_status      (status)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='用户账户';


-- ── 2. user_account_status: 账号状态明细 ──
drop table if exists user_account_status;
create table user_account_status (
    id          bigint not null auto_increment,
    user_id     bigint not null,

    status      enum('active','inactive','suspended','banned') default 'active',
    is_permanently_banned tinyint(1) default 0,

    ban_duration_seconds int default null                comment '封禁时长 (秒)',
    ban_start_time       datetime default null           comment '封禁开始时间',
    ban_reason           varchar(500) default null       comment '封禁原因',

    created_at  datetime not null default current_timestamp,
    updated_at  datetime not null default current_timestamp
                on update current_timestamp,

    primary key (id),
    unique key uk_user_id (user_id),
    constraint fk_status_user foreign key (user_id) references user_account (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='用户账号状态明细';


-- ── 3. user_profile: 个人基础信息 ──
drop table if exists user_profile;
create table user_profile (
    id          bigint not null auto_increment,
    user_id     bigint not null,

    gender      enum('male','female','other') default null,
    birthday    date default null,
    bio         text default null,
    website     varchar(255) default null,
    location    varchar(255) default null,

    -- 健康档案列本轮暂不迁移，之后会设计独立的 user_health_profile 表

    created_at  datetime not null default current_timestamp,
    updated_at  datetime not null default current_timestamp
                on update current_timestamp,

    primary key (id),
    unique key uk_user_id (user_id),
    constraint fk_profile_user foreign key (user_id) references user_account (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='用户个人基础信息';

-- note: nickname 留在 user_account.nickname（高频读取, 省 JOIN）。
--       头像关联: user_account.avatar_id → user_avatar.id


-- ── 4. user_avatar: 像素头像 ──
drop table if exists user_avatar;
create table user_avatar (
    id          bigint not null auto_increment,
    user_id     bigint not null,

    size        int not null                            comment '尺寸: 8/16/32',
    avatar_data longtext not null                       comment '像素数据 (#RRGGBBAA 格式, 逗号分隔)',
    level       int default 1                           comment '头像等级',

    is_current  tinyint(1) default 0                    comment '是否正在使用',
    is_default  tinyint(1) default 0                    comment '是否为默认头像',
    last_used_at datetime default null                  comment '最近使用时间',

    created_at  datetime not null default current_timestamp,
    updated_at  datetime not null default current_timestamp
                on update current_timestamp,

    primary key (id),
    key idx_user_current (user_id, is_current),
    key idx_user_size   (user_id, size),
    constraint fk_avatar_user foreign key (user_id) references user_account (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='用户像素头像';


-- ── 5. user_terms: 用户协议 ──
drop table if exists user_terms;
create table user_terms (
    id          bigint not null auto_increment,
    version     varchar(20) not null                    comment '协议版本号',
    terms_text  text not null                           comment '协议全文',

    effective_from datetime default null                comment '生效时间',
    created_at     datetime not null default current_timestamp,

    primary key (id),
    unique key uk_version (version)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='用户协议';


-- ── 6. user_login_info: 登录信息 ──
drop table if exists user_login_info;
create table user_login_info (
    id          bigint not null auto_increment,
    user_id     bigint not null,

    first_login_time datetime default null,
    last_login_time  datetime default null,
    ip_address       varchar(45)  default null           comment '最近登录 IP',
    device_info      varchar(255) default null           comment '设备 UA',

    created_at  datetime not null default current_timestamp,
    updated_at  datetime not null default current_timestamp
                on update current_timestamp,

    primary key (id),
    unique key uk_user_id (user_id),
    constraint fk_login_user foreign key (user_id) references user_account (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='用户登录信息';


-- ── 7. user_settings: 偏好设置 ──
drop table if exists user_settings;
create table user_settings (
    id          bigint not null auto_increment,
    user_id     bigint not null,

    theme       varchar(20)  default 'light'             comment '主题: light/dark',
    language    varchar(10)  default 'zh-CN'             comment '语言偏好',
    notification_enabled tinyint(1) default 1            comment '是否启用通知',

    created_at  datetime not null default current_timestamp,
    updated_at  datetime not null default current_timestamp
                on update current_timestamp,

    primary key (id),
    unique key uk_user_id (user_id),
    constraint fk_settings_user foreign key (user_id) references user_account (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='用户偏好设置';


-- ── 8. refresh_tokens: JWT 刷新令牌 ──
drop table if exists refresh_tokens;
create table refresh_tokens (
    id          bigint not null auto_increment,
    user_id     bigint not null,

    token_hash  varchar(255) not null                   comment 'SHA-256 哈希',
    expires_at  datetime not null                       comment '过期时间',
    revoked_at  datetime default null                   comment '吊销时间 (NULL=有效)',

    user_agent  varchar(500) default null               comment 'User-Agent',
    ip_address  varchar(64)  default null               comment 'IP 地址',

    created_at  datetime not null default current_timestamp,
    updated_at  datetime not null default current_timestamp
                on update current_timestamp,

    primary key (id),
    unique key uk_token_hash (token_hash),
    key idx_user_id    (user_id),
    key idx_expires_at (expires_at),
    constraint fk_refresh_user foreign key (user_id) references user_account (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='JWT 刷新令牌';
