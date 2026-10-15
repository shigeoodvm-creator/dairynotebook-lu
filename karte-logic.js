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

  // 同一所見の部位リストを簡潔な表記にまとめる
  //   片側全域 → 「右肺全域」、両側全域 → 「両肺全域」
  //   前葉の前部・後部が両方 → 「右前葉（前部・後部）」
  function _lobeGroupText(keys) {
    const has = k => keys.indexOf(k) >= 0;
    const sideText = (sideName, front, back, others) => {
      const all = [front, back].concat(others.map(o => o[0]));
      if (all.every(has)) return [sideName + '肺全域'];
      const parts = [];
      if (has(front) && has(back)) parts.push(sideName + '前葉（前部・後部）');
      else if (has(front)) parts.push(sideName + '前葉前部');
      else if (has(back)) parts.push(sideName + '前葉後部');
      others.forEach(([k, label]) => { if (has(k)) parts.push(label); });
      return parts;
    };
    const right = sideText('右', 'rf_a', 'rf_p', [['r_m', '右中葉'], ['r_c', '右後葉']]);
    const left = sideText('左', 'lf_a', 'lf_p', [['l_c', '左後葉']]);
    if (right[0] === '右肺全域' && left[0] === '左肺全域') return '両肺全域';
    return right.concat(left).join('・');
  }

  function buildFindingsText(scan) {
    const score = (scan && scan.obScore != null) ? scan.obScore : '';
    const prefix = '肺エコースコア' + score + '。';
    // 所見コードごとに部位をまとめる（重症度の高い所見から記載）
    const groups = {};
    LOBE_DEFS.forEach(([side, key]) => {
      const code = (scan && scan[side] && scan[side][key]) || '';
      if (code && code !== 'A') (groups[code] = groups[code] || []).push(key);
    });
    const codes = Object.keys(groups);
    if (!codes.length) return prefix + '明らかな異常所見なし。';
    const sev = c => (SEVERITY[c] != null ? SEVERITY[c] : 0);
    codes.sort((a, b) => sev(b) - sev(a));
    const body = codes.map(c => _lobeGroupText(groups[c]) + 'に' + (FINDING_LABELS[c] || c)).join('、');
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
