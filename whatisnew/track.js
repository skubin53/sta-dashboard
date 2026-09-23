/* What's New click tracker - interaction-gated.
   Loads the What's New content, and fires the "clicked" alert ONLY on a real
   human interaction (scroll / tap / pointer / mouse move / key / click).
   SMS link previews and GHL send-time unfurls LOAD the page but never interact,
   so they no longer register a false click. Edit this file (not the GHL page)
   to change tracking behavior in future. */
(function () {
  // 1) Load the What's New content into #lu
  try {
    var lu = document.getElementById("lu");
    if (lu) {
      fetch("https://scan.ismyhometoxic.com/whatisnew/embed.html")
        .then(function (r) { return r.text(); })
        .then(function (h) { lu.innerHTML = h; })
        .catch(function () {});
    }
  } catch (e) {}

  // 2) Fire the click beacon only on genuine human interaction
  try {
    var p = new URLSearchParams(location.search);
    var c = p.get("c") || p.get("contact_id") || "";
    if (/^[A-Za-z0-9]{15,30}$/.test(c)) {
      var done = false;
      var fire = function () {
        if (done) return;
        done = true;
        var u = "https://whatisnew.ismyhometoxic.com/wnew-hit?c=" + c;
        try {
          if (!navigator.sendBeacon || !navigator.sendBeacon(u)) {
            fetch(u, { method: "POST", mode: "no-cors", keepalive: true });
          }
        } catch (e) {}
      };
      ["scroll", "pointerdown", "touchstart", "mousemove", "keydown", "click"].forEach(function (ev) {
        window.addEventListener(ev, fire, { once: true, passive: true });
      });
    }
  } catch (e) {}
})();
