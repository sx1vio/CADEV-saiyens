// Applique le thème avant le premier rendu (évite le flash). Préférence locale, sinon clair.
// Fichier externe plutôt que script en ligne : la Content-Security-Policy n'autorise que 'self'.
// (Modifier ce fichier renouvelle aussi le service worker, qui garde la CSP de son installation.)
try {
  var t = localStorage.getItem('dh-theme2');
  if (t !== 'light' && t !== 'dark') t = 'light';
  document.documentElement.dataset.theme = t;
} catch (e) {}
