/* The "Success! We have reserved your time..." page shown after someone books a tour.
 * Shannon 2026-10-25: "I want it exactly like it is worded here. Same font. It needs to be in
 * the top frame - people won't scroll." (page.theswitchsystem.com/tourbooked: same words,
 * Roboto Slab headings, Lato text, flag header, video at the top). No photo.
 *
 * One file builds the whole page into <div id="tbk"></div>, so the same page runs here
 * (tour-booked/index.html) and on a GHL page with one line of custom code:
 *   <div id="tbk"></div><script src="https://scan.ismyhometoxic.com/tour-booked/embed.js"></script>
 * On a GHL page the div can carry GHL's own appointment fields, used when GHL fills them in:
 *   data-g="{{appointment.add_to_google_calendar}}" data-i="{{appointment.add_to_ical_outlook}}"
 *   data-t="{{appointment.start_time}}"
 */
(function () {
  var VIDEO = "https://assets.cdn.filesafe.space/pkNKuHS8wz0aQmZKEXHr/media/693100390b0f9d68df7bc5e0.mov";
  var me = document.currentScript && document.currentScript.src;
  var BASE = me ? me.replace(/[^\/]*$/, "") : "https://scan.ismyhometoxic.com/tour-booked/";

  var root = document.getElementById("tbk");
  if (!root) { root = document.createElement("div"); root.id = "tbk"; document.body.appendChild(root); }

  if (!document.getElementById("tbk-fonts")) {
    var f = document.createElement("link");
    f.id = "tbk-fonts"; f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Roboto+Slab:wght@400;700&display=swap";
    document.head.appendChild(f);
  }

  var css =
    "html,body{overflow-x:hidden}" +
    "#tbk{font-family:Lato,Arial,sans-serif;color:#000;-webkit-font-smoothing:antialiased}" +
    "#tbk *{box-sizing:border-box}" +
    "#tbk p{margin:0}" +
    "#tbk .hero{position:relative;background:#222;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);padding:25px 20px 22px;overflow:hidden}" +
    "#tbk .hero:before{content:'';position:absolute;inset:0;background:url(" + BASE + "flag.webp) center/cover no-repeat;opacity:.3}" +
    "#tbk .hero>*{position:relative}" +
    "#tbk h1{margin:0;padding:0 0 5px;font:700 40px/1.3 'Roboto Slab',Georgia,serif;color:#fff;text-align:center;text-wrap:balance}" +
    "#tbk .sub{margin-top:10px;font:400 23px/1.3 'Roboto Slab',Georgia,serif;color:#fff;text-align:center;text-wrap:balance}" +
    "#tbk .wrap{max-width:1170px;margin:0 auto;padding:0}" +
    "#tbk .two{display:flex;gap:0;padding:25px 0 20px}" +
    "#tbk .left{flex:0 0 58.33%;padding:10px 20px}" +
    "#tbk .right{flex:0 0 41.67%;padding:10px 20px}" +
    "#tbk .vid{background:#fff;padding:10px;box-shadow:0 0 10px rgba(0,0,0,.4)}" +
    "#tbk .vid video{display:block;width:100%;aspect-ratio:16/9;background:#000;object-fit:contain}" +
    "#tbk .thanks{margin-top:30px;font-size:20px;line-height:1.3;font-weight:700;text-align:center}" +
    "#tbk .nexth{display:none;margin:0 0 10px;font-size:23px;line-height:1.3;text-align:center}" +
    "#tbk .step{font-size:18px;line-height:1.3;margin:0 0 20px;text-align:left}" +
    "#tbk .step b{font-weight:700}" +
    "#tbk .step u{text-underline-offset:2px}" +
    "#tbk hr{width:75%;margin:20px auto 30px;border:0;border-top:3px solid #cfd8e0}" +
    "#tbk .linksh{margin:0 20px;font:400 28px/1.3 'Roboto Slab',Georgia,serif;text-align:center;text-wrap:balance}" +
    "#tbk .when{min-height:41px;margin:6px 20px 0;font:700 20px/1.3 'Roboto Slab',Georgia,serif;text-align:center}" +
    "#tbk .btns{display:flex;padding:40px 0 10px}" +
    "#tbk .btns>div{flex:1 1 50%;padding:10px 20px;text-align:center}" +
    "#tbk a.btn{display:inline-block;background:#0d62e8;color:#fff;font:700 20px/1.2 Lato,Arial,sans-serif;padding:15px 20px;border:1px solid rgba(0,0,0,.2);border-radius:5px;text-decoration:none;box-shadow:0 1px 5px rgba(0,0,0,.3)}" +
    "#tbk a.btn:hover{filter:brightness(1.08)}" +
    "#tbk a.btn:focus-visible{outline:3px solid #000;outline-offset:3px}" +
    "#tbk .calnote{margin:6px 20px 0;font-size:18px;line-height:1.3;text-align:center;font-weight:700}" +
    "#tbk .foot{padding:70px 20px 40px;font-size:14px;line-height:1.3;text-align:center}" +
    "#tbk [hidden]{display:none!important}" +
    "@media(max-width:767px){" +
    "#tbk .hero{padding:25px 10px 26px}" +
    "#tbk h1{font-size:30px}" +
    "#tbk .sub{font-size:20px}" +
    "#tbk .two{display:block;padding:29px 0 10px}" +
    "#tbk .left,#tbk .right{padding:0 10px}" +
    "#tbk .thanks{margin:30px 0 20px}" +
    "#tbk .nexth{display:block}" +
    "#tbk .linksh{font-size:24px;margin:0 10px}" +
    "#tbk .btns{display:block;padding:30px 0 0}" +
    "#tbk .btns>div{padding:10px}" +
    "}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  root.innerHTML =
    '<div class="hero">' +
      '<h1>Success! We have reserved your time...</h1>' +
      '<p class="sub">Now that you\'ve booked a time to learn how to Switch Away, here are some details about your call:</p>' +
    '</div>' +
    '<div class="wrap">' +
      '<div class="two">' +
        '<div class="left">' +
          '<div class="vid"><video id="tbkVideo" controls playsinline preload="metadata" poster="' + BASE + 'poster.webp">' +
            '<source src="' + VIDEO + '" type="video/mp4"></video></div>' +
          '<p class="thanks">We appreciate you booking a time and look forward to helping you make the switch like so many others are each day.</p>' +
        '</div>' +
        '<div class="right">' +
          '<p class="nexth">Next Steps...</p>' +
          '<p class="step"><b>#1 - <u>Show up</u>:</b> Simple right? I know it\'s not you, but you wouldn\'t believe the people that book a tour and just simply don\'t show up. Don\'t answer, don\'t respond, nothing. A regular person, just like you, will arrange their schedule, their family time, dinner, lunch, whatever it may be, to be there, so I just ask that you respect that and be there too. Thanks!</p>' +
          '<p class="step"><b>#2 - <u>Add it to your Calendar (Links Below) or set a Reminder on your phone</u>:</b> If you use a calendar, there are some links below that will add to your calendar with one click. If you don\'t use an online calendar, make a reminder on your phone or paper calendar so you don\'t miss it.</p>' +
          '<p class="step"><b>#3 - <u>Have a 2nd Device</u>:</b> If possible, have a 2nd device handy, like a computer, laptop, iPad, etc, so we can show you some stuff while we talk. (Just a phone will work, but it\'s much easier with a 2nd device)</p>' +
          '<p class="step"><b>#4 - <u>Stay in touch</u>:</b> Whoever will be calling you will text and email you shortly so you\'ll have their contact info so if anything comes up (I know life happens), I ask that you let them know ahead of time so you can reschedule for another time.</p>' +
        '</div>' +
      '</div>' +
      '<hr>' +
      '<p class="linksh">Here are the links to add to your calendar...</p>' +
      '<p class="when" id="tbkWhen"></p>' +
      '<div class="btns">' +
        '<div><a class="btn" id="tbkG" href="#" target="_blank" rel="noopener">Add to Google Calendar</a></div>' +
        '<div><a class="btn" id="tbkI" href="#" download="switch-to-america-tour.ics">Add to Outlook / iCal</a></div>' +
      '</div>' +
      '<p class="calnote" id="tbkNote" hidden>Your day and time are in the text and email we just sent you. Add it to your calendar from there.</p>' +
      '<p class="foot">Copyright ' + new Date().getFullYear() + ' - SwitchToAmerica.com</p>' +
    '</div>';

  // ---- calendar buttons ------------------------------------------------------------------
  // 1) GHL's own links, when this runs on a GHL page and GHL filled in the fields.
  // 2) Otherwise built from a start time in the address (?start_time=...&timezone=...).
  // 3) Otherwise a tap says where the time is (their confirmation text and email).
  var q = new URLSearchParams(location.search);
  function get() { for (var i = 0; i < arguments.length; i++) { var v = q.get(arguments[i]); if (v) return v.trim(); } return ""; }
  function filled(v) { return v && v.indexOf("{{") < 0 ? v.trim() : ""; }
  var g = document.getElementById("tbkG"), ic = document.getElementById("tbkI");
  var ghlG = filled(root.getAttribute("data-g")), ghlI = filled(root.getAttribute("data-i"));
  var ghlT = filled(root.getAttribute("data-t"));
  var ready = false;

  var raw = get("start_time", "appointment_start_time", "startTime", "start", "time", "selected_slot");
  var start = raw ? new Date(/^\d{10,13}$/.test(raw) ? Number(raw.length === 10 ? raw + "000" : raw) : raw) : null;
  if (start && isNaN(start.getTime())) start = null;
  var tz = get("timezone", "time_zone", "tz");

  if (/^https?:\/\//.test(ghlG) && /^(https?:|data:|webcal:)/.test(ghlI)) {
    g.href = ghlG; ic.href = ghlI; ic.removeAttribute("download"); ic.target = "_blank";
    ready = true;
  } else if (start) {
    var mins = parseInt(get("duration", "length"), 10) || 30;
    var end = new Date(start.getTime() + mins * 60000);
    var title = "Switch to America home tour";
    var details = "Have a 2nd device handy, like a computer, laptop or iPad, so we can show you some stuff while we talk.";
    var fmt = function (d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
    g.href = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(title) +
      "&dates=" + fmt(start) + "/" + fmt(end) + "&details=" + encodeURIComponent(details);
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Switch to America//Tour//EN", "BEGIN:VEVENT",
      "UID:" + fmt(start) + "-tour@switchtoamerica.com", "DTSTAMP:" + fmt(new Date()), "DTSTART:" + fmt(start), "DTEND:" + fmt(end),
      "SUMMARY:" + title, "DESCRIPTION:" + details,
      "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:" + title, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    ic.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    ready = true;
  }

  // The time under "Here are the links...", where the original page shows it.
  var when = "";
  if (start) {
    var opts = { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" };
    try { if (tz) opts.timeZone = tz; when = start.toLocaleString("en-US", opts); }
    catch (e) { delete opts.timeZone; when = start.toLocaleString("en-US", opts); }
  } else if (ghlT) {
    when = ghlT;
  }
  document.getElementById("tbkWhen").textContent = when;

  if (!ready) {
    var note = document.getElementById("tbkNote");
    var tell = function (ev) { ev.preventDefault(); note.hidden = false; };
    g.removeAttribute("target"); ic.removeAttribute("download");
    g.addEventListener("click", tell); ic.addEventListener("click", tell);
  }
})();
