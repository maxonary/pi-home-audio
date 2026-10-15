from pathlib import Path
p=Path('/home/pi/shairport-metadata-display/app.js');s=p.read_text()
s=s.replace('// Route not found (404)', '''const metadataHealth = { started: new Date().toISOString(), bytes: 0, chunks: 0, lastReceived: null };
app.get('/diagnostics', (req, res) => res.json(metadataHealth));
// Route not found (404)''')
s=s.replace('// NB: pour la significatioin', '''pipeReader._source.on('data', chunk => {
 metadataHealth.bytes += chunk.length;
 metadataHealth.chunks++;
 metadataHealth.lastReceived = new Date().toISOString();
});
// NB: pour la significatioin''')
p.write_text(s)
