/* ===================================================================
   เบอร์โทรร้าน จิ๊นโค สุพรรณบุรี
   ดึงเบอร์จาก /api/content (ช่อง "เบอร์โทรร้าน" ในหน้า /admin) แล้วแทนที่ทุกจุดที่แสดงเบอร์/ลิงก์โทรในหน้านั้นอัตโนมัติ
   ถ้ายังไม่ได้ตั้งค่าในแอดมิน หรือดึงข้อมูลไม่ได้ จะใช้เบอร์ที่เขียนไว้ใน HTML ตามเดิม
   =================================================================== */
(function () {
  var PHONE_RE = /0[2-9]\d-?\d{3}-?\d{3,4}/g;
  var PHONE_TEST = /0[2-9]\d-?\d{3}-?\d{3,4}/;
  var current = null; // { display, digits }

  function format(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.length < 8) return null;
    var display = raw.trim();
    if (digits.length === 10) display = digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
    return { display: display, digits: digits };
  }

  function apply(root) {
    if (!current) return;
    var scope = root || document.body;
    var links = scope.querySelectorAll ? scope.querySelectorAll('a[href^="tel:"]') : [];
    links.forEach(function (a) {
      var want = 'tel:' + current.digits;
      if (a.getAttribute('href') !== want) a.setAttribute('href', want);
    });
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        if (p === 'SCRIPT' || p === 'STYLE' || p === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        return PHONE_TEST.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      PHONE_RE.lastIndex = 0;
      var next = n.nodeValue.replace(PHONE_RE, current.display);
      if (next !== n.nodeValue) n.nodeValue = next;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/content', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        current = data && data.phone ? format(data.phone) : null;
        if (!current) return;
        apply();
        // เนื้อหาที่ JS สร้างทีหลัง (เช่น การ์ดรายละเอียดเมนู) ให้แทนเบอร์ด้วย
        var timer = null;
        new MutationObserver(function () {
          clearTimeout(timer);
          timer = setTimeout(function () { apply(); }, 50);
        }).observe(document.body, { childList: true, subtree: true });
      })
      .catch(function () {});
  });
})();
