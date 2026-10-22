/**
 * Client half of the ZenTao bug query plugin.
 *
 * Registers:
 *  - `sidebar.panellist` : the "禅道" icon in the start panel list.
 *  - `main` (keyed)      : the ZenTao bug list / detail page.
 *  - `settings.section`  : 设置 → 禅道 (address / username / password).
 *
 * Data comes from the same-origin proxy `/zentao-plugin/*` served by the
 * Host half, so the browser holds no ZenTao credentials.
 */
window.__ModuleLoader__.load({
  id: 'dsh-zentao-bugs',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useState } = React;

    const PAGE_SIZE = 20;

    const SEVERITY = {
      1: { label: 'S1', color: '#dc2626' },
      2: { label: 'S2', color: '#ea580c' },
      3: { label: 'S3', color: '#2563eb' },
      4: { label: 'S4', color: '#6b7280' },
    };
    const STATUS = {
      active: { label: '激活', color: '#dc2626' },
      resolved: { label: '已解决', color: '#16a34a' },
      closed: { label: '已关闭', color: '#6b7280' },
    };
    const ACTION_LABEL = {
      opened: '创建', assigned: '指派', resolved: '解决', closed: '关闭',
      activated: '激活', edited: '编辑', comment: '评论', confirmed: '确认',
      assignto: '指派', started: '开始', finished: '完成', paused: '暂停',
      cancelled: '取消', mailto: '抄送', plan: '计划',
    };

    function badge(text, color) {
      return h('span', {
        style: {
          display: 'inline-block', padding: '1px 8px', borderRadius: 999,
          fontSize: 11, lineHeight: '18px', whiteSpace: 'nowrap',
          color, background: 'color-mix(in srgb, ' + color + ' 14%, transparent)',
          border: '1px solid color-mix(in srgb, ' + color + ' 35%, transparent)',
        },
      }, text);
    }

    /** ----------------------------------------------------------------
     * Start-panel icon row.
     */
    function ZenTaoIcon() {
      return h('svg', {
        viewBox: '0 0 24 24', width: 20, height: 20, 'aria-hidden': true,
        style: { display: 'block' },
      }, h('path', {
        fill: 'currentColor',
        d: 'M12 2C9.3 5.1 7.5 8.4 7.5 12c0 3.6 1.8 6.9 4.5 10 2.7-3.1 4.5-6.4 4.5-10 0-3.6-1.8-6.9-4.5-10zm0 3.4c1.7 2.4 2.7 4.5 2.7 6.6 0 2.1-1 4.2-2.7 6.6-1.7-2.4-2.7-4.5-2.7-6.6 0-2.1 1-4.2 2.7-6.6zM3.6 6.2c1 4 .4 7.6-1.6 10.9 3.8-.2 6.9-1.7 9.3-4.4-3.4.4-6 .1-7.7-6.5zm16.8 0c-1.7 6.6-4.3 6.9-7.7 6.5 2.4 2.7 5.5 4.2 9.3 4.4-2-3.3-2.6-6.9-1.6-10.9z',
      }));
    }

    /** ----------------------------------------------------------------
     * Bug list view (paged) and detail view.
     */
    function ZenTaoPanel() {
      const [view, setView] = useState('list');
      const [list, setList] = useState(null);
      const [error, setError] = useState('');
      const [page, setPage] = useState(1);
      const [detail, setDetail] = useState(null);
      const [detailLoading, setDetailLoading] = useState(false);

      const loadList = useCallback(async () => {
        setError('');
        setList(null);
        try {
          const res = await fetch('/zentao-plugin/bugs');
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || 'HTTP ' + res.status);
          setList(body);
        } catch (err) {
          setError(String((err && err.message) || err));
        }
      }, []);

      useEffect(() => { loadList(); }, [loadList]);

      const openDetail = useCallback(async (id) => {
        setView('detail');
        setDetail(null);
        setDetailLoading(true);
        setError('');
        try {
          const res = await fetch('/zentao-plugin/bug/' + id);
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || 'HTTP ' + res.status);
          setDetail(body);
        } catch (err) {
          setError(String((err && err.message) || err));
        } finally {
          setDetailLoading(false);
        }
      }, []);

      if (view === 'detail') {
        return h(DetailView, { detail, loading: detailLoading, error, onBack: () => setView('list') });
      }
      return h(ListView, { list, error, page, setPage, openDetail, onRefresh: loadList });
    }

    function ListView({ list, error, page, setPage, openDetail, onRefresh }) {
      const bugs = (list && list.bugs) || [];
      const totalPages = Math.max(1, Math.ceil(bugs.length / PAGE_SIZE));
      const current = Math.min(page, totalPages);
      const rows = bugs.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

      const th = { textAlign: 'left', padding: '6px 10px', fontSize: 12, opacity: 0.65, fontWeight: 500, borderBottom: '1px solid var(--dsw-alias-border, rgba(128,128,128,0.3))', whiteSpace: 'nowrap' };
      const td = { padding: '7px 10px', fontSize: 13, borderBottom: '1px solid var(--dsw-alias-border, rgba(128,128,128,0.18))', verticalAlign: 'top' };

      return h('div', { style: { height: '100%', overflowY: 'auto', padding: '16px 20px', boxSizing: 'border-box' } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 } },
          h('h1', { style: { fontSize: 17, fontWeight: 600, margin: 0 } }, '禅道 · 指派给我的 Bug'),
          list ? h('span', { style: { fontSize: 12, opacity: 0.55 } }, '共 ' + list.total + ' 条') : null,
          h('span', { style: { flex: 1 } }),
          h('button', {
            type: 'button', onClick: onRefresh,
            style: { all: 'unset', cursor: 'pointer', fontSize: 12, opacity: 0.7 },
          }, '刷新'),
        ),
        error ? h('div', { style: { color: '#e05666', fontSize: 13, margin: '8px 0' } }, '加载失败：' + error) : null,
        h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
          h('thead', null, h('tr', null,
            h('th', { style: th }, 'ID'),
            h('th', { style: th }, '严重程度'),
            h('th', { style: th }, '状态'),
            h('th', { style: { ...th, width: '45%' } }, '标题'),
            h('th', { style: th }, '产品'),
            h('th', { style: th }, ''),
          )),
          h('tbody', null, rows.map((b) => {
            const sev = SEVERITY[b.severity] || SEVERITY[4];
            const st = STATUS[b.status] || { label: b.status, color: '#6b7280' };
            return h('tr', { key: b.id },
              h('td', { style: { ...td, fontFamily: 'monospace', whiteSpace: 'nowrap' } }, '#' + b.id),
              h('td', { style: td }, badge(sev.label, sev.color)),
              h('td', { style: td }, badge(st.label, st.color)),
              h('td', { style: td },
                h('a', {
                  href: (list && list.webBase ? list.webBase : '') + '/bug-view-' + b.id + '.html',
                  target: '_blank', rel: 'noreferrer',
                  title: '在面板中查看详情',
                  style: { color: 'inherit', textDecoration: 'none', cursor: 'pointer' },
                  onClick: (e) => { e.preventDefault(); openDetail(b.id); },
                }, b.title),
              ),
              h('td', { style: { ...td, opacity: 0.8, whiteSpace: 'nowrap' } }, b.productName),
              h('td', { style: td },
                h('button', {
                  type: 'button',
                  title: '在系统浏览器中打开该 Bug',
                  onClick: () => window.open((list && list.webBase ? list.webBase : '') + '/bug-view-' + b.id + '.html', '_blank'),
                  style: {
                    all: 'unset', cursor: 'pointer', fontSize: 12,
                    color: 'var(--dsw-alias-link, #3b82f6)', whiteSpace: 'nowrap',
                  },
                }, '详情'),
              ),
            );
          })),
        ),
        !list && !error ? h('div', { style: { padding: '20px 0', opacity: 0.55, fontSize: 13 } }, '加载中…') : null,
        list && bugs.length === 0 ? h('div', { style: { padding: '20px 0', opacity: 0.55, fontSize: 13 } }, '没有指派给你的未关闭 Bug。') : null,
        list && totalPages > 1 ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', padding: '14px 0' } },
          h('button', {
            type: 'button', disabled: current <= 1, onClick: () => setPage(current - 1),
            style: { all: 'unset', cursor: current <= 1 ? 'default' : 'pointer', fontSize: 13, opacity: current <= 1 ? 0.35 : 0.85 },
          }, '‹ 上一页'),
          h('span', { style: { fontSize: 12, opacity: 0.65 } }, current + ' / ' + totalPages),
          h('button', {
            type: 'button', disabled: current >= totalPages, onClick: () => setPage(current + 1),
            style: { all: 'unset', cursor: current >= totalPages ? 'default' : 'pointer', fontSize: 13, opacity: current >= totalPages ? 0.35 : 0.85 },
          }, '下一页 ›'),
        ) : null,
      );
    }

    function DetailView({ detail, loading, error, onBack }) {
      if (loading) return h('div', { style: { padding: '16px 20px', fontSize: 13, opacity: 0.6 } }, '加载详情中…');
      if (error) return h('div', { style: { padding: '16px 20px' } },
        h('button', { type: 'button', onClick: onBack, style: { all: 'unset', cursor: 'pointer', fontSize: 13, opacity: 0.7 } }, '‹ 返回列表'),
        h('div', { style: { color: '#e05666', fontSize: 13, marginTop: 10 } }, '加载失败：' + error),
      );
      if (!detail) return null;
      const b = detail.bug;
      const st = STATUS[b.status] || { label: b.status, color: '#6b7280' };
      const sev = SEVERITY[b.severity] || SEVERITY[4];

      const field = (label, value) => h('div', { style: { display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.7 } },
        h('span', { style: { opacity: 0.55, flex: '0 0 84px' } }, label),
        h('span', { style: { minWidth: 0, wordBreak: 'break-word' } }, value || '—'),
      );

      return h('div', { style: { height: '100%', overflowY: 'auto', padding: '16px 20px', boxSizing: 'border-box' } },
        h('button', { type: 'button', onClick: onBack, style: { all: 'unset', cursor: 'pointer', fontSize: 13, opacity: 0.7, marginBottom: 10, display: 'block' } }, '‹ 返回列表'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 } },
          h('span', { style: { fontFamily: 'monospace', fontSize: 15, fontWeight: 600 } }, '#' + b.id),
          h('span', { style: { fontSize: 15, fontWeight: 600 } }, b.title),
          badge(st.label, st.color),
          badge(sev.label, sev.color),
          h('span', { style: { flex: 1 } }),
          h('a', {
            href: b.webUrl, target: '_blank', rel: 'noreferrer',
            onClick: (e) => { e.preventDefault(); window.open(b.webUrl, '_blank'); },
            style: { fontSize: 12, cursor: 'pointer' },
          }, '在浏览器打开 ↗'),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2px 24px', margin: '8px 0 14px' } },
          field('产品', b.productName),
          field('所属模块', b.module),
          field('类型', b.type),
          field('优先级', 'P' + b.pri),
          field('创建人', b.openedBy + (b.openedDate ? ' · ' + b.openedDate : '')),
          field('当前指派', b.assignedTo + (b.assignedDate ? ' · ' + b.assignedDate : '')),
          field('解决者', b.resolvedBy ? b.resolvedBy + (b.resolvedDate ? ' · ' + b.resolvedDate : '') + (b.resolution ? '（' + b.resolution + '）' : '') : ''),
          field('截止日期', b.deadline),
        ),
        h('div', { style: { fontSize: 13, fontWeight: 600, margin: '4px 0 6px' } }, '重现步骤'),
        h('div', {
          className: 'zentao-bugs-steps',
          style: { fontSize: 13, lineHeight: 1.65, border: '1px solid var(--dsw-alias-border, rgba(128,128,128,0.25))', borderRadius: 8, padding: '10px 12px', wordBreak: 'break-word' },
          dangerouslySetInnerHTML: { __html: b.steps || '（无）' },
        }),
        h('div', { style: { fontSize: 13, fontWeight: 600, margin: '16px 0 6px' } }, '历史记录与评论'),
        (detail.actions || []).length === 0
          ? h('div', { style: { fontSize: 13, opacity: 0.55 } }, '暂无记录。')
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, detail.actions.map((a) =>
              h('div', { key: a.id, style: { border: '1px solid var(--dsw-alias-border, rgba(128,128,128,0.2))', borderRadius: 8, padding: '8px 12px', fontSize: 13 } },
                h('div', { style: { opacity: 0.7, fontSize: 12, marginBottom: a.comment || a.history.length ? 4 : 0 } },
                  (ACTION_LABEL[a.action] || a.action) + ' · ' + a.actor + ' · ' + a.date),
                a.history.length ? h('div', { style: { fontSize: 12, opacity: 0.8, marginBottom: a.comment ? 4 : 0 } },
                  a.history.map((hi, i) => h('div', { key: i }, hi.field + '：' + hi.old + ' → ' + hi.new))) : null,
                a.comment ? h('div', {
                  className: 'zentao-bugs-steps',
                  style: { lineHeight: 1.6, wordBreak: 'break-word' },
                  dangerouslySetInnerHTML: { __html: a.comment },
                }) : null,
              )),
            ),
      );
    }

    /** ----------------------------------------------------------------
     * Settings section (设置 → 禅道).
     */
    function SettingsSection({ ctx, form }) {
      const snap = form.getSnapshot();
      const value = (snap && snap.value) || {};
      const [saved, setSaved] = useState(false);

      const inputStyle = { padding: '5px 9px', borderRadius: 6, border: '1px solid var(--dsw-alias-border, rgba(128,128,128,0.35))', background: 'transparent', color: 'inherit', minWidth: 0, flex: 1, fontSize: 13 };
      const rowStyle = { display: 'flex', gap: 10, alignItems: 'center', maxWidth: 560 };
      const labelStyle = { fontSize: 12, opacity: 0.75, flex: '0 0 96px' };

      const save = async (field, v) => {
        await form.set(field, v);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      };

      return h('div', { style: { padding: '4px 2px', maxWidth: 640, height: '100%', overflowY: 'auto', boxSizing: 'border-box' } },
        h('h2', { style: { fontSize: 16, fontWeight: 600, margin: '0 0 4px' } }, '禅道'),
        h('div', { style: { fontSize: 12, opacity: 0.65, marginBottom: 14 } },
          '配置禅道内网地址和账号。凭据保存在本机配置文件中（明文），仅用于本机向禅道发起查询。'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { style: rowStyle },
            h('label', { style: labelStyle }, '禅道地址'),
            h('input', {
              style: inputStyle, defaultValue: value.baseUrl || '',
              placeholder: 'http://zentao.example.com/zentao',
              onBlur: (e) => { if (e.target.value !== (value.baseUrl || '')) save('baseUrl', e.target.value.trim()); },
            }),
          ),
          h('div', { style: rowStyle },
            h('label', { style: labelStyle }, '用户名'),
            h('input', {
              style: inputStyle, defaultValue: value.username || '',
              onBlur: (e) => { if (e.target.value !== (value.username || '')) save('username', e.target.value.trim()); },
            }),
          ),
          h('div', { style: rowStyle },
            h('label', { style: labelStyle }, '密码'),
            h('input', {
              type: 'password', style: inputStyle, defaultValue: value.password || '',
              placeholder: '输入后点击其他位置保存',
              onBlur: (e) => { if (e.target.value !== (value.password || '')) save('password', e.target.value); },
            }),
          ),
        ),
        h('div', { style: { fontSize: 12, opacity: 0.55, marginTop: 10, height: 16 } },
          saved ? '已保存。' : '修改输入框后失焦即自动保存。'),
      );
    }

    /** ----------------------------------------------------------------
     * Registration.
     */
    return {
      inject: ['slots', 'configForms'],
      apply(ctx) {
        // 开始界面（面板列表）中的"禅道"入口。
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'zentao-bugs',
          order: 40,
          label: '禅道',
        }, ZenTaoIcon));

        // 与入口同 id 的主面板页面（列表 + 详情）。
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          id: 'zentao-bugs-main',
          key: 'zentao-bugs',
        }, ZenTaoPanel));

        // 设置界面中的"禅道"分区。
        const form = ctx.configForms.get('zentao-bugs');
        function SettingsSectionBound() {
          return h(SettingsSection, { ctx, form });
        }
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'zentao-bugs',
          order: 901,
          label: '禅道',
        }, SettingsSectionBound));
      },
    };
  },
});
