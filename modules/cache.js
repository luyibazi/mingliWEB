// RecordCache - 缓存管理
(function(global) {
    function setRecords(records) { global.__cachedRecords = records; }
    function getRecords() { return global.__cachedRecords || []; }
    function setSha(sha) { global.__giteeSha = sha; }
    function getSha() { return global.__giteeSha; }
    global.RecordCache = { setRecords, getRecords, setSha, getSha };
})(window);