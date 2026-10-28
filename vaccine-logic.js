/* ワクチン接種：純粋ロジック（ブラウザ／Node両対応） */
(function (root) {
  'use strict';

  const STATUS_LABEL = {
    due: '接種対象', noBirth: '生年月日未登録', tooYoung: '日令不足',
    tooSoon: '間隔不足', complete: '接種完了', doneToday: '本日接種済み',
  };

  // 日付文字列 'YYYY-MM-DD' 同士の差（日）。UTCで計算して時差・夏時間の影響を避ける
  function _utc(d) {
    const [y, m, dd] = String(d).split('-').map(Number);
    return Date.UTC(y, m - 1, dd);
  }
  function ageDays(birthDate, date) {
    return Math.round((_utc(date) - _utc(birthDate)) / 86400000);
  }

  // 投与間隔（日）の配列を接種回数に合わせる（長さ = doses-1）
  function normalizeIntervals(doses, intervals, base) {
    const n = Math.max(0, (doses | 0) - 1);
    const src = Array.isArray(intervals) ? intervals : [];
    const out = [];
    for (let i = 0; i < n; i++) out.push(src[i] != null && src[i] !== '' ? Number(src[i]) : Number(base) || 0);
    return out;
  }

  // 個体 animal にワクチン vaccine を date に打つべきかを判定する
  function judge(animal, vaccine, records, date) {
    const mine = (records || []).filter(r => r.animalId === animal.id && r.vaccineId === vaccine.id);
    const before = mine.filter(r => r.date < date).sort((a, b) => a.date.localeCompare(b.date));
    const given = before.length;
    const prevDate = given ? before[given - 1].date : '';
    const sincePrev = prevDate ? ageDays(prevDate, date) : null;
    const age = animal.birthDate ? ageDays(animal.birthDate, date) : null;
    const res = status => ({ status, doseNo: given + 1, given, prevDate, sincePrev, age });

    if (!animal.birthDate) return res('noBirth');
    if (mine.some(r => r.date === date)) return res('doneToday');
    if (given >= (vaccine.doses | 0)) return res('complete');
    if (age < (Number(vaccine.startAgeDays) || 0)) return res('tooYoung');
    if (given >= 1) {
      const need = Number((vaccine.intervals || [])[given - 1]) || 0;
      if (sincePrev < need) return res('tooSoon');
    }
    return res('due');
  }

  const VaccineLogic = { STATUS_LABEL, ageDays, normalizeIntervals, judge };

  if (typeof module !== 'undefined' && module.exports) module.exports = VaccineLogic;
  else root.VaccineLogic = VaccineLogic;
})(typeof window !== 'undefined' ? window : globalThis);
