from pathlib import Path
root=Path('/home/pi/shairport-metadata-display/public')
p=root/'js/main.js';s=p.read_text().replace('displayModal("noInfo");','// Idle is a normal state; no blocking dialog.');p.write_text(s)
p=root/'index.html';s=p.read_text().replace('<body class="idle">','<body class="idle">\n  <div id="idle-screen"><div class="note">♫</div><h1>Bedroom</h1><p>Ready for AirPlay</p><small>Play music to Bedroom to see artwork and track details.</small></div>');p.write_text(s)
p=root/'css/main.css';s=p.read_text();s+='''
/* TV-friendly idle state and clean music typography. */
#idle-screen{display:none;position:fixed;inset:0;background:radial-gradient(ellipse at 30% 15%,#36283e,#111116 70%);color:#fff;align-items:center;justify-content:center;flex-direction:column;font-family:Arial,Helvetica,sans-serif;text-align:center;z-index:2}
body.idle #idle-screen{display:flex}body.idle main{visibility:hidden}
#idle-screen .note{font-size:80px;color:#fa5a78;margin-bottom:25px}
#idle-screen h1{font-size:48px;letter-spacing:-1.5px;margin-bottom:12px}
#idle-screen p{font-size:25px;color:#ffffffa0;margin-bottom:25px}
#idle-screen small{font-size:16px;color:#ffffff65}
#title,#artist,#album{font-family:Arial,Helvetica,sans-serif}
''';p.write_text(s)
p=root/'js/config.js';s=p.read_text().replace('Alerte','Connection interrupted').replace('Pas de connexion avec le serveur.<br>Peut-être est-il dans les choux ?','Reconnecting to the music display…').replace("Pas de connexion à internet ! Vérifiez cela, et rechargez la page ensuite.",'The display connection is unavailable.');p.write_text(s)
