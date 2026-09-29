/* カルテ転記支援：純粋ロジック（ブラウザ／Node両対応） */
(function (root) {
  'use strict';

  const DEFAULT_DRUG_MASTER = [
    { id: 'd_florgan',     name: 'フロルガン',       code: '1557' },
    { id: 'd_otc',         name: 'OTC',              code: '1063' },
    { id: 'd_florfenicol', name: 'フロルフェニコール', code: '8554' },
    { id: 'd_draxxin',     name: 'ドラクシン',       code: '1392' },
  ];

  const DEFAULT_PROC_MASTER = [
    { id: 'p_echo',    name: '超音波検査', code: '0300' },
    { id: 'p_culture', name: '細菌培養',   code: '0164' },
    { id: 'p_pcr',     name: 'PCR検査',    code: '0197' },
    { id: 'p_im',      name: '筋肉注射',   code: '0370' },
    { id: 'p_sc',      name: '皮下注射',   code: '' },
  ];

  // [side, key, 表示ラベル]（解剖学的順）
  const LOBE_DEFS = [
    ['right', 'rf_a', '右前葉前部'],
    ['right', 'rf_p', '右前葉後部'],
    ['right', 'r_m',  '右中葉'],
    ['right', 'r_c',  '右後葉'],
    ['left',  'lf_a', '左前葉前部'],
    ['left',  'lf_p', '左前葉後部'],
    ['left',  'l_c',  '左後葉'],
  ];

  const FINDING_LABELS = {
    'A': '正常', 'L': '線状Bライン', 'B': 'コメットテール',
    'S': '小コンソリデーション', 'C': '局所コンソリデーション',
    'D': 'びまん性コンソリデーション', 'H': '肝変化', 'E': '胸水', 'P': '膿瘍',
  };

  const SEVERITY = { P: 8, E: 7, D: 6, C: 5, S: 4, H: 3, B: 2, L: 1, A: 0, '': -1 };

  function buildFindingsText(scan) {
    const score = (scan && scan.obScore != null) ? scan.obScore : '';
    const prefix = '肺エコースコア' + score + '。';
    const abn = [];
    LOBE_DEFS.forEach(([side, key, label], idx) => {
      const code = (scan && scan[side] && scan[side][key]) || '';
      if (code && code !== 'A') {
        abn.push({ label, code, sev: SEVERITY[code] != null ? SEVERITY[code] : 0, idx });
      }
    });
    if (!abn.length) return prefix + '明らかな異常所見なし。';
    abn.sort((a, b) => (b.sev - a.sev) || (a.idx - b.idx));
    const body = abn.map(a => a.label + 'に' + (FINDING_LABELS[a.code] || a.code)).join('、');
    return prefix + body + 'を認める。';
  }

  function _codeById(master, id) {
    const m = (master || []).find(x => x.id === id);
    return m ? m.code : '';
  }
  function _tempStr(v) {
    return (v === 0 || v) ? String(v) : '';
  }

  function buildKarteRows(scan, opts) {
    opts = opts || {};
    const procMaster = opts.procMaster || DEFAULT_PROC_MASTER;
    const drugMaster = opts.drugMaster || DEFAULT_DRUG_MASTER;
    const date = (scan && scan.scanDate) || '';
    const rows = [];

    rows.push({
      kind: 'echo', date, temp: _tempStr(scan && scan.bodyTemp),
      findings: buildFindingsText(scan),
      procCode: _codeById(procMaster, 'p_echo'), drugCode: '', qty: '',
    });

    if (scan && scan.procedures && scan.procedures.swab) {
      rows.push({ kind: 'culture', date, temp: '', findings: '',
        procCode: _codeById(procMaster, 'p_culture'), drugCode: '', qty: '' });
      rows.push({ kind: 'pcr', date, temp: '', findings: '',
        procCode: _codeById(procMaster, 'p_pcr'), drugCode: '', qty: '' });
    }

    ((scan && scan.drugItems) || []).forEach(item => {
      if (!item || !item.drugId) return;
      const procId = item.procId || 'p_im';
      rows.push({ kind: 'drug', date, temp: '', findings: '',
        procCode: _codeById(procMaster, procId),
        drugCode: _codeById(drugMaster, item.drugId),
        qty: (item.qty === 0 || item.qty) ? String(item.qty) : '' });
    });

    return rows;
  }

  const KarteLogic = {
    DEFAULT_DRUG_MASTER, DEFAULT_PROC_MASTER, LOBE_DEFS, FINDING_LABELS,
    buildFindingsText, buildKarteRows,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = KarteLogic;
  else root.KarteLogic = KarteLogic;
})(typeof window !== 'undefined' ? window : globalThis);
