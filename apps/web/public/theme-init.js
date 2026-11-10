// Applique le thème avant le premier rendu (évite le flash). Préférence locale, sinon clair.
// Fichier externe plutôt que script en ligne : la Content-Security-Policy n'autorise que 'self'.
try {
  var t = localStorage.getItem('dh-theme2');
  if (t !== 'light' && t !== 'dark') t = 'light';
  document.documentElement.dataset.theme = t;
} catch (e) {}
